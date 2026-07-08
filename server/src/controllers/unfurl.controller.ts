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

function isPrivateIPv4(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) || // link-local
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  );
}

function parsePublicHttpUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (hostname === 'localhost' || hostname === '::1') return null;
    if (!hostname.includes('.')) return null;
    if (isPrivateIPv4(hostname)) return null;

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
    res.status(400).json({ message: 'URL invalide ou non autorisee' });
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
