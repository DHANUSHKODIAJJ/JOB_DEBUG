import { ApiError } from "../utils/ApiError";

export interface NaukriPosting{
  jobText: string;
  title?: string;
  companyName?: string;
  statedLocation?: string;
}

const FALLBACK = 'Naukri did not provide a readable job description. Open the listing and paste its JD text instead.';

const MAX_BYTES = 1_000_000;
const MAX_JOB_CHARS = 10_000;

function decodeHtml(text: string): string {
  return text.replace(/&(#(?:x[0-9a-f]+|[0-9]+)|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? `&${entity};`;
    const hex = entity[1]?.toLowerCase() === 'x';
    const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
  });
}
function plainText(html: string): string {
  return decodeHtml(html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(?:p|div|li|br|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
function pickText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? plainText(value).trim() : undefined;
}


function fromJobData(raw: unknown): NaukriPosting | null {
  if (!raw || typeof raw !== 'object') return null;
  const job = raw as Record<string, unknown>;
  const jobText = pickText(job.description) ?? pickText(job.jobDescription);
  if (!jobText || jobText.length < 80 || jobText.length > MAX_JOB_CHARS) return null;
  const organization = job.hiringOrganization as Record<string, unknown> | undefined;
  const location = job.jobLocation as Record<string, unknown> | undefined;
  const address = location?.address as Record<string, unknown> | undefined;
  const locations = Array.isArray(job.locations) ? job.locations : [];
  const place = locations.find((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  return {
    jobText,
    title: pickText(job.title),
    companyName: pickText(job.companyName) ?? pickText(organization?.name),
    statedLocation: pickText(address?.addressLocality) ?? pickText(place?.label),
  };
}

function fromStructuredData(html: string): NaukriPosting | null {
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
  for (const [, attributes, content] of scripts) {
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attributes)) continue;
    try {
      const data = JSON.parse(content);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const entries = Array.isArray(node?.['@graph']) ? node['@graph'] : [node];
        for (const entry of entries) {
          if (entry?.['@type'] === 'JobPosting' || entry?.['@type']?.includes?.('JobPosting')) {
            const posting = fromJobData(entry);
            if (posting) return posting;
          }
        }
      }
    } catch { /* A malformed script is not a job description. */ }
  }
  return null;
}

async function readResponse(url: string, accept: string): Promise<{ status: number; body: string } | null> {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        'Accept': accept,
        'Accept-Language': 'en-IN,en;q=0.9',
        'appid': '109',
        'systemid': 'Naukri',
      },
    });
    if (!response.ok || Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) {
      await response.body?.cancel();
      return null;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (accept === 'application/json' && !contentType.includes('application/json')) return null;
    if (accept !== 'application/json' && !contentType.includes('text/html')) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return { status: response.status, body: new TextDecoder().decode(Buffer.concat(chunks)) };
  } catch {
    return null;
  }
}

export async function fetchNaukriJob(rawUrl: string): Promise<NaukriPosting> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw ApiError.badRequest('Enter a Naukri job listing URL.');
  }
  const validHost = url.hostname.toLowerCase() === 'www.naukri.com' || url.hostname.toLowerCase() === 'naukri.com';
  const jobId = url.pathname.match(/^\/job-listings-[a-z0-9-]+-(\d{9,15})\/?$/i)?.[1];
  if (url.protocol !== 'https:' || !validHost || url.port || url.username || url.password || !jobId) {
    throw ApiError.badRequest('Enter a valid https://www.naukri.com/job-listings-... job URL.');
  }

const pageUrl = `https://www.naukri.com${url.pathname}`;
  const page = await readResponse(pageUrl, 'text/html,application/xhtml+xml');
  const fromPage = page ? fromStructuredData(page.body) : null;
  if (fromPage) return fromPage;

  const api = await readResponse(`https://www.naukri.com/jobapi/v4/job/${jobId}`, 'application/json');
  if (api) {
    try {
      const data = JSON.parse(api.body);
      const posting = fromJobData(data?.jobDetails ?? data);
      if (posting) return posting;
    } catch { /* The response was not usable job data. */ }
  }
  throw new ApiError(422, FALLBACK);
}


