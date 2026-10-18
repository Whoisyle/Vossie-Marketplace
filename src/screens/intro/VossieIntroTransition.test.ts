import {
  activeDotHopIndex,
  canSkipIntro,
  introTimeline,
  isIntroComplete,
  rangeProgress,
  wordmarkDotHopTargets,
} from "./VossieIntroTransition";
import { IntroPlaybackController } from "./IntroPlaybackController";

describe("Vossie cinematic intro timeline", () => {
  it("locks the approved eight-second choreography", () => {
    expect(introTimeline).toMatchObject({
      totalDurationMs: 8_000,
      nativeHandoff: [0, 600],
      dotPop: [600, 850],
      dotHopV: [850, 1_100],
      dotHopO: [1_100, 1_350],
      dotHopS1: [1_350, 1_600],
      dotHopS2: [1_600, 1_850],
      dotHopI: [1_850, 2_100],
      portalPrepare: [2_100, 2_500],
      portalExpand: [2_500, 3_400],
      whiteWordmarkReveal: [3_400, 4_600],
      brandHold: [4_600, 5_000],
      sharedLogoTransition: [5_000, 5_900],
      heading: [5_900, 6_350],
      descriptor: [6_150, 6_550],
      signInAction: [6_550, 7_000],
      footer: [7_150, 7_550],
      settle: [7_550, 8_000],
      skipEnabledAtMs: 1_500,
      skipDurationMs: 220,
      reducedMotionDurationMs: 250,
    });
  });

  it("pops after the splash handoff and lands on V, O, both Ss, then I", () => {
    const path = [
      introTimeline.dotPop,
      introTimeline.dotHopV,
      introTimeline.dotHopO,
      introTimeline.dotHopS1,
      introTimeline.dotHopS2,
      introTimeline.dotHopI,
    ];

    expect(path[0]![0]).toBe(introTimeline.nativeHandoff[1]);
    expect(path.map((range) => range[1] - range[0])).toEqual([
      250, 250, 250, 250, 250, 250,
    ]);
    path.slice(1).forEach((range, index) => {
      expect(range[0]).toBe(path[index]![1]);
    });
    expect(path[path.length - 1]![1]).toBe(introTimeline.portalPrepare[0]);
    expect(wordmarkDotHopTargets.map(({ letter }) => letter)).toEqual([
      "V", "O", "S1", "S2", "I",
    ]);
    const xOffsets = wordmarkDotHopTargets.map(({ translateX }) => translateX);
    expect(xOffsets).toEqual([...xOffsets].sort((a, b) => a - b));
    expect(wordmarkDotHopTargets[4]).toMatchObject({ translateX: 0, translateY: 0 });
  });

  it("keeps the pop separate from letter hops and selects each hop on [start, end)", () => {
    expect(activeDotHopIndex(599)).toBe(-1);
    expect(activeDotHopIndex(600)).toBe(-1);
    expect(activeDotHopIndex(849)).toBe(-1);

    const hops = [
      introTimeline.dotHopV,
      introTimeline.dotHopO,
      introTimeline.dotHopS1,
      introTimeline.dotHopS2,
      introTimeline.dotHopI,
    ];
    hops.forEach(([start, end], index) => {
      expect(activeDotHopIndex(start)).toBe(index);
      expect(activeDotHopIndex(end - 1)).toBe(index);
      expect(activeDotHopIndex(end)).toBe(index === hops.length - 1 ? -1 : index + 1);
    });

    expect(activeDotHopIndex(2_100)).toBe(-1);
    expect(activeDotHopIndex(2_499)).toBe(-1);
  });

  it("settles on the authored i-dot before the continuous portal preparation", () => {
    const lastHop = introTimeline.dotHopI;

    expect(rangeProgress(lastHop[0], lastHop)).toBe(0);
    expect(rangeProgress(lastHop[1], lastHop)).toBe(1);
    expect(lastHop[1]).toBe(introTimeline.portalPrepare[0]);
    expect(introTimeline.portalPrepare).toEqual([2_100, 2_500]);
    expect(introTimeline.portalExpand[0]).toBe(introTimeline.portalPrepare[1]);
  });

  it("stagger-reveals seven photographs every 80ms", () => {
    expect(introTimeline.gallery).toHaveLength(7);
    expect(introTimeline.gallery[0]).toEqual([5_900, 6_250]);
    expect(introTimeline.gallery[6]).toEqual([6_380, 6_730]);
    introTimeline.gallery.slice(1).forEach((range, index) => {
      expect(range[0] - introTimeline.gallery[index]![0]).toBe(80);
      expect(range[1] - range[0]).toBe(350);
    });
  });

  it("clamps segment progress at both boundaries", () => {
    expect(rangeProgress(99, [100, 200])).toBe(0);
    expect(rangeProgress(150, [100, 200])).toBe(0.5);
    expect(rangeProgress(201, [100, 200])).toBe(1);
  });

  it("enables skipping only after the first bounce and before completion", () => {
    expect(canSkipIntro(1_499)).toBe(false);
    expect(canSkipIntro(1_500)).toBe(true);
    expect(canSkipIntro(7_999)).toBe(true);
    expect(canSkipIntro(8_000)).toBe(false);
    expect(isIntroComplete(7_999)).toBe(false);
    expect(isIntroComplete(8_000)).toBe(true);
  });

  it("fast-forwards an eligible skip over the approved 220ms", () => {
    const controller = new IntroPlaybackController();

    expect(controller.getSkipPlan(1_499)).toBeNull();
    expect(controller.getSkipPlan(1_500)).toEqual({
      durationMs: 220,
      targetClockMs: 8_000,
    });
    expect(controller.getSkipPlan(8_000)).toBeNull();
  });

  it("uses a 250ms crossfade when reduced motion is enabled", () => {
    const controller = new IntroPlaybackController();

    expect(controller.getLaunchPlan(true)).toEqual({
      durationMs: 250,
      initialClockMs: 0,
      shouldAnimate: true,
    });
  });

  it("keeps controls disabled until the timeline completes", () => {
    const controller = new IntroPlaybackController();

    expect(controller.controlsAreInteractive(7_999)).toBe(false);
    expect(controller.controlsAreInteractive(8_000)).toBe(true);
  });

  it("does not replay in the same process but replays in a fresh process", () => {
    const currentProcess = new IntroPlaybackController();
    currentProcess.markComplete();

    expect(currentProcess.getLaunchPlan(false)).toEqual({
      durationMs: 0,
      initialClockMs: 8_000,
      shouldAnimate: false,
    });

    const freshProcess = new IntroPlaybackController();
    expect(freshProcess.getLaunchPlan(false)).toEqual({
      durationMs: 8_000,
      initialClockMs: 0,
      shouldAnimate: true,
    });
  });
});
