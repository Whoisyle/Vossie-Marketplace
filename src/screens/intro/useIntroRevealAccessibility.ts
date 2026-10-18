import { useCallback, useState } from "react";
import {
  useAnimatedReaction,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { introTimeline, type MotionRange } from "./VossieIntroTransition";

export function useIntroRevealAccessibility(
  clock: SharedValue<number>,
  range: MotionRange,
  reducedMotion: boolean,
) {
  const threshold = reducedMotion
    ? introTimeline.totalDurationMs
    : range[0];
  const [isRevealed, setIsRevealed] = useState(() =>
    clock.get() >= threshold,
  );
  const reveal = useCallback(() => setIsRevealed(true), []);

  useAnimatedReaction(
    () => {
      "worklet";
      return clock.get() >= threshold;
    },
    (visible, previous) => {
      if (visible && !previous) scheduleOnRN(reveal);
    },
    [reveal, threshold],
  );

  return isRevealed;
}
