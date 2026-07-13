import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

interface PresentTokenPayload {
  sid: string;
  purpose: 'present';
}

/**
 * Authenticated route: verify the teacher owns the session, then issue a
 * short-lived token scoped to that single session so it can be presented via a
 * plain browser navigation (which cannot send the Authorization header).
 */
export const getPresentToken = async (req: AuthRequest, res: Response): Promise<void> => {
  const sessionId = String(req.params.id);
  const owned = await prisma.session.findFirst({
    where: { id: sessionId, course: { teacherId: req.userId } },
    select: { id: true },
  });
  if (!owned) {
    res.status(404).json({ message: 'Seance non trouvee' });
    return;
  }
  const token = jwt.sign(
    { sid: sessionId, purpose: 'present' } satisfies PresentTokenPayload,
    process.env.JWT_SECRET!,
    { expiresIn: '2h' },
  );
  res.json({ token });
};

function verifyPresentToken(rawToken: unknown, sessionId: string): boolean {
  if (typeof rawToken !== 'string' || !rawToken) return false;
  try {
    const payload = jwt.verify(rawToken, process.env.JWT_SECRET!) as Partial<PresentTokenPayload>;
    return payload.purpose === 'present' && payload.sid === sessionId;
  } catch {
    return false;
  }
}

/**
 * Reject unsafe URL schemes (javascript:, data:, vbscript:, …) to prevent
 * stored XSS from block content. Allows http(s), mailto, protocol-relative,
 * absolute paths and fragments; everything else becomes empty.
 */
function safeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  try {
    const parsed = new URL(value, 'https://placeholder.invalid');
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return value;
    }
    return '';
  } catch {
    return '';
  }
}

const ALLOWED_THEMES = ['white', 'black', 'moon', 'sky', 'league', 'beige'] as const;
const ALLOWED_TRANSITIONS = ['slide', 'fade', 'zoom', 'none'] as const;
const ALLOWED_SPEEDS = ['default', 'fast', 'slow'] as const;
const ALLOWED_FONTS = ['inter', 'montserrat', 'roboto', 'lato', 'merriweather'] as const;
type PresentTheme = typeof ALLOWED_THEMES[number];
type PresentTransition = typeof ALLOWED_TRANSITIONS[number];
type PresentSpeed = typeof ALLOWED_SPEEDS[number];
type PresentFont = typeof ALLOWED_FONTS[number];
interface PresentOptions {
  theme: PresentTheme;
  transition: PresentTransition;
  speed: PresentSpeed;
  font: PresentFont;
  accent: string;
  logo: string;
  footer: string;
  ratio: '169' | '43';
  showNumbers: boolean;
  showProgress: boolean;
  showMeta: boolean;
}

type AnyRecord = Record<string, unknown>;

interface Block {
  type?: string;
  props?: AnyRecord;
  content?: unknown;
  children?: Block[];
}

interface EmbedInfo {
  provider: string;
  embedUrl: string;
}

interface PresentSession {
  titre: string;
  objectifs: string;
  content: unknown;
  duree: number;
  date: Date;
  course: { nom: string };
  class: { nom: string };
}

export const presentSession = async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.id);

  // Private: only holders of a valid, session-scoped token (minted for the owner) may view.
  if (!verifyPresentToken(req.query.token, sessionId)) {
    res.status(401).type('html').send('<!doctype html><meta charset="utf-8"><title>Acces refuse</title><body style="font-family:sans-serif;padding:2rem">Lien de presentation invalide ou expire.</body>');
    return;
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
    include: { course: true, class: true },
  }) as PresentSession | null;

  if (!session) {
    res.status(404).json({ message: 'Seance non trouvee' });
    return;
  }

  const rawTheme = typeof req.query.theme === 'string' ? req.query.theme : '';
  const rawTransition = typeof req.query.transition === 'string' ? req.query.transition : '';
  const rawSpeed = typeof req.query.speed === 'string' ? req.query.speed : '';
  const rawFont = typeof req.query.font === 'string' ? req.query.font : '';
  const rawAccent = typeof req.query.accent === 'string' ? req.query.accent : '';
  const rawLogo = typeof req.query.logo === 'string' ? req.query.logo : '';
  const rawFooter = typeof req.query.footer === 'string' ? req.query.footer : '';
  const rawRatio = typeof req.query.ratio === 'string' ? req.query.ratio : '';
  const options: PresentOptions = {
    theme: (ALLOWED_THEMES as readonly string[]).includes(rawTheme) ? rawTheme as PresentTheme : 'white',
    transition: (ALLOWED_TRANSITIONS as readonly string[]).includes(rawTransition) ? rawTransition as PresentTransition : 'slide',
    speed: (ALLOWED_SPEEDS as readonly string[]).includes(rawSpeed) ? rawSpeed as PresentSpeed : 'default',
    font: (ALLOWED_FONTS as readonly string[]).includes(rawFont) ? rawFont as PresentFont : 'inter',
    accent: /^#[0-9a-fA-F]{6}$/.test(rawAccent) ? rawAccent : '#4338ca',
    logo: rawLogo.startsWith('https://res.cloudinary.com/') ? rawLogo : '',
    footer: rawFooter.slice(0, 100),
    ratio: rawRatio === '43' ? '43' : '169',
    showNumbers: req.query.numbers === '1',
    showProgress: req.query.progress !== '0',
    showMeta: req.query.meta !== '0',
  };

  const blocks = Array.isArray(session.content) ? (session.content as unknown[]).filter(isBlock) : [];
  const slides = groupBlocksIntoSlides(blocks);
  const titleSlide = renderTitleSlide({
    title: session.titre,
    date: formatDate(session.date),
    duration: formatDuration(session.duree),
    objectives: session.objectifs,
    courseName: session.course.nom,
    className: session.class.nom,
  }, options.showMeta);

  const slideSections = [
    titleSlide,
    ...slides.map((slide) => `<section>${renderBlocksToHtml(slide)}</section>`),
  ].join('\n');

  const nonce = randomBytes(16).toString('base64');
  const html = renderPresentationHtml(session.titre, slideSections, options, nonce);

  // Tight CSP for the standalone presentation: inline scripts run only via nonce,
  // external code is limited to the Reveal.js CDN and Google Fonts.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
      "style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      'font-src https://fonts.gstatic.com data:',
      'img-src https: data:',
      'media-src https:',
      'frame-src https:',
      "connect-src 'self' https:",
      "base-uri 'none'",
    ].join('; '),
  );

  if (req.query.download === '1') {
    res.setHeader('Content-Disposition', `attachment; filename="${toFilename(session.titre)}.html"`);
  }

  res.type('html').send(html);
};

function isBlock(value: unknown): value is Block {
  return Boolean(value && typeof value === 'object' && 'type' in value);
}

function groupBlocksIntoSlides(blocks: Block[]): Block[][] {
  const slides: Block[][] = [[]];

  for (const block of blocks) {
    if (block.type === 'heading' && toNumber(block.props?.level, 3) <= 2) {
      slides.push([block]);
    } else {
      slides[slides.length - 1].push(block);
    }
  }

  return slides.filter((slide) => slide.length > 0);
}

function renderTitleSlide(data: {
  title: string;
  date: string;
  duration: string;
  objectives: string;
  courseName: string;
  className: string;
}, showMeta: boolean) {
  return `<section>
    <h1>${escapeHtml(data.title)}</h1>
    ${showMeta ? `<p class="slide-meta">${escapeHtml(data.courseName)} · ${escapeHtml(data.className)} · ${escapeHtml(data.date)} · ${escapeHtml(data.duration)}</p>` : ''}
    ${showMeta && data.objectives ? `<div class="objectives-box"><strong>Objectifs</strong><p>${escapeHtml(data.objectives)}</p></div>` : ''}
  </section>`;
}

function renderBlocksToHtml(blocks: Block[]): string {
  const html: string[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];

    if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
      const listType = block.type;
      const tag = listType === 'bulletListItem' ? 'ul' : 'ol';
      const items: string[] = [];

      while (index < blocks.length && blocks[index].type === listType) {
        items.push(`<li>${renderInline(blocks[index].content)}${renderChildren(blocks[index])}</li>`);
        index += 1;
      }

      html.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    html.push(renderBlock(block));
    index += 1;
  }

  return html.join('\n');
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(toNumber(block.props?.level, 1), 1), 3);
      return `<h${level}>${renderInline(block.content)}</h${level}>${renderChildren(block)}`;
    }
    case 'paragraph':
      return `<p>${renderInline(block.content)}</p>${renderChildren(block)}`;
    case 'codeBlock':
      return renderCodeBlock(block);
    case 'image':
      return renderImage(block);
    case 'video':
      return renderVideo(block);
    case 'file':
      return renderFile(block);
    case 'table':
      return renderTable(block);
    case 'mermaid':
      return `<div class="mermaid">${escapeHtml(toString(block.props?.code))}</div>`;
    case 'linkCard':
      return renderLinkCard(block);
    default:
      return `<p>${renderInline(block.content)}</p>${renderChildren(block)}`;
  }
}

function extractPlainText(content: unknown): string {
  if (!Array.isArray(content)) return toString(content);
  return content.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      const inline = item as AnyRecord;
      if (inline.type === 'text') return toString(inline.text);
      if (inline.type === 'link') return extractPlainText(inline.content);
    }
    return '';
  }).join('');
}

function renderCodeBlock(block: Block): string {
  const language = toString(block.props?.language);
  const code = extractPlainText(block.content);
  return `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ''}>${escapeHtml(code)}</code></pre>`;
}

function renderImage(block: Block): string {
  const url = safeUrl(toString(block.props?.url));
  if (!url) return '';

  const caption = toString(block.props?.caption);
  const name = toString(block.props?.name);
  return `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(caption || name)}" />${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
}

function renderVideo(block: Block): string {
  const url = safeUrl(toString(block.props?.url));
  if (!url) return '';

  const caption = toString(block.props?.caption);
  return `<figure><video controls src="${escapeHtml(url)}"></video>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
}

function renderFile(block: Block): string {
  const url = safeUrl(toString(block.props?.url));
  const name = toString(block.props?.name) || toString(block.props?.title) || url;
  if (!url) return `<p>📎 ${escapeHtml(name)}</p>`;

  return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">📎 ${escapeHtml(name)}</a></p>`;
}

function renderTable(block: Block): string {
  const rows = extractTableRows(block.content);
  if (rows.length === 0) return '';

  const renderRow = (row: unknown[]) => `<tr>${row.map((cell) => `<td>${renderTableCell(cell)}</td>`).join('')}</tr>`;
  const renderHeadRow = (row: unknown[]) => `<tr>${row.map((cell) => `<th>${renderTableCell(cell)}</th>`).join('')}</tr>`;
  const [head, ...body] = rows;

  return `<table><thead>${renderHeadRow(head)}</thead><tbody>${body.map(renderRow).join('')}</tbody></table>`;
}

function renderLinkCard(block: Block): string {
  const props = block.props || {};
  const url = toString(props.url);
  if (!url) return '';

  const mode = toString(props.mode) || 'auto';
  const embed = detectEmbedUrl(url);
  if (mode === 'embed' || (mode !== 'card' && mode !== 'compact' && embed)) {
    const frameSrc = safeUrl(embed?.embedUrl || url);
    if (!frameSrc) return '';
    return `<div class="iframe-wrap"><iframe src="${escapeHtml(frameSrc)}" title="${escapeHtml(toString(props.title) || embed?.provider || url)}" allow="fullscreen; picture-in-picture; clipboard-write" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }

  const image = safeUrl(toString(props.image));
  const safeHref = safeUrl(url);
  const title = toString(props.title) || url;
  const description = toString(props.description);
  const siteName = toString(props.siteName);

  return `<div class="link-card">
    ${image ? `<img class="link-card-img" src="${escapeHtml(image)}" alt="" />` : ''}
    <div class="link-card-body">
      <a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      ${siteName ? `<small>${escapeHtml(siteName)}</small>` : ''}
    </div>
  </div>`;
}

function renderChildren(block: Block): string {
  return Array.isArray(block.children) && block.children.length > 0 ? renderBlocksToHtml(block.children) : '';
}

function renderInline(content: unknown): string {
  if (typeof content === 'string') return escapeHtml(content);
  if (!Array.isArray(content)) return '';

  return content.map((item) => {
    if (typeof item === 'string') return escapeHtml(item);
    if (!item || typeof item !== 'object') return '';

    const inline = item as AnyRecord;
    if (inline.type === 'link') {
      const href = safeUrl(toString(inline.href));
      const nested = renderInline(inline.content);
      return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${nested}</a>` : nested;
    }

    let text = escapeHtml(toString(inline.text));
    const styles = inline.styles && typeof inline.styles === 'object' ? inline.styles as AnyRecord : {};
    if (styles.bold) text = `<strong>${text}</strong>`;
    if (styles.italic) text = `<em>${text}</em>`;
    if (styles.underline) text = `<u>${text}</u>`;
    if (styles.strike || styles.strikethrough) text = `<s>${text}</s>`;
    if (styles.code) text = `<code>${text}</code>`;
    return text;
  }).join('');
}

function extractTableRows(content: unknown): unknown[][] {
  if (!content || typeof content !== 'object') return [];
  const rows: unknown[] = Array.isArray(content)
    ? content
    : Array.isArray((content as AnyRecord).rows)
      ? ((content as AnyRecord).rows as unknown[])
      : [];

  return rows.map((row: unknown) => {
    if (Array.isArray(row)) return row;
    if (row && typeof row === 'object' && Array.isArray((row as AnyRecord).cells)) return (row as AnyRecord).cells as unknown[];
    return [];
  });
}

function renderTableCell(cell: unknown): string {
  if (Array.isArray(cell)) return renderInline(cell);
  if (cell && typeof cell === 'object') {
    const record = cell as AnyRecord;
    if ('content' in record) return renderInline(record.content);
    if ('text' in record) return escapeHtml(toString(record.text));
  }
  return escapeHtml(toString(cell));
}

function detectEmbedUrl(rawUrl: string): EmbedInfo | null {
  const parsedUrl = parseUrl(rawUrl);
  if (!parsedUrl) return null;

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (hostname === 'youtu.be' && segments[0]) {
    return { provider: 'YouTube', embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(segments[0])}` };
  }

  if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
    const videoId = parsedUrl.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(segments[0]) ? segments[1] : '');
    if (videoId) return { provider: 'YouTube', embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` };
  }

  if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
    const videoId = hostname === 'player.vimeo.com' && segments[0] === 'video'
      ? segments[1]
      : segments.find((segment) => /^\d+$/.test(segment));
    if (videoId) return { provider: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(videoId)}` };
  }

  if (hostname === 'loom.com') {
    const videoId = ['share', 'embed'].includes(segments[0]) ? segments[1] : '';
    if (videoId) return { provider: 'Loom', embedUrl: `https://www.loom.com/embed/${encodeURIComponent(videoId)}` };
  }

  if (hostname === 'codesandbox.io') {
    const sandboxId = segments[0] === 's'
      ? segments[1]
      : segments[0] === 'p' && (segments[1] === 'sandbox' || segments[1] === 'devbox')
        ? segments[2]
        : '';
    if (sandboxId) return { provider: 'CodeSandbox', embedUrl: `https://codesandbox.io/embed/${encodeURIComponent(sandboxId)}` };
  }

  if (hostname === 'docs.google.com') {
    const fileId = segments[2];
    if (segments[0] === 'presentation' && segments[1] === 'd' && fileId) {
      return { provider: 'Google Slides', embedUrl: `https://docs.google.com/presentation/d/${encodeURIComponent(fileId)}/embed?start=false&loop=false&delayms=3000` };
    }
    if (segments[0] === 'document' && segments[1] === 'd' && fileId) {
      return { provider: 'Google Docs', embedUrl: `https://docs.google.com/document/d/${encodeURIComponent(fileId)}/preview` };
    }
    if (segments[0] === 'spreadsheets' && segments[1] === 'd' && fileId) {
      return { provider: 'Google Sheets', embedUrl: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/preview` };
    }
  }

  if (hostname === 'figma.com' && ['file', 'design', 'proto'].includes(segments[0])) {
    return { provider: 'Figma', embedUrl: `https://www.figma.com/embed?embed_host=teac&url=${encodeURIComponent(parsedUrl.toString())}` };
  }

  return null;
}

function parseUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

function renderPresentationHtml(title: string, slideSections: string, options: PresentOptions, nonce: string): string {
  const googleFontHref = getGoogleFontHref(options.font);
  const fontFamily = getFontFamily(options.font);
  const revealWidth = options.ratio === '43' ? 960 : 1280;
  const revealHeight = 720;
  const logoHtml = options.logo
    ? `<img class="presentation-logo" src="${escapeHtml(options.logo)}" alt="Logo" />`
    : '';
  const footerHtml = options.footer
    ? `<div class="presentation-footer">${escapeHtml(options.footer)}</div>`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reset.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/${options.theme}.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/highlight/monokai.css" />
  ${googleFontHref ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${googleFontHref}" />` : ''}
  <style>
    :root { --accent: ${options.accent}; }
    body, .reveal { font-family: ${fontFamily}; }
    .slide-meta { font-size: 0.55em; color: #6b7280; }
    .objectives-box { border-left: 5px solid var(--accent); background: #eef2ff; padding: 0.8em 1em; text-align: left; }
    .objectives-box p { margin-bottom: 0; white-space: pre-wrap; }
    .reveal a { color: var(--accent); }
    .link-card { display: flex; overflow: hidden; border: 1px solid #e5e7eb; border-radius: 8px; text-align: left; }
    .link-card-img { width: 120px; object-fit: cover; background: #f9fafb; }
    .link-card-body { padding: 0.75em; }
    .link-card-body p { font-size: 0.55em; margin: 0.4em 0; }
    .link-card-body small { color: #6b7280; }
    .iframe-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; }
    .iframe-wrap iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .reveal figure img, .reveal video { max-height: 60vh; }
    .reveal table { font-size: 0.65em; }
    .reveal pre code { max-height: 520px; }
    .presentation-logo { position: fixed; right: 24px; bottom: 22px; z-index: 20; max-width: 120px; max-height: 64px; object-fit: contain; }
    .presentation-footer { position: fixed; left: 50%; bottom: 18px; z-index: 20; transform: translateX(-50%); color: #6b7280; font-size: 14px; line-height: 1.3; text-align: center; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slideSections}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/highlight/highlight.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/notes/notes.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script nonce="${nonce}">
    Reveal.initialize({
      hash: true,
      transition: '${options.transition}',
      transitionSpeed: '${options.speed}',
      slideNumber: ${options.showNumbers},
      progress: ${options.showProgress},
      width: ${revealWidth},
      height: ${revealHeight},
      plugins: [RevealHighlight, RevealNotes]
    });
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
  </script>
  ${logoHtml}
  ${footerHtml}
</body>
</html>`;
}

function getGoogleFontHref(font: PresentFont): string {
  const families: Record<Exclude<PresentFont, 'inter'>, string> = {
    montserrat: 'Montserrat:wght@400;500;600;700',
    roboto: 'Roboto:wght@400;500;700',
    lato: 'Lato:wght@400;700',
    merriweather: 'Merriweather:wght@400;700',
  };
  if (font === 'inter') return '';
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(families[font])}&display=swap`;
}

function getFontFamily(font: PresentFont): string {
  const families: Record<PresentFont, string> = {
    inter: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    montserrat: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
    roboto: 'Roboto, Arial, sans-serif',
    lato: 'Lato, Arial, sans-serif',
    merriweather: 'Merriweather, Georgia, serif',
  };
  return families[font];
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours > 0 && rest > 0) return `${hours}h ${rest}min`;
  if (hours > 0) return `${hours}h`;
  return `${rest}min`;
}

function toFilename(value: string): string {
  const filename = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return filename || 'presentation';
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
