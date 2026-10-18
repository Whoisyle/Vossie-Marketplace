export type MotionRange = readonly [startMs: number, endMs: number];

export type IntroTimeline = {
  totalDurationMs: number;
  nativeHandoff: MotionRange;
  dotPop: MotionRange;
  dotHopV: MotionRange;
  dotHopO: MotionRange;
  dotHopS1: MotionRange;
  dotHopS2: MotionRange;
  dotHopI: MotionRange;
  portalPrepare: MotionRange;
  portalExpand: MotionRange;
  whiteWordmarkReveal: MotionRange;
  brandHold: MotionRange;
  sharedLogoTransition: MotionRange;
  heading: MotionRange;
  descriptor: MotionRange;
  signInAction: MotionRange;
  footer: MotionRange;
  gallery: readonly MotionRange[];
  settle: MotionRange;
  skipEnabledAtMs: number;
  skipDurationMs: number;
  reducedMotionDurationMs: number;
};

export const introTimeline: IntroTimeline = {
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
  gallery: Array.from({ length: 7 }, (_, index) => {
    const startMs = 5_900 + index * 80;
    return [startMs, startMs + 350] as const;
  }),
  settle: [7_550, 8_000],
  skipEnabledAtMs: 1_500,
  skipDurationMs: 220,
  reducedMotionDurationMs: 250,
};

/**
 * Per-letter dot landing offsets relative to its original SVG anchor.
 * Letter centers and cap tops come from the path transforms in the canonical
 * assets/branding/vossie-wordmark.svg. Each landing touches the top of its
 * glyph; I returns to the exact authored dot placement instead.
 */
export const wordmarkDotHopTargets = [
  { letter: "V", translateX: 212 - 1164.7836 - 104.4415 / 2, translateY: 135.823 - 99.3433 - 23.9032 },
  { letter: "O", translateX: 530.25 - 1164.7836 - 104.4415 / 2, translateY: 122.75 - 99.3433 - 23.9032 },
  { letter: "S1", translateX: 818.9375 - 1164.7836 - 104.4415 / 2, translateY: 125.625 - 99.3433 - 23.9032 },
  { letter: "S2", translateX: 1108 - 1164.7836 - 104.4415 / 2, translateY: 143 - 99.3433 - 23.9032 },
  { letter: "I", translateX: 0, translateY: 0 },
] as const;

export const BRAND_BLUE = "#29475B";

export const splashReference = {
  height: 2796,
  logo: { height: 280, left: 240, top: 1287, width: 810 },
  width: 1290,
} as const;

/**
 * Welcome layout canvas. Coordinates were measured from the 2026-10-18
 * owner reference (welcome/assets/reference-screen/vossie-welcome-2026-10-18.png)
 * and mapped onto this 852x1846 frame. The intro wordmark lands on `logo`.
 */
export const welcomeReference = {
  height: 1846,
  logo: { height: 176, left: 171, top: 783, width: 509 },
  width: 852,
} as const;

export type FrameMetrics = {
  height: number;
  left: number;
  scale: number;
  top: number;
  width: number;
};

export function measureReferenceFrame(
  viewportWidth: number,
  viewportHeight: number,
  referenceWidth: number,
  referenceHeight: number,
): FrameMetrics {
  const scale = Math.min(
    viewportWidth / referenceWidth,
    viewportHeight / referenceHeight,
  );
  const width = referenceWidth * scale;
  const height = referenceHeight * scale;

  return {
    height,
    left: (viewportWidth - width) / 2,
    scale,
    top: (viewportHeight - height) / 2,
    width,
  };
}

export function rangeProgress(valueMs: number, range: MotionRange): number {
  "worklet";
  const [startMs, endMs] = range;
  if (valueMs <= startMs) return 0;
  if (valueMs >= endMs) return 1;
  return (valueMs - startMs) / (endMs - startMs);
}

/** Returns the active letter hop, excluding the pop-in and settled phases. */
export function activeDotHopIndex(valueMs: number): number {
  "worklet";
  const ranges: readonly MotionRange[] = [
    introTimeline.dotHopV,
    introTimeline.dotHopO,
    introTimeline.dotHopS1,
    introTimeline.dotHopS2,
    introTimeline.dotHopI,
  ];

  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]!;
    if (valueMs >= range[0] && valueMs < range[1]) return index;
  }

  return -1;
}

export function isIntroComplete(valueMs: number): boolean {
  return valueMs >= introTimeline.totalDurationMs;
}

export function canSkipIntro(valueMs: number): boolean {
  return valueMs >= introTimeline.skipEnabledAtMs && !isIntroComplete(valueMs);
}
