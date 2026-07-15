import { Response } from 'express';
import ogs from 'open-graph-scraper';
import { AuthRequest } from '../middleware/auth.middleware';

interface UnfurlData {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
}

/**
 * Parse an IPv4 literal in any notation a resolver would accept (inet_aton):
 * dotted 1-4 parts, decimal/octal/hex parts, or a single packed integer.
 * Returns the 4 octets, or null if `host` is not an IPv4 literal.
 * This matters for SSRF: `127.1`, `0x7f.1`, `2130706433` all reach 127.0.0.1.
 */
function ipv4ToOctets(host: string): [number, number, number, number] | null {
  const parts = host.split('.');
  if (parts.length === 0 || parts.length > 4) return null;

  const nums: number[] = [];
  for (const part of parts) {
    if (part === '') return null;
    let n: number;
    if (/^0x[0-9a-f]+$/i.test(part)) n = parseInt(part, 16);
    else if (/^0[0-7]+$/.test(part)) n = parseInt(part, 8);
    else if (/^\d+$/.test(part)) n = parseInt(part, 10);
    else return null; // contains letters → a domain name, not an IPv4 literal
    if (!Number.isFinite(n) || n < 0) return null;
    nums.push(n);
  }

  const octets: [number, number, number, number] = [0, 0, 0, 0];
  if (nums.length === 1) {
    const v = nums[0];
    if (v > 0xffffffff) return null;
    octets[0] = (v >>> 24) & 0xff;
    octets[1] = (v >>> 16) & 0xff;
    octets[2] = (v >>> 8) & 0xff;
    octets[3] = v & 0xff;
  } else {
    for (let i = 0; i < nums.length - 1; i += 1) {
      if (nums[i] > 0xff) return null;
      octets[i] = nums[i];
    }
    const remaining = 4 - (nums.length - 1);
    const last = nums[nums.length - 1];
    if (last > 0xffffffff >>> (8 * (4 - remaining))) return null;
    for (let i = 0; i < remaining; i += 1) {
      octets[3 - i] = (last >>> (8 * i)) & 0xff;
    }
  }
  return octets;
}

function isPrivateOrReservedIPv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64/10
    (a === 169 && b === 254) || // link-local
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast + reserved
  );
}

/** Block IPv6 loopback, unspecified, unique-local, link-local and IPv4-mapped private targets. */
function isBlockedIPv6(inner: string): boolean {
  const h = inner.toLowerCase();
  if (h === '::1' || h === '::') return true;
  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  // IPv4-mapped, dotted form ::ffff:a.b.c.d
  const dotted = h.match(/(?:^|:)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (dotted) {
    const octets = ipv4ToOctets(dotted[1]);
    if (octets && isPrivateOrReservedIPv4(octets)) return true;
  }
  // IPv4-mapped, hex form ::ffff:7f00:1 (Node normalises the dotted form to this)
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    const octets: [number, number, number, number] = [(hi >>> 8) & 0xff, hi & 0xff, (lo >>> 8) & 0xff, lo & 0xff];
    if (isPrivateOrReservedIPv4(octets)) return true;
  }
  return false;
}

function parsePublicHttpUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost') return null;

    // IPv6 literal — WHATWG URL keeps the brackets in hostname.
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      return isBlockedIPv6(hostname.slice(1, -1)) ? null : url;
    }

    // IPv4 literal in any notation.
    const octets = ipv4ToOctets(hostname);
    if (octets) {
      return isPrivateOrReservedIPv4(octets) ? null : url;
    }

    // Registered domain name — require a dot to reject bare single-label hosts.
    if (!hostname.includes('.')) return null;

    return url;
  } catch {
    return null;
  }
}

function absoluteUrl(value: string | undefined, baseUrl: URL) {
  if (!value) return '';

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function firstUrl(
  value: Array<{ url?: string }> | string[] | string | undefined,
  baseUrl: URL,
) {
  if (!value) return '';

  if (typeof value === 'string') return absoluteUrl(value, baseUrl);

  const first = value[0];
  if (!first) return '';

  return typeof first === 'string'
    ? absoluteUrl(first, baseUrl)
    : absoluteUrl(first.url, baseUrl);
}

function extractHtmlTitle(html: string | undefined) {
  const titleMatch = html?.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() || '';
}

function fallback(url: URL): UnfurlData {
  const siteName = url.hostname;
  return {
    url: url.toString(),
    title: siteName,
    description: '',
    image: '',
    siteName,
    favicon: `https://${siteName}/favicon.ico`,
  };
}

export async function getUnfurl(req: AuthRequest, res: Response): Promise<void> {
  if (typeof req.query.url !== 'string' || req.query.url.trim() === '') {
    res.json({});
    return;
  }

  const targetUrl = parsePublicHttpUrl(req.query.url);

  if (!targetUrl) {
    res.json({});
    return;
  }

  const fallbackData = fallback(targetUrl);

  try {
    const { result, html } = await ogs({
      url: targetUrl.toString(),
      timeout: 6,
      fetchOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TeacBot/1.0)',
        },
      },
    });

    const title =
      result.ogTitle ||
      result.twitterTitle ||
      extractHtmlTitle(html) ||
      targetUrl.hostname;
    const description = result.ogDescription || result.twitterDescription || '';
    const image = firstUrl(result.ogImage || result.twitterImage, targetUrl);
    const siteName = result.ogSiteName || targetUrl.hostname;
    const favicon = absoluteUrl(result.favicon, targetUrl) || fallbackData.favicon;

    res.json({
      url: targetUrl.toString(),
      title,
      description,
      image,
      siteName,
      favicon,
    });
  } catch {
    res.json(fallbackData);
  }
}
