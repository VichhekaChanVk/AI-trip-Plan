// Keyless place photos via the Wikipedia/Wikimedia API.

export type PlaceImage = { url: string; pageUrl: string; pageTitle: string };

const API = "https://en.wikipedia.org/w/api.php";
// Wikimedia asks API clients to identify themselves.
const HEADERS = { "User-Agent": "WayfarerAI/1.0 (travel itinerary app)" };

type Page = { title: string; index?: number; thumbnail?: { source: string } };

async function query(params: Record<string, string>): Promise<Page[]> {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "640",
    pilicense: "any",
    ...params,
  });
  const res = await fetch(`${API}?${qs}`, { headers: HEADERS, next: { revalidate: 604800 } });
  if (!res.ok) return [];
  const pages = ((await res.json()).query?.pages ?? []) as Page[];
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

// Logos, maps and flags are usually SVGs; they make poor place photos.
const usable = (p: Page) => !!p.thumbnail && !/\.svg/i.test(p.thumbnail.source);

function toImage(p: Page): PlaceImage {
  return {
    url: p.thumbnail!.source,
    pageTitle: p.title,
    pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
  };
}

/** Best photo for a stop: article search on "title city", then the nearest article with a photo. */
export async function findPlaceImage(title: string, city: string, lat?: number, lng?: number): Promise<PlaceImage | null> {
  try {
    const search = await query({
      generator: "search",
      gsrsearch: [title, city].filter(Boolean).join(" "),
      gsrlimit: "3",
      gsrnamespace: "0",
    });
    const hit = search.find(usable);
    if (hit) return toImage(hit);

    if (lat !== undefined && lng !== undefined) {
      const near = await query({
        generator: "geosearch",
        ggscoord: `${lat}|${lng}`,
        ggsradius: "800",
        ggslimit: "5",
      });
      const nearHit = near.find(usable);
      if (nearHit) return toImage(nearHit);
    }
  } catch {
    /* Wikipedia unreachable: caller shows a placeholder */
  }
  return null;
}
