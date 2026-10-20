import { useCallback, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { seeded, spring } from "@/theme/motion";

import type { WeekBar } from "@/seller/selectors";

import { SELLER } from "./ui";

/** A number that counts up to its value, and from the old value to a new one when it changes. Reduce Motion shows the value at once. */
export function useCountUp(target: number, duration = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (reduced) return;
    const from = current.current;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduced, target]);
  // with Reduce Motion the value is shown at once
  return reduced ? target : Math.round(value);
}

/** An amount in rand that counts up, such as the week's earnings. */
export function CountUpRand({ cents, style }: { cents: number; style?: object }) {
  const value = useCountUp(cents);
  return (
    <Text accessibilityLabel={formatRand(cents)} style={style}>
      {formatRand(value, { fixed: true })}
    </Text>
  );
}

/** The three-step bar at the top of the setup: the finished steps are full, the current one fills in as the page opens. */
export function StepBar({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View accessibilityLabel={`Step ${step} of ${total}`} accessibilityRole="progressbar" style={styles.steps}>
      {Array.from({ length: total }, (_, i) => (
        <StepSegment filled={i < step} key={i} order={i} />
      ))}
    </View>
  );
}

function StepSegment({ filled, order }: { filled: boolean; order: number }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(reduced ? (filled ? 1 : 0) : 0);
  useEffect(() => {
    fill.set(reduced ? (filled ? 1 : 0) : withDelay(order * 120, withTiming(filled ? 1 : 0, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [fill, filled, order, reduced]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.stepTrack}>
      <Animated.View style={[styles.stepFill, style]} />
    </View>
  );
}

const CONFETTI = ["#FFFFFF", "#FFE14A", "#B7C4CC", "#F2A14A", "#8FD9B8", "#FF8A7A"];

/** Pieces falling from the top: confetti when a seller is approved, coins when a withdrawal goes through. Plays once. */
export function Confetti({ count = 36, coins = false, play }: { play: boolean; count?: number; coins?: boolean }) {
  const { height, width } = useWindowDimensions();
  const reduced = useReducedMotion();
  if (!play || reduced) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="confetti">
      {Array.from({ length: count }, (_, i) => (
        <Piece coin={coins} height={height} index={i} key={i} width={width} />
      ))}
    </View>
  );
}

function Piece({ coin, height, index, width }: { coin: boolean; height: number; index: number; width: number }) {
  const fall = useSharedValue(0);
  const delay = seeded(index + 3) * 500;
  useEffect(() => {
    fall.set(withDelay(delay, withTiming(1, { duration: 1800 + seeded(index + 9) * 1200, easing: Easing.in(Easing.quad) })));
  }, [delay, fall, index]);
  const left = seeded(index + 1) * width;
  const sway = (seeded(index + 5) - 0.5) * 90;
  const spin = (seeded(index + 7) - 0.5) * 900;
  const size = coin ? 16 + seeded(index + 11) * 8 : 6 + seeded(index + 11) * 6;
  const style = useAnimatedStyle(() => ({
    opacity: fall.get() > 0.92 ? (1 - fall.get()) * 12 : 1,
    transform: [{ translateY: -30 + fall.get() * (height + 60) }, { translateX: Math.sin(fall.get() * 6 + index) * 20 + sway * fall.get() }, { rotate: `${fall.get() * spin}deg` }],
  }));
  return (
    <Animated.View
      style={[
        { backgroundColor: coin ? "#FFD84A" : CONFETTI[index % CONFETTI.length], borderRadius: coin ? size / 2 : 2, height: size * (coin ? 1 : 1.6), left, position: "absolute", top: 0, width: size },
        coin && styles.coin,
        style,
      ]}
    />
  );
}

/** A gentle left-right shake, used when a seller declines an order. Returns the style to apply and a function that plays it. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const play = useCallback(() => {
    haptic.error();
    x.set(withSequence(withTiming(-9, { duration: 50 }), withTiming(9, { duration: 70 }), withTiming(-6, { duration: 70 }), withTiming(4, { duration: 60 }), withSpring(0, spring.snappy)));
  }, [x]);
  return { play, style };
}

const KNOB = 48;

/**
 * Slide to confirm: drag the knob along the track to accept. Letting go early springs it back; past the far end it
 * ticks and confirms. Screen readers get a plain "activate" action instead of a drag.
 */
export function SlideToConfirm({ label = "Slide to accept", onConfirm, testID }: { label?: string; onConfirm: () => void; testID?: string }) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const done = useSharedValue(0);
  const max = Math.max(0, width - KNOB - 8);
  const confirm = useCallback(() => {
    haptic.success();
    onConfirm();
  }, [onConfirm]);
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      x.set(Math.min(max, Math.max(0, event.translationX)));
    })
    .onEnd(() => {
      if (x.get() > max * 0.8) {
        x.set(withTiming(max, { duration: 120 }));
        done.set(withTiming(1, { duration: 200 }));
        confirm();
      } else {
        x.set(withSpring(0, spring.snappy));
      }
    })
    .runOnJS(true);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const fill = useAnimatedStyle(() => ({ width: x.get() + KNOB + 4 }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, x.get() / (max * 0.6 || 1)) }));
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return (
    <View
      accessibilityActions={[{ label: "Accept", name: "activate" }]}
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") confirm();
      }}
      onLayout={onLayout}
      style={styles.track}
      testID={testID}
    >
      <Animated.View style={[styles.trackFill, fill]} />
      <Animated.Text style={[styles.trackLabel, labelStyle]}>{label}</Animated.Text>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knob]}>
          <Icon color={SELLER.solid} name="chevrons-right" size={22} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const BAR_COLOUR = "#566C9C";

/** The week's sales as bars that grow in one after the other. Today's bar is lighter. Each bar says what it is for screen readers. */
export function BarChart({ bars, height = 150 }: { bars: WeekBar[]; height?: number }) {
  const max = Math.max(1, ...bars.map((bar) => bar.cents));
  return (
    <View accessibilityLabel={`Sales for the last seven days. ${bars.map((bar) => `${bar.label} ${formatRand(bar.cents)}`).join(", ")}`} accessibilityRole="image" style={[styles.chart, { height: height + 28 }]} testID="week-chart">
      {bars.map((bar, i) => (
        <ChartBar bar={bar} height={height} index={i} key={`${bar.label}-${i}`} max={max} />
      ))}
    </View>
  );
}

function ChartBar({ bar, height, index, max }: { bar: WeekBar; height: number; index: number; max: number }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    grow.set(reduced ? 1 : withDelay(150 + index * 90, withSpring(1, spring.soft)));
  }, [grow, index, reduced]);
  const target = Math.max(6, (bar.cents / max) * height);
  const style = useAnimatedStyle(() => ({ height: target * grow.get() }));
  return (
    <View style={styles.barColumn}>
      <View style={[styles.barSlot, { height }]}>
        <Animated.View style={[styles.bar, { backgroundColor: bar.isToday ? "#7F96C8" : BAR_COLOUR }, style]} />
      </View>
      <Text style={[styles.barLabel, bar.isToday && styles.barLabelToday]}>{bar.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderRadius: 12, width: "100%" },
  barColumn: { alignItems: "center", flex: 1, gap: 6 },
  barLabel: { color: SELLER.inkSoft, fontSize: 12, fontWeight: "600" },
  barLabelToday: { color: SELLER.ink, fontWeight: "900" },
  barSlot: { justifyContent: "flex-end", width: "74%" },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 6 },
  coin: { borderColor: "#E0AE2C", borderWidth: 2 },
  knob: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: KNOB / 2, height: KNOB, justifyContent: "center", left: 4, position: "absolute", top: 4, width: KNOB },
  stepFill: { backgroundColor: "#FFFFFF", borderRadius: 3, height: 5 },
  stepTrack: { backgroundColor: "rgba(255,255,255,0.28)", borderRadius: 3, flex: 1, height: 5, overflow: "hidden" },
  steps: { flexDirection: "row", gap: 6 },
  track: { backgroundColor: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.3)", borderRadius: 30, borderWidth: 1, height: KNOB + 8, justifyContent: "center", overflow: "hidden" },
  trackFill: { backgroundColor: "rgba(255,255,255,0.28)", borderRadius: 30, bottom: 0, left: 0, position: "absolute", top: 0 },
  trackLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", textAlign: "center" },
});
