import type { BlockStyle, EditableBlock, EditableSlide } from './slideUtils';
import { FONT_SIZE_MAP, getAutoContrastColor } from './slideUtils';
import type { Session } from '../types';

export interface PresentOptions {
  title?: string;
  transition: 'slide' | 'fade' | 'zoom' | 'none';
  controls: boolean;
  progress: boolean;
  slideNumber: boolean;
}

export const DEFAULT_PRESENT_OPTIONS: PresentOptions = {
  transition: 'slide',
  controls: true,
  progress: true,
  slideNumber: true,
};

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function blockStyleToInlineStyle(style: BlockStyle = {}, slideBg?: string) {
  const entries: string[] = [];
  const color = style.color || (slideBg ? getAutoContrastColor(slideBg) : '');

  if (color) entries.push(`color:${color}`);
  if (style.backgroundColor) entries.push(`background-color:${style.backgroundColor}`);
  if (style.fontSize) entries.push(`font-size:${FONT_SIZE_MAP[style.fontSize]}`);
  if (style.fontWeight) entries.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) entries.push(`font-style:${style.fontStyle}`);
  if (style.textAlign) entries.push(`text-align:${style.textAlign}`);

  return entries.join(';');
}

export function renderInlineFromText(text: string) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function getStringProp(block: EditableBlock, key: string) {
  const value = block.props[key];
  return typeof value === 'string' ? value : '';
}

function detectVideoEmbed(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const parts = parsed.pathname.split('/').filter(Boolean);

    if (host === 'youtu.be' && parts[0]) return `https://www.youtube.com/embed/${parts[0]}`;
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const id = parsed.searchParams.get('v') || (['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : '');
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts.find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch {
    return '';
  }
  return '';
}

export function renderEditableBlock(block: EditableBlock, slideBg?: string) {
  const inlineStyle = blockStyleToInlineStyle(block.style, slideBg);
  const styleAttr = inlineStyle ? ` style="${escapeHtml(inlineStyle)}"` : '';
  const text = renderInlineFromText(block.editableText);

  if (block.type === 'heading') {
    const level = Math.min(Math.max(Number(block.props.level ?? 1), 1), 3);
    return `<h${level}${styleAttr}>${text}</h${level}>`;
  }

  if (block.type === 'bulletListItem' || block.type === 'numberedListItem') return `<li${styleAttr}>${text}</li>`;
  if (block.type === 'codeBlock') return `<pre${styleAttr}><code>${escapeHtml(block.editableText)}</code></pre>`;
  if (block.type === 'mermaid') return `<div class="mermaid"${styleAttr}>${escapeHtml(block.editableText || getStringProp(block, 'code'))}</div>`;

  if (block.type === 'image') {
    const url = getStringProp(block, 'url');
    const caption = block.editableText || getStringProp(block, 'caption');
    return `<figure${styleAttr}>${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}">` : ''}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
  }

  if (block.type === 'linkCard') {
    const url = getStringProp(block, 'url');
    const title = block.editableText || getStringProp(block, 'title') || url;
    const description = getStringProp(block, 'description');
    const image = getStringProp(block, 'image');
    const embedUrl = detectVideoEmbed(url);

    if (embedUrl) {
      return `<div class="embed-card"${styleAttr}><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" allowfullscreen></iframe></div>`;
    }

    return `<a class="link-card" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"${styleAttr}>${image ? `<img src="${escapeHtml(image)}" alt="">` : ''}<span><strong>${escapeHtml(title)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ''}</span></a>`;
  }

  return `<p${styleAttr}>${text}</p>`;
}

export function renderEditableBlocksToHtml(blocks: EditableBlock[], slideBg?: string) {
  let html = '';
  let listType: 'ul' | 'ol' | null = null;

  blocks.forEach((block) => {
    const nextListType = block.type === 'bulletListItem' ? 'ul' : block.type === 'numberedListItem' ? 'ol' : null;

    if (listType && listType !== nextListType) {
      html += `</${listType}>`;
      listType = null;
    }
    if (nextListType && listType !== nextListType) {
      listType = nextListType;
      html += `<${listType}>`;
    }

    html += renderEditableBlock(block, slideBg);
  });

  if (listType) html += `</${listType}>`;
  return html;
}

export function exportToRevealHtml(session: Session, slides: EditableSlide[], options: Partial<PresentOptions> = {}) {
  const opts = { ...DEFAULT_PRESENT_OPTIONS, ...options };
  const title = opts.title || session.titre || 'Présentation';
  const date = session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '';

  const slideSections = slides
    .map((slide) => {
      const bg = slide.slideStyle.backgroundColor;
      const bgAttr = bg ? ` data-background-color="${escapeHtml(bg)}"` : '';
      return `<section${bgAttr}>${renderEditableBlocksToHtml(slide.blocks, bg)}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/white.css">
  <style>
    .reveal section { text-align: left; }
    .reveal h1, .reveal h2, .reveal h3 { text-align: inherit; }
    .reveal img { max-height: 58vh; object-fit: contain; border-radius: 12px; }
    .reveal figcaption { margin-top: 0.6rem; font-size: 0.5em; color: #64748b; }
    .reveal pre { width: 100%; border-radius: 12px; padding: 1rem; background: #0f172a; color: #e2e8f0; }
    .link-card { display: flex; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 14px; color: inherit; text-decoration: none; background: rgba(255,255,255,0.82); }
    .link-card img { width: 120px; height: 80px; object-fit: cover; }
    .link-card small { display: block; margin-top: 0.4rem; color: #64748b; }
    .embed-card iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 14px; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <section>
        <h1>${escapeHtml(session.titre)}</h1>
        ${session.objectifs ? `<p>${renderInlineFromText(session.objectifs)}</p>` : ''}
        <p><small>${[session.course?.nom, session.class?.nom, date].filter(Boolean).map(escapeHtml).join(' · ')}</small></p>
      </section>
      ${slideSections}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      controls: ${opts.controls},
      progress: ${opts.progress},
      slideNumber: ${opts.slideNumber},
      transition: ${JSON.stringify(opts.transition)}
    });
    mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
  </script>
</body>
</html>`;
}

export function downloadRevealHtml(session: Session, slides: EditableSlide[], options: Partial<PresentOptions> = {}) {
  const html = exportToRevealHtml(session, slides, options);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(session.titre || 'presentation').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'presentation'}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openRevealPreview(session: Session, slides: EditableSlide[], options: Partial<PresentOptions> = {}) {
  const html = exportToRevealHtml(session, slides, options);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
