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

  constructor(completedThisProcess = false) {
    this.completedThisProcess = completedThisProcess;
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
  }
}

export const introProcessController = new IntroPlaybackController();
