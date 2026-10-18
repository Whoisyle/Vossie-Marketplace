import { campuses } from "@/data/mock/catalog";
import { demoReducer, createInitialState } from "@/state/demoReducer";

import { filterCampuses } from "./CampusPicker";

describe("filterCampuses", () => {
  it("returns everything for an empty search", () => {
    expect(filterCampuses(campuses, "  ")).toHaveLength(campuses.length);
  });

  it("matches the name or the province without caring about case", () => {
    expect(filterCampuses(campuses, "PRETORIA").map((campus) => campus.id)).toEqual(["pretoria"]);
    expect(filterCampuses(campuses, "western cape").length).toBe(2);
    expect(filterCampuses(campuses, "nowhere")).toEqual([]);
  });
});

describe("sign in with the mock student record", () => {
  it("gives a new student their number and campus, and keeps the number for a returning one", () => {
    const fresh = demoReducer(createInitialState(), { email: "brand.new@vossie.net", type: "signIn" });
    expect(fresh.isNewUser).toBe(true);
    expect(fresh.profile?.studentNumber).toMatch(/^\d{9}$/);

    const returning = demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
    expect(returning.isNewUser).toBe(false);
    expect(returning.profile?.studentNumber).toMatch(/^\d{9}$/);
  });
});
