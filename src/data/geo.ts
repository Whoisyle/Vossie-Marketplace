import type { CampusId } from "./types";

export type LatLng = { latitude: number; longitude: number };

/**
 * MOCK locations. These are approximate city-centre coordinates, not surveyed campus or shop positions.
 * Real store and pickup coordinates will come from the seller's address (geocoded) once the backend holds them.
 */
export const campusCenter: Record<CampusId, LatLng> = {
  bedfordview: { latitude: -26.1767, longitude: 28.1347 },
  bloemfontein: { latitude: -29.0852, longitude: 26.1596 },
  "cape-town-mowbray": { latitude: -33.9475, longitude: 18.4755 },
  "durban-umhlanga": { latitude: -29.727, longitude: 31.085 },
  "east-london": { latitude: -33.0153, longitude: 27.9116 },
  "midrand-head-office": { latitude: -25.9992, longitude: 28.1263 },
  "nelson-mandela-bay-gqeberha": { latitude: -33.9608, longitude: 25.6022 },
  "nelspruit-mbombela": { latitude: -25.4753, longitude: 30.9694 },
  potchefstroom: { latitude: -26.7145, longitude: 27.097 },
  pretoria: { latitude: -25.7479, longitude: 28.2293 },
  "tyger-valley-cape-town": { latitude: -33.876, longitude: 18.631 },
  "vaal-vanderbijlpark": { latitude: -26.7117, longitude: 27.838 },
};

/** Deterministic pseudo-random in [0, 1) from text, so a store always lands in the same place. */
function unit(text: string, salt: number): number {
  let value = salt;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return (value % 10_000) / 10_000;
}

function offset(origin: LatLng, northMetres: number, eastMetres: number): LatLng {
  return {
    latitude: origin.latitude + northMetres / 111_320,
    longitude: origin.longitude + eastMetres / (111_320 * Math.cos((origin.latitude * Math.PI) / 180)),
  };
}

/** A store's spot: within about 450 m of its campus centre. */
export function storeLocation(sellerId: string, campusId: CampusId): LatLng {
  return offset(campusCenter[campusId], (unit(sellerId, 3) - 0.5) * 900, (unit(sellerId, 11) - 0.5) * 900);
}

export type Place = { id: string; name: string; detail: string; coordinate: LatLng };

/** Named spots on a campus for the address picker and for collection points. */
export function campusPlaces(campusId: CampusId): Place[] {
  const centre = campusCenter[campusId];
  return [
    { coordinate: centre, detail: "Main campus gate", id: "main-gate", name: "Main entrance" },
    { coordinate: offset(centre, 140, 90), detail: "Ground floor, next to the food court", id: "student-centre", name: "Student centre" },
    { coordinate: offset(centre, -120, 160), detail: "Front desk, open until 22:00", id: "library", name: "Library" },
    { coordinate: offset(centre, -210, -130), detail: "Residence A reception", id: "res-a", name: "Residence A" },
    { coordinate: offset(centre, 230, -170), detail: "Next to the sports fields", id: "gym", name: "Sports centre" },
  ];
}

export function distanceKm(from: LatLng, to: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (to.latitude - from.latitude) * rad;
  const dLon = (to.longitude - from.longitude) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** A gently curved path between two points, so the route does not look like a ruler line. */
export function routeBetween(from: LatLng, to: LatLng, steps = 28): LatLng[] {
  const midLat = (from.latitude + to.latitude) / 2;
  const midLon = (from.longitude + to.longitude) / 2;
  // push the middle sideways by a fifth of the gap
  const bulgeLat = -(to.longitude - from.longitude) * 0.2;
  const bulgeLon = (to.latitude - from.latitude) * 0.2;
  const control = { latitude: midLat + bulgeLat, longitude: midLon + bulgeLon };
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return {
      latitude: a * from.latitude + b * control.latitude + c * to.latitude,
      longitude: a * from.longitude + b * control.longitude + c * to.longitude,
    };
  });
}

/** Position a fraction (0 to 1) of the way along a route. */
export function pointAlong(route: LatLng[], fraction: number): LatLng {
  const last = route.length - 1;
  if (last <= 0) return route[0]!;
  const t = Math.min(1, Math.max(0, fraction)) * last;
  const index = Math.min(last - 1, Math.floor(t));
  const local = t - index;
  const a = route[index]!;
  const b = route[index + 1]!;
  return { latitude: a.latitude + (b.latitude - a.latitude) * local, longitude: a.longitude + (b.longitude - a.longitude) * local };
}

/** The part of a route already travelled, ending exactly at the courier. */
export function travelled(route: LatLng[], fraction: number): LatLng[] {
  const last = route.length - 1;
  const t = Math.min(1, Math.max(0, fraction)) * last;
  return [...route.slice(0, Math.floor(t) + 1), pointAlong(route, fraction)];
}

/** Minutes left at a campus delivery pace (bike or on foot, about 15 km/h), never below one. */
export function etaMinutes(remainingKm: number): number {
  return Math.max(1, Math.ceil((remainingKm / 15) * 60));
}

/** A region that fits all the points, with a little breathing room. */
export function regionFor(points: LatLng[], padding = 1.6) {
  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    latitudeDelta: Math.max(0.004, (maxLat - minLat) * padding),
    longitude: (minLon + maxLon) / 2,
    longitudeDelta: Math.max(0.004, (maxLon - minLon) * padding),
  };
}

/** Names a pinned spot: a campus place when it is within 80 m, otherwise "near" the closest one. */
export function describePin(center: LatLng, campusId: CampusId): { title: string; detail: string; place: Place } {
  const places = campusPlaces(campusId);
  let place = places[0]!;
  let best = Infinity;
  for (const candidate of places) {
    const metres = distanceKm(center, candidate.coordinate) * 1000;
    if (metres < best) {
      best = metres;
      place = candidate;
    }
  }
  return best <= 80
    ? { detail: place.detail, place, title: place.name }
    : { detail: `About ${Math.round(best / 10) * 10} m from ${place.name}`, place, title: `Pinned near ${place.name}` };
}
