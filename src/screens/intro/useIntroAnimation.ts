import { useCallback, useEffect, useState } from "react";
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import {
  introTimeline,
} from "./VossieIntroTransition";
import { introProcessController } from "./IntroPlaybackController";

function readDevelopmentClockOverride(): number | null {
  if (!__DEV__) return null;
  const search = (
    globalThis as typeof globalThis & { location?: { search?: string } }
  ).location?.search;
  const rawValue = search?.match(/[?&]introDebugMs=(\d+)/)?.[1];
  if (!rawValue) return null;
  return Math.min(Number(rawValue), introTimeline.totalDurationMs);
}

export function useIntroAnimation() {
  const reducedMotion = useReducedMotion();
  const debugClockMs = readDevelopmentClockOverride();
  const launchPlan = introProcessController.getLaunchPlan(reducedMotion);
  const alreadyCompleted = debugClockMs === null && !launchPlan.shouldAnimate;
  const clock = useSharedValue(
    debugClockMs ?? launchPlan.initialClockMs,
  );
  const [canSkip, setCanSkip] = useState(
    debugClockMs === null
      ? false
      : introProcessController.getSkipPlan(debugClockMs) !== null,
  );
  const [isComplete, setIsComplete] = useState(
    debugClockMs === null
      ? introProcessController.controlsAreInteractive(launchPlan.initialClockMs)
      : introProcessController.controlsAreInteractive(debugClockMs),
  );

  const markSkippable = useCallback(() => setCanSkip(true), []);
  const markComplete = useCallback(() => {
    introProcessController.markComplete();
    setCanSkip(false);
    setIsComplete(true);
  }, []);

  useAnimatedReaction(
    () => ({
      complete: clock.get() >= introTimeline.totalDurationMs,
      skippable:
        !reducedMotion && clock.get() >= introTimeline.skipEnabledAtMs,
    }),
    (state, previous) => {
      if (state.skippable && !previous?.skippable) {
        scheduleOnRN(markSkippable);
      }
      if (state.complete && !previous?.complete) {
        scheduleOnRN(markComplete);
      }
    },
    [markComplete, markSkippable, reducedMotion],
  );

  useEffect(() => {
    if (alreadyCompleted || debugClockMs !== null) return;

    clock.set(
      withTiming(introTimeline.totalDurationMs, {
        duration: launchPlan.durationMs,
        easing: Easing.linear,
      }),
    );

    return () => cancelAnimation(clock);
  }, [alreadyCompleted, clock, debugClockMs, launchPlan.durationMs]);

  const skip = useCallback(() => {
    if (!canSkip || isComplete) return;
    const skipPlan = introProcessController.getSkipPlan(clock.get());
    if (!skipPlan) return;
    cancelAnimation(clock);
    clock.set(
      withTiming(skipPlan.targetClockMs, {
        duration: skipPlan.durationMs,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      }),
    );
  }, [canSkip, clock, isComplete]);

  return { canSkip, clock, isComplete, reducedMotion, skip };
}
