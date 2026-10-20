import { useCallback, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { Icon } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

import { SELLER, Text } from "./ui";

const KNOB = 52;
const PAD = 4;

/**
 * A big white pill with a round knob: drag the knob across to go on. Letting go early springs it back; past about three
 * quarters it carries on to the end by itself, the label fades, a tick shows, and `onComplete` runs. With `resetAfter` the
 * knob returns afterwards (for a button that opens something and then waits). A hint chevron nudges the knob while it rests,
 * and a screen reader can activate it without dragging.
 */
export function SlidePill({ dark = false, disabled = false, label, onComplete, resetAfter = false, testID }: { label: string; onComplete: () => void; resetAfter?: boolean; testID?: string; /** A dark track with a white knob, for the courier app. */ dark?: boolean; /** Locked: the knob does not move and the pill is dimmed. */ disabled?: boolean }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const done = useSharedValue(0);
  const hint = useSharedValue(0);
  const max = Math.max(0, width - KNOB - PAD * 2);

  const finish = useCallback(() => {
    haptic.success();
    onComplete();
    if (resetAfter) {
      x.set(withDelay(700, withSpring(0, spring.snappy)));
      done.set(withDelay(700, withTiming(0, { duration: 200 })));
    }
  }, [done, onComplete, resetAfter, x]);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
    if (!reduced) hint.set(withRepeat(withSequence(withDelay(1400, withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 420 })), -1));
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      x.set(Math.min(max, Math.max(0, event.translationX)));
    })
    .onEnd(() => {
      if (x.get() > max * 0.75) {
        x.set(withTiming(max, { duration: 140 }));
        done.set(withTiming(1, { duration: 220 }));
        finish();
      } else {
        x.set(withSpring(0, spring.snappy));
      }
    })
    .runOnJS(true);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() + hint.get() * Math.min(10, max * 0.04) }] }));
  const fill = useAnimatedStyle(() => ({ width: x.get() + KNOB + PAD * 2 }));
  const text = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, x.get() / (max * 0.55 || 1)), transform: [{ translateX: interpolate(x.get(), [0, max || 1], [0, 16]) }] }));
  const tick = useAnimatedStyle(() => ({ opacity: done.get(), transform: [{ scale: 0.6 + done.get() * 0.4 }] }));
  const arrow = useAnimatedStyle(() => ({ opacity: 1 - done.get() }));

  return (
    <View
      accessibilityActions={[{ label, name: "activate" }]}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate" && !disabled) finish();
      }}
      onLayout={onLayout}
      style={[styles.track, dark && styles.trackDark, disabled && styles.trackLocked]}
      testID={testID}
    >
      <Animated.View style={[styles.fill, fill]} />
      <Animated.View pointerEvents="none" style={[styles.labelWrap, text]}>
        <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, dark && styles.knobDark, knob]}>
          <Animated.View style={[styles.knobIcon, arrow]}>
            <Icon color={dark ? "#3B6370" : "#FFFFFF"} name="chevrons-right" size={24} />
          </Animated.View>
          <Animated.View style={[styles.knobIcon, tick]}>
            <Icon color={dark ? "#3B6370" : "#FFFFFF"} name="check" size={24} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: "rgba(56,96,111,0.16)", borderRadius: 34, bottom: 0, left: 0, position: "absolute", top: 0 },
  knob: { alignItems: "center", backgroundColor: SELLER.solid, borderRadius: KNOB / 2, boxShadow: "0 4px 10px rgba(20,35,44,0.35)", height: KNOB, justifyContent: "center", left: PAD, position: "absolute", top: PAD, width: KNOB },
  knobIcon: { alignItems: "center", height: KNOB, justifyContent: "center", position: "absolute", width: KNOB },
  knobDark: { backgroundColor: "#FFFFFF" },
  label: { color: "#6C8A95", fontSize: 18, fontWeight: "700" },
  labelDark: { color: "#FFFFFF" },
  labelWrap: { alignItems: "center", bottom: 0, justifyContent: "center", left: KNOB + PAD, position: "absolute", right: PAD * 2, top: 0 },
  trackDark: { backgroundColor: "#3B6370" },
  trackLocked: { opacity: 0.55 },
  track: { backgroundColor: "#FFFFFF", borderRadius: 34, boxShadow: "0 8px 20px rgba(10,26,34,0.3)", height: KNOB + PAD * 2, justifyContent: "center", overflow: "hidden" },
});
