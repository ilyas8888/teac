export type EmbedAspect = 'video' | 'tall' | 'wide';

export interface EmbedInfo {
  provider: string;
  embedUrl: string;
  aspect: EmbedAspect;
}

function parseUrl(rawUrl: string) {
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

function firstPathSegment(url: URL) {
  return url.pathname.split('/').filter(Boolean)[0] || '';
}

function appendSearchParam(url: URL, key: string, value: string) {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set(key, value);
  return nextUrl.toString();
}

export function detectEmbed(url: string): EmbedInfo | null {
  const parsedUrl = parseUrl(url);
  if (!parsedUrl) return null;

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsedUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);

  if (hostname === 'youtu.be') {
    const videoId = firstPathSegment(parsedUrl);
    if (videoId) {
      return {
        provider: 'YouTube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        aspect: 'video',
      };
    }
  }

  if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
    const videoId =
      parsedUrl.searchParams.get('v') ||
      (['embed', 'shorts', 'live'].includes(segments[0]) ? segments[1] : '');
    if (videoId) {
      return {
        provider: 'YouTube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        aspect: 'video',
      };
    }
  }

  if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
    const videoId =
      hostname === 'player.vimeo.com' && segments[0] === 'video'
        ? segments[1]
        : segments.find((segment) => /^\d+$/.test(segment));
    if (videoId) {
      return {
        provider: 'Vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        aspect: 'video',
      };
    }
  }

  if (hostname === 'loom.com') {
    const videoId = ['share', 'embed'].includes(segments[0]) ? segments[1] : '';
    if (videoId) {
      return {
        provider: 'Loom',
        embedUrl: `https://www.loom.com/embed/${videoId}`,
        aspect: 'video',
      };
    }
  }

  if (hostname === 'codesandbox.io') {
    let sandboxId = '';
    if (segments[0] === 's') sandboxId = segments[1];
    else if (segments[0] === 'p' && (segments[1] === 'sandbox' || segments[1] === 'devbox')) sandboxId = segments[2];
    if (sandboxId) {
      return {
        provider: 'CodeSandbox',
        embedUrl: `https://codesandbox.io/embed/${sandboxId}`,
        aspect: 'tall',
      };
    }
  }

  if (hostname === 'stackblitz.com') {
    if (segments[0] === 'edit' || segments[0] === 'github') {
      return {
        provider: 'StackBlitz',
        embedUrl: appendSearchParam(parsedUrl, 'embed', '1'),
        aspect: 'tall',
      };
    }
  }

  if (hostname === 'codepen.io') {
    const penIndex = segments.indexOf('pen');
    if (penIndex > 0 && segments[penIndex + 1]) {
      return {
        provider: 'CodePen',
        embedUrl: `https://codepen.io/${segments[penIndex - 1]}/embed/${segments[penIndex + 1]}?default-tab=result`,
        aspect: 'tall',
      };
    }
  }

  if (hostname === 'docs.google.com') {
    const fileId = segments[2];
    if (segments[0] === 'presentation' && segments[1] === 'd' && fileId) {
      return {
        provider: 'Google Slides',
        embedUrl: `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`,
        aspect: 'video',
      };
    }

    if (segments[0] === 'document' && segments[1] === 'd' && fileId) {
      return {
        provider: 'Google Docs',
        embedUrl: `https://docs.google.com/document/d/${fileId}/preview`,
        aspect: 'tall',
      };
    }

    if (segments[0] === 'spreadsheets' && segments[1] === 'd' && fileId) {
      return {
        provider: 'Google Sheets',
        embedUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
        aspect: 'tall',
      };
    }
  }

  if (hostname === 'figma.com') {
    if (['file', 'design', 'proto'].includes(segments[0])) {
      return {
        provider: 'Figma',
        embedUrl: `https://www.figma.com/embed?embed_host=teac&url=${encodeURIComponent(parsedUrl.toString())}`,
        aspect: 'wide',
      };
    }
  }

  if (pathname.toLowerCase().endsWith('.pdf')) {
    return {
      provider: 'PDF',
      embedUrl: parsedUrl.toString(),
      aspect: 'tall',
    };
  }

  return null;
}
