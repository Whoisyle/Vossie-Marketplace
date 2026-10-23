import {
  canSkipIntro,
  introTimeline,
  isIntroComplete,
} from "./VossieIntroTransition";

export type IntroPlaybackPlan = {
  durationMs: number;
  initialClockMs: number;
  shouldAnimate: boolean;
};

export type IntroSkipPlan = {
  durationMs: number;
  targetClockMs: number;
};

export class IntroPlaybackController {
  private completedThisProcess: boolean;
  private readonly onComplete?: () => void;

  constructor(completedThisProcess = false, onComplete?: () => void) {
    this.completedThisProcess = completedThisProcess;
    this.onComplete = onComplete;
  }

  getLaunchPlan(reducedMotion: boolean): IntroPlaybackPlan {
    if (this.completedThisProcess) {
      return {
        durationMs: 0,
        initialClockMs: introTimeline.totalDurationMs,
        shouldAnimate: false,
      };
    }

    return {
      durationMs: reducedMotion
        ? introTimeline.reducedMotionDurationMs
        : introTimeline.totalDurationMs,
      initialClockMs: 0,
      shouldAnimate: true,
    };
  }

  getSkipPlan(clockMs: number): IntroSkipPlan | null {
    if (!canSkipIntro(clockMs)) return null;
    return {
      durationMs: introTimeline.skipDurationMs,
      targetClockMs: introTimeline.totalDurationMs,
    };
  }

  controlsAreInteractive(clockMs: number): boolean {
    return isIntroComplete(clockMs);
  }

  markComplete(): void {
    this.completedThisProcess = true;
    this.onComplete?.();
  }
}

// On the web build the opening animation plays once per browser; returning
// visitors go straight to Welcome. Native keeps playing it every launch.
const INTRO_SEEN_KEY = "vossie.introSeen";

function webStorage(): Storage | null {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

const isWeb = typeof document !== "undefined";

export const introProcessController = new IntroPlaybackController(
  isWeb && webStorage()?.getItem(INTRO_SEEN_KEY) === "1",
  isWeb
    ? () => {
        try {
          webStorage()?.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          // storage blocked (private window): the intro just plays again next time
        }
      }
    : undefined,
);
