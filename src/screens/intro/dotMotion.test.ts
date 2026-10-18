import { hopLift, hopRun, hopScales, landingSquash, settleWobble, smooth } from "./dotMotion";

describe("dot motion curves", () => {
  it("lifts on a parabola that starts and ends on the letter", () => {
    expect(hopLift(0, 20)).toBeCloseTo(0);
    expect(hopLift(1, 20)).toBeCloseTo(0);
    expect(hopLift(0.5, 20)).toBeCloseTo(-20);
    expect(hopLift(0.25, 20)).toBeCloseTo(hopLift(0.75, 20));
  });

  it("moves sideways at a constant speed except on the last hop", () => {
    expect(hopRun(0.25, false)).toBeCloseTo(0.25);
    expect(hopRun(0.5, false)).toBeCloseTo(0.5);
    expect(hopRun(0.5, true)).toBeGreaterThan(0.5);
    expect(hopRun(1, true)).toBeCloseTo(1);
  });

  it("squashes only near contact and never while in the air", () => {
    expect(landingSquash(0.5, true)).toBe(0);
    expect(landingSquash(1, false)).toBeCloseTo(1);
    expect(landingSquash(0, true)).toBeCloseTo(1);
    expect(landingSquash(0, false)).toBe(0);
    expect(landingSquash(0.95, false)).toBeGreaterThan(landingSquash(0.85, false));
  });

  it("keeps the dot's area roughly constant while squashing", () => {
    for (const p of [0, 0.1, 0.5, 0.9, 1]) {
      const { x, y } = hopScales(p, true);
      expect(x * y).toBeGreaterThan(0.85);
      expect(x * y).toBeLessThan(1.15);
    }
  });

  it("is continuous across the landing into the next takeoff", () => {
    const landing = hopScales(1, true);
    const takeoff = hopScales(0, true);
    expect(landing.x).toBeCloseTo(takeoff.x);
    expect(landing.y).toBeCloseTo(takeoff.y);
  });

  it("settles to rest", () => {
    expect(settleWobble(0, 10)).toBe(0);
    expect(Math.abs(settleWobble(1, 10))).toBeLessThan(0.1);
    expect(settleWobble(0.12, 10)).toBeLessThan(0);
  });

  it("smooth ramps between 0 and 1", () => {
    expect(smooth(-1)).toBe(0);
    expect(smooth(2)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5);
  });
});
