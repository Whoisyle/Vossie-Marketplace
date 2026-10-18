import { campusCenter, campusPlaces, describePin, distanceKm, etaMinutes, pointAlong, regionFor, routeBetween, storeLocation, travelled } from "./geo";

describe("geo helpers", () => {
  it("puts a store near its campus, in the same place every time", () => {
    const first = storeLocation("campusbites", "potchefstroom");
    expect(storeLocation("campusbites", "potchefstroom")).toEqual(first);
    expect(distanceKm(first, campusCenter.potchefstroom)).toBeLessThan(0.7);
  });

  it("measures distance", () => {
    expect(distanceKm(campusCenter.pretoria, campusCenter.pretoria)).toBe(0);
    expect(distanceKm(campusCenter.pretoria, campusCenter["midrand-head-office"])).toBeGreaterThan(25);
  });

  it("builds a route that starts and ends where asked and can be walked along", () => {
    const from = campusCenter.potchefstroom;
    const to = campusPlaces("potchefstroom")[2]!.coordinate;
    const route = routeBetween(from, to);
    expect(route[0]).toEqual(from);
    expect(route.at(-1)!.latitude).toBeCloseTo(to.latitude, 8);
    expect(pointAlong(route, 0)).toEqual(from);
    expect(pointAlong(route, 1).longitude).toBeCloseTo(to.longitude, 8);
    const half = pointAlong(route, 0.5);
    const trail = travelled(route, 0.5);
    expect(trail.at(-1)).toEqual(half);
    expect(trail.length).toBeLessThan(route.length);
  });

  it("estimates minutes and never says zero", () => {
    expect(etaMinutes(0)).toBe(1);
    expect(etaMinutes(7.5)).toBe(30);
  });

  it("fits a region around points", () => {
    const region = regionFor([campusCenter.pretoria, campusCenter["midrand-head-office"]]);
    expect(region.latitudeDelta).toBeGreaterThan(0.2);
  });
});

describe("describePin", () => {
  it("names a campus place when the pin is on it and says 'near' when it is not", () => {
    const library = campusPlaces("potchefstroom")[2]!;
    expect(describePin(library.coordinate, "potchefstroom").title).toBe("Library");
    const off = { latitude: library.coordinate.latitude - 0.004, longitude: library.coordinate.longitude + 0.004 };
    expect(describePin(off, "potchefstroom").title).toMatch(/^Pinned near /);
  });
});
