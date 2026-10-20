import type { LatLng } from "@/data/geo";

/** Where the store hands orders over: a real place, with the name and address a buyer reads and where it is on the map. */
export type StoreLocation = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  /** A campus hub, a place found by search, or a spot the seller pinned by hand. */
  source: "hub" | "search" | "pin";
};

export type FoundPlace = { id: string; name: string; address: string; coordinate: LatLng };

/**
 * Real places near the Eduvos Potchefstroom campus to start from. The Mooirivier Mall position is from OpenStreetMap.
 * The campus pin is near the corner of Esselen and Steve Biko streets (12 Esselen Street, Die Bult, the address Eduvos
 * publishes), placed between the two streets as OpenStreetMap draws them, so the seller can move it to the exact gate.
 */
export const CAMPUS_HUBS: FoundPlace[] = [
  { address: "12 Esselen Street (cnr Steve Biko Street), Die Bult, Potchefstroom", coordinate: { latitude: -26.69408, longitude: 27.09413 }, id: "hub-eduvos", name: "Eduvos Potchefstroom campus" },
  { address: "Nelson Mandela Drive, Grimbeekpark, Potchefstroom", coordinate: { latitude: -26.7128591, longitude: 27.1044191 }, id: "hub-mooirivier", name: "Mooirivier Mall" },
];

/** Where the map starts when nothing is chosen yet. */
export const START_POINT: LatLng = CAMPUS_HUBS[0]!.coordinate;

export function locationFromPlace(place: FoundPlace, source: StoreLocation["source"]): StoreLocation {
  return { address: place.address, latitude: place.coordinate.latitude, longitude: place.coordinate.longitude, name: place.name, source };
}

/** "Eduvos Potchefstroom campus, 12 Esselen Street" for lists and the store card. */
export function locationLine(location: StoreLocation): string {
  const street = location.address.split(",")[0]?.trim();
  return street && street !== location.name ? `${location.name}, ${street}` : location.name;
}

type NominatimHit = { place_id: number; lat: string; lon: string; display_name: string; name?: string; address?: Record<string, string> };

const ENDPOINT = "https://nominatim.openstreetmap.org";
const HEADERS = { Accept: "application/json", "Accept-Language": "en" };

/** Turns what OpenStreetMap returns into a short name and the rest of the address. */
export function placeFromHit(hit: NominatimHit): FoundPlace {
  const parts = hit.display_name.split(",").map((part) => part.trim());
  const name = hit.name || parts[0] || "Place";
  const rest = parts[0] === name ? parts.slice(1) : parts;
  return { address: rest.slice(0, 4).join(", "), coordinate: { latitude: Number(hit.lat), longitude: Number(hit.lon) }, id: `osm-${hit.place_id}`, name };
}

/**
 * Looks a place up by name in OpenStreetMap (Nominatim), in South Africa, near Potchefstroom first. It is a public service with
 * a fair-use limit, so callers wait for the seller to stop typing. Returns an empty list when nothing is found or there is no network.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<FoundPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const near = START_POINT;
  const box = `${near.longitude - 0.4},${near.latitude + 0.3},${near.longitude + 0.4},${near.latitude - 0.3}`;
  try {
    const response = await fetch(`${ENDPOINT}/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=za&viewbox=${box}&q=${encodeURIComponent(q)}`, { headers: HEADERS, signal });
    if (!response.ok) return [];
    const hits = (await response.json()) as NominatimHit[];
    return hits.map(placeFromHit);
  } catch {
    return [];
  }
}

/** The nearest named place to a pin the seller dropped by hand. Returns null when it cannot be found. */
export async function placeAt(point: LatLng, signal?: AbortSignal): Promise<FoundPlace | null> {
  try {
    const response = await fetch(`${ENDPOINT}/reverse?format=jsonv2&zoom=18&lat=${point.latitude}&lon=${point.longitude}`, { headers: HEADERS, signal });
    if (!response.ok) return null;
    const hit = (await response.json()) as NominatimHit & { error?: string };
    if (hit.error || !hit.display_name) return null;
    return { ...placeFromHit(hit), coordinate: point };
  } catch {
    return null;
  }
}

const geocoded = new Map<string, LatLng | null>();

/** Finds a typed address (like a buyer's drop-off) on the map once, and remembers the answer. */
export async function geocode(text: string): Promise<LatLng | null> {
  const key = text.trim().toLowerCase();
  if (!key) return null;
  if (geocoded.has(key)) return geocoded.get(key) ?? null;
  const hub = CAMPUS_HUBS.find((item) => key.includes(item.name.toLowerCase().split(" ")[0]!));
  if (hub) {
    geocoded.set(key, hub.coordinate);
    return hub.coordinate;
  }
  const [first] = await searchPlaces(text);
  geocoded.set(key, first?.coordinate ?? null);
  return first?.coordinate ?? null;
}
