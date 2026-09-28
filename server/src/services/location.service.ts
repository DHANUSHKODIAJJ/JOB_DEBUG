type LocationStatus = 'company_office_found' | 'city_only' | 'not_found' | 'unavailable';

interface Place {
  display_name?: string;
  name?: string;
  category?: string;
  type?: string;
  lat?: string;
  lon?: string;
}

export interface CompanyCard {
  status: LocationStatus;
  note: string;
  placeName?: string;
  displayAddress?: string;
  mapsUrl?: string;
  reviewUrls?: { google: string; ambitionBox: string };
  source: 'OpenStreetMap Nominatim';
  attribution: '© OpenStreetMap contributors';
}


const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'JobTracker2026/0.1 (+https://github.com/DHANUSHKODIAJJ/job-tracker-2026)';
const cache = new Map<string, { expires: number; places: Place[] | null }>();
let nextRequestAt = 0;
let requestQueue = Promise.resolve();

function clean(value?: string): string | undefined {
  return value?.replace(/[^\p{L}\p{N}.,&()\- ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\b(?:pvt|private|limited|ltd|llp|inc|technologies|technology)\b/g, '').replace(/\s+/g, ' ').trim();
}

function companyMatch(company: string, place: Place): boolean {
  const wanted = normalize(company);
  const found = normalize(place.name ?? '');
  return wanted.length >= 4 && found.length >= 4 && (wanted === found || found.startsWith(`${wanted} `) || wanted.startsWith(`${found} `));
}


async function search(query: string, poi = false): Promise<Place[] | null> {
  const key = `${poi ? 'poi' : 'city'}:${query.toLowerCase()}`;
  const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return stored.places;

  const run = async () => {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + 1100;
    try {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', countrycodes: 'in' });
      if (poi) params.set('layer', 'poi');
      const response = await fetch(`${ENDPOINT}?${params}`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json', 'Accept-Language': 'en' },
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
      if (Number(response.headers.get('content-length') ?? 0) > 100_000) return null;
      const reader = response.body?.getReader();
      if (!reader) return null;
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 100_000) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      const data: unknown = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
      if (!Array.isArray(data)) return null;
      const places = data.filter((item): item is Place => !!item && typeof item === 'object');
      cache.set(key, { places, expires: Date.now() + 24 * 60 * 60 * 1000 });
      return places;
    } catch {
      return null;
    }
  };
  const result = requestQueue.then(run, run);
  requestQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function checkCompanyLocation(companyName?: string, statedLocation?: string): Promise<CompanyCard> {
  const company = clean(companyName);
  const city = clean(statedLocation);
  const searchText = [company, city].filter(Boolean).join(', ');
  const links = company ? {
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchText)}`,
    reviewUrls: {
      google: `https://www.google.com/search?q=${encodeURIComponent(`${company} ${city ?? ''} company reviews`)}`,
      ambitionBox: `https://www.google.com/search?q=${encodeURIComponent(`site:ambitionbox.com ${company} reviews`)}`,
    },
  } : {};
  const common = { source: 'OpenStreetMap Nominatim' as const, attribution: '© OpenStreetMap contributors' as const, ...links };

  if (!company && !city) {
    return { ...common, status: 'not_found', note: 'No company or location was supplied; office not checked.' };
  }
  if (company) {
    const candidates = await search(searchText, true);
    if (candidates === null) {
      return { ...common, status: 'unavailable', note: 'Location lookup unavailable. This says nothing about the company; check the map link yourself.' };
    }
    const office = candidates.find((place) => companyMatch(company, place));
    if (office) {
      return {
        ...common, status: 'company_office_found', placeName: office.name,
        displayAddress: office.display_name,
        note: 'A matching company-named map entry was found. It is unverified and does not prove this job listing is genuine.',
      };
    }
  }
  if (city) {
    const cities = await search(city);
    if (cities === null) {
      return { ...common, status: 'unavailable', note: 'Location lookup unavailable. This says nothing about the company; check the map link yourself.' };
    }
    const cityPlace = cities.find((place) => ['city', 'town', 'village', 'administrative'].includes(place.type ?? ''));
    if (cityPlace) {
      return {
        ...common, status: 'city_only', placeName: cityPlace.name,
        displayAddress: cityPlace.display_name,
        note: 'The stated area was found, but no matching company office was found in this map lookup. The address and job remain unverified.',
      };
    }
  }
  return { ...common, status: 'not_found', note: 'No matching office or stated area was found in this map lookup. This is not proof of a scam; check the links yourself.' };
}
