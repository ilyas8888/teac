import type { BlockStyle, EditableBlock, EditableSlide } from './slideUtils';
import { FONT_SIZE_MAP, getAutoContrastColor } from './slideUtils';
import type { Session } from '../types';

type AnyRecord = Record<string, unknown>;

export interface PresentOptions {
  title?: string;
  theme: 'white' | 'black' | 'night' | 'moon' | 'solarized' | 'sky';
  transition: 'slide' | 'fade' | 'zoom' | 'convex' | 'concave' | 'none';
  controls: boolean;
  progress: boolean;
  slideNumber: boolean;
}

export const DEFAULT_PRESENT_OPTIONS: PresentOptions = {
  theme: 'white',
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

function renderText(raw: unknown) {
  return escapeHtml(raw)
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/ {2,}/g, (m) => '&nbsp;'.repeat(m.length));
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown) {
  return value === true || value === 'true';
}

function getProp(props: AnyRecord | undefined, key: string) {
  return props?.[key];
}

function getStringProp(block: EditableBlock, key: string) {
  return asString(block.props[key]);
}

function getContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (!isRecord(item)) return '';
      if (item.type === 'text') return asString(item.text);
      if (item.type === 'link') return getContentText(item.content);
      return '';
    })
    .join('');
}

export function blockStyleToInlineStyle(style: BlockStyle = {}, slideBg?: string) {
  const entries: string[] = [];
  const color = style.color || (slideBg ? getAutoContrastColor(slideBg) : '');

  if (color && color !== 'default') entries.push(`color:${color}`);
  if (style.backgroundColor && style.backgroundColor !== 'default') entries.push(`background-color:${style.backgroundColor}`);
  if (style.fontSize) entries.push(`font-size:${FONT_SIZE_MAP[style.fontSize]}`);
  if (style.fontWeight) entries.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) entries.push(`font-style:${style.fontStyle}`);
  if (style.textAlign) entries.push(`text-align:${style.textAlign}`);

  return entries.join(';');
}

function renderStyledText(text: string, styles: unknown) {
  const styleMap = isRecord(styles) ? styles : {};
  const inlineStyles: string[] = [];
  let html = renderText(text);

  if (typeof styleMap.textColor === 'string' && styleMap.textColor !== 'default') inlineStyles.push(`color:${styleMap.textColor}`);
  if (typeof styleMap.backgroundColor === 'string' && styleMap.backgroundColor !== 'default') inlineStyles.push(`background-color:${styleMap.backgroundColor}`);
  if (inlineStyles.length > 0) html = `<span style="${escapeHtml(inlineStyles.join(';'))}">${html}</span>`;
  if (asBoolean(styleMap.code)) html = `<code>${html}</code>`;
  if (asBoolean(styleMap.strike)) html = `<s>${html}</s>`;
  if (asBoolean(styleMap.underline)) html = `<u>${html}</u>`;
  if (asBoolean(styleMap.italic)) html = `<em>${html}</em>`;
  if (asBoolean(styleMap.bold)) html = `<strong>${html}</strong>`;

  return html;
}

export function renderInlineContent(content: unknown): string {
  if (typeof content === 'string') return renderText(content);
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (typeof item === 'string') return renderText(item);
      if (!isRecord(item)) return '';

      if (item.type === 'text') return renderStyledText(asString(item.text), item.styles);

      if (item.type === 'link') {
        const href = asString(item.href) || asString(item.url);
        const body = renderInlineContent(item.content) || escapeHtml(href);
        return href
          ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${body}</a>`
          : body;
      }

      return renderInlineContent(item.content);
    })
    .join('');
}

function renderBlockText(block: EditableBlock) {
  return renderInlineContent(block.content) || renderStyledText(block.editableText, {});
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

function renderMediaUrlBlock(tagName: 'audio' | 'video', block: EditableBlock, styleAttr = '') {
  const url = getStringProp(block, 'url') || getStringProp(block, 'src');
  if (!url) return '';
  if (tagName === 'audio') return `<audio src="${escapeHtml(url)}" controls${styleAttr}></audio>`;

  const blockStyle = blockStyleToInlineStyle(block.style);
  const videoStyle = ['max-width:100%', blockStyle].filter(Boolean).join(';');
  return `<video src="${escapeHtml(url)}" controls style="${escapeHtml(videoStyle)}"></video>`;
}

function renderTableCell(cell: unknown) {
  if (!isRecord(cell)) return '';
  return `<td>${renderInlineContent(cell.content)}</td>`;
}

function renderTable(block: EditableBlock, styleAttr = '') {
  const content = isRecord(block.content) ? block.content : {};
  const rows = Array.isArray(content.rows) ? content.rows : [];
  const renderedRows = rows.map((row) => {
    const cells = isRecord(row) && Array.isArray(row.cells) ? row.cells : [];
    return cells.map(renderTableCell).join('');
  });
  const head = renderedRows[0] ? `<thead><tr>${renderedRows[0].replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</tr></thead>` : '';
  const bodyRows = renderedRows.slice(1).map((row) => `<tr>${row}</tr>`).join('');
  const body = bodyRows ? `<tbody>${bodyRows}</tbody>` : '';
  return `<table${styleAttr}>${head}${body}</table>`;
}

function renderToggle(block: EditableBlock, slideBg?: string) {
  const title = renderBlockText(block);
  const content = block.children.length > 0
    ? renderEditableBlocksToHtml(block.children.map((child, index) => ({
        id: child.id || `${block.id}-child-${index}`,
        type: child.type || 'paragraph',
        props: child.props ?? {},
        content: child.content,
        children: child.children ?? [],
        style: {},
        editableText: getContentText(child.content),
      })), slideBg)
    : '';

  return `<details><summary>${title}</summary>${content || '<p></p>'}</details>`;
}

export function renderEditableBlock(block: EditableBlock, slideBg?: string) {
  const inlineStyle = blockStyleToInlineStyle(block.style, slideBg);
  const styleAttr = inlineStyle ? ` style="${escapeHtml(inlineStyle)}"` : '';
  const text = renderBlockText(block);

  if (block.type === 'heading') {
    const level = Math.min(Math.max(Number(block.props.level ?? 1), 1), 3);
    return `<h${level}${styleAttr}>${text}</h${level}>`;
  }

  if (block.type === 'bulletListItem' || block.type === 'numberedListItem') return `<li${styleAttr}>${text}</li>`;
  if (block.type === 'checkListItem') {
    const checked = asBoolean(block.props.checked) ? ' checked' : '';
    return `<li class="check-item"${styleAttr}><input type="checkbox" disabled${checked}> ${text}</li>`;
  }
  if (block.type === 'toggleListItem') return renderToggle(block, slideBg);
  if (block.type === 'quote') return `<blockquote${styleAttr}>${text}</blockquote>`;
  if (block.type === 'divider' || block.type === 'horizontalRule') return '<hr>';
  if (block.type === 'codeBlock') return `<pre${styleAttr}><code>${escapeHtml(block.editableText || getContentText(block.content))}</code></pre>`;
  if (block.type === 'mermaid') return `<div class="mermaid"${styleAttr}>${escapeHtml(block.editableText || getStringProp(block, 'code'))}</div>`;
  if (block.type === 'table') return renderTable(block, styleAttr);
  if (block.type === 'audio') return renderMediaUrlBlock('audio', block, styleAttr);
  if (block.type === 'video') {
    const url = getStringProp(block, 'url') || getStringProp(block, 'src');
    const embedUrl = detectVideoEmbed(url);
    if (embedUrl) return `<div class="embed-card"${styleAttr}><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(block.editableText || url)}" allowfullscreen></iframe></div>`;
    return renderMediaUrlBlock('video', block, styleAttr);
  }
  if (block.type === 'file') {
    const url = getStringProp(block, 'url') || getStringProp(block, 'src');
    const name = getStringProp(block, 'name') || getStringProp(block, 'fileName') || block.editableText || url || 'Fichier';
    return `<a class="file-link" href="${escapeHtml(url)}" download${styleAttr}>📎 ${escapeHtml(name)}</a>`;
  }

  if (block.type === 'image') {
    const url = getStringProp(block, 'url');
    const caption = getStringProp(block, 'caption');
    const width = getProp(block.props, 'width');
    const textAlignment = asString(getProp(block.props, 'textAlignment'));
    const figureStyles = [inlineStyle];
    if (textAlignment) figureStyles.push(`text-align:${textAlignment}`);
    const figureStyleAttr = figureStyles.filter(Boolean).length > 0 ? ` style="${escapeHtml(figureStyles.filter(Boolean).join(';'))}"` : '';
    const widthAttr = typeof width === 'number' || typeof width === 'string' ? ` style="width:${escapeHtml(width)}${typeof width === 'number' ? 'px' : ''};max-width:100%"` : '';
    return `<figure${figureStyleAttr}>${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}"${widthAttr}>` : ''}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
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
    const nextListType = block.type === 'bulletListItem' || block.type === 'checkListItem'
      ? 'ul'
      : block.type === 'numberedListItem'
        ? 'ol'
        : null;

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
  const title = opts.title || session.titre || 'Presentation';
  const date = session.date ? new Date(session.date).toLocaleDateString('fr-FR') : '';
  const meta = [session.course?.nom, session.class?.nom, date].filter(Boolean).map(escapeHtml).join(' &middot; ');

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/${escapeHtml(opts.theme)}.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css">
  <style>
    :root {
      --r-main-font: Inter, system-ui, sans-serif;
      --r-heading-font: Inter, system-ui, sans-serif;
      --r-code-font: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
      --r-main-font-size: 28px;
      --r-heading1-size: 1.9em;
      --r-heading2-size: 1.4em;
      --r-heading3-size: 1.1em;
    }
    .reveal section { text-align: left; overflow: hidden; }
    .reveal h1, .reveal h2, .reveal h3 { text-align: inherit; letter-spacing: 0; line-height: 1.1; margin-bottom: 0.4em; }
    .reveal p, .reveal li { line-height: 1.4; margin-bottom: 0.3em; }
    .reveal ul, .reveal ol { margin-top: 0; }
    .reveal img { max-height: 40vh; object-fit: contain; border-radius: 10px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14); }
    .reveal figure { margin: 0.4em 0; }
    .reveal figcaption { margin-top: 0.4rem; font-size: 0.5em; color: #64748b; }
    .reveal pre { width: 100%; border-radius: 12px; padding: 0.75rem 1rem; margin: 0.4em 0; background: #0f172a; color: #e2e8f0; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.2); }
    .reveal pre code, .reveal code { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace; font-size: 0.85em; }
    .reveal :not(pre) > code { border-radius: 0.3rem; padding: 0.06em 0.28em; background: rgba(15, 23, 42, 0.1); color: #4338ca; }
    .reveal blockquote { margin: 0.4em 0; padding: 0.7rem 1rem; border-left: 5px solid #4f46e5; background: rgba(79, 70, 229, 0.07); box-shadow: none; font-style: normal; }
    .reveal table { width: 100%; border-collapse: collapse; font-size: 0.68em; }
    .reveal th, .reveal td { padding: 0.45rem 0.6rem; border: 1px solid rgba(148, 163, 184, 0.5); }
    .reveal thead tr { background: rgba(79, 70, 229, 0.14); }
    .reveal tbody tr:nth-child(even) { background: rgba(148, 163, 184, 0.1); }
    .check-item { list-style: none; display: flex; align-items: center; gap: 0.5rem; }
    .check-item input { width: 0.85em; height: 0.85em; accent-color: #4f46e5; }
    .embed-card { width: 100%; margin: 0.6rem 0; border-radius: 14px; overflow: hidden; background: #0f172a; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.2); }
    .embed-card iframe { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; }
    .file-link { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.75rem; border: 1px solid rgba(79, 70, 229, 0.3); border-radius: 9px; color: #4338ca; background: rgba(79, 70, 229, 0.07); text-decoration: none; font-weight: 600; }
    .link-card { display: flex; gap: 0.8rem; align-items: center; padding: 0.8rem; border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 12px; color: inherit; text-decoration: none; background: rgba(255, 255, 255, 0.82); box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1); }
    .link-card img { width: 90px; height: 60px; object-fit: cover; flex: 0 0 auto; border-radius: 6px; }
    .link-card small { display: block; margin-top: 0.3rem; color: #64748b; font-size: 0.8em; }
    .title-slide { display: flex !important; flex-direction: column; justify-content: center; height: 100%; padding: 2rem 0; box-sizing: border-box; }
    .title-slide .course-badge { display: inline-flex; width: fit-content; margin-bottom: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 999px; background: rgba(79, 70, 229, 0.12); color: #4338ca; font-size: 0.5em; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
    .title-slide h1 { margin-bottom: 0.4rem; font-size: 1.8em; font-weight: 800; line-height: 1.05; }
    .title-slide .objectives { color: #475569; font-size: 0.6em; line-height: 1.5; max-height: 55vh; overflow: hidden; }
    .title-slide .meta { margin-top: 0.8rem; color: #64748b; font-size: 0.48em; font-weight: 600; }
    details { margin: 0.5rem 0; }
    summary { cursor: pointer; font-weight: 700; }
    audio, video { margin: 0.5rem 0; max-width: 100%; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <section class="title-slide">
        ${session.course?.nom ? `<div class="course-badge">${escapeHtml(session.course.nom)}</div>` : ''}
        <h1>${escapeHtml(title)}</h1>
        ${session.objectifs ? `<p class="objectives">${escapeHtml(session.objectifs).replace(/\n/g, '<br>')}</p>` : ''}
        ${meta ? `<p class="meta">${meta}</p>` : ''}
      </section>
      ${slideSections}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"></script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, securityLevel: 'loose' });
  </script>
  <script>
    Reveal.initialize({
      hash: false,
      center: false,
      width: 1100,
      height: 700,
      margin: 0.06,
      minScale: 0.1,
      maxScale: 2.0,
      controls: ${opts.controls},
      progress: ${opts.progress},
      slideNumber: ${opts.slideNumber},
      transition: ${JSON.stringify(opts.transition)}
    }).then(function () {
      if (window.hljs) window.hljs.highlightAll();
    });
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
