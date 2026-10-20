import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path, Polygon } from "react-native-svg";

import { ease, seeded } from "@/theme/motion";
import { color, corner } from "@/theme/tokens";

/**
 * Design elements for the app, kept in the brand's slate, mist and teal with a warm peach accent. Three kinds, used
 * where they fit (owner decision, 2026-10-20): soft drifting bubbles behind screens (`Backdrop`), diagonal accent bands
 * on banners and coupons (`Bands`, `Ticket`), and a branded header on receipts (`ReceiptBand`).
 */

export type BackdropTone = "mist" | "warm" | "ink";

/** Line colour and the wash behind it, per area of the app. */
const LOOK: Record<BackdropTone, { line: string; wash: string }> = {
  ink: { line: "rgba(31,47,57,0.13)", wash: "rgba(55,99,113,0.10)" },
  mist: { line: "rgba(55,99,113,0.16)", wash: "rgba(183,196,204,0.28)" },
  warm: { line: "rgba(190,128,62,0.20)", wash: "rgba(250,236,214,0.75)" },
};

/** Which backdrop a route gets, so each area of the app has its own feel. */
export function toneForPath(path: string): BackdropTone {
  if (/(cart|activity|checkout|orders|order|receipt|voucher|promo)/.test(path)) return "warm";
  if (/(account|wallet|points|referral|subscriptions|safety|security)/.test(path)) return "ink";
  return "mist";
}

/** One closed, wobbly contour line around a centre, like a ring on a map, as an SVG path. */
export function contourPath(cx: number, cy: number, radius: number, seed: number): string {
  const steps = 72;
  const a = seeded(seed) * 6.28;
  const b = seeded(seed + 9) * 6.28;
  const points = Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    const r = radius * (1 + 0.09 * Math.sin(3 * t + a) + 0.05 * Math.sin(5 * t + b) + 0.03 * Math.sin(8 * t + a * b));
    return `${i === 0 ? "M" : "L"}${(cx + Math.cos(t) * r).toFixed(1)} ${(cy + Math.sin(t) * r * 0.86).toFixed(1)}`;
  });
  return `${points.join(" ")} Z`;
}

/**
 * Flowing topographic contour lines behind a screen, in a different colour for each area, over a faint wash that fades
 * out down the page. The two groups of lines drift slowly in opposite directions; they stay still with Reduce Motion.
 */
export function Backdrop({ tone = "mist" }: { tone?: BackdropTone }) {
  const { width } = useWindowDimensions();
  const look = LOOK[tone];
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    drift.set(withRepeat(withSequence(withTiming(1, { duration: 14_000, easing: ease.sine }), withTiming(0, { duration: 14_000, easing: ease.sine })), -1));
  }, [drift, reduced]);
  const one = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.get() - 0.5) * 26 }, { translateY: (drift.get() - 0.5) * 14 }, { rotate: `${(drift.get() - 0.5) * 4}deg` }] }));
  const two = useAnimatedStyle(() => ({ transform: [{ translateX: (drift.get() - 0.5) * -22 }, { translateY: (drift.get() - 0.5) * -10 }, { rotate: `${(drift.get() - 0.5) * -3}deg` }] }));
  const height = 330;
  const rings = (cx: number, cy: number, count: number, base: number, step: number, seed: number) =>
    Array.from({ length: count }, (_, k) => <Path d={contourPath(cx, cy, base + k * step, seed + k)} fill="none" key={k} stroke={look.line} strokeWidth={1.3} />);
  return (
    <View pointerEvents="none" style={styles.backdrop} testID="backdrop">
      <LinearGradient colors={[look.wash, "rgba(255,255,255,0)"]} style={{ height, left: 0, position: "absolute", right: 0, top: 0 }} />
      <Animated.View style={[{ height, left: 0, position: "absolute", top: 0, width }, one]}>
        <Svg height={height} width={width}>
          {rings(width * 0.92, 20, 9, 34, 26, 1)}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ height, left: 0, position: "absolute", top: 0, width }, two]}>
        <Svg height={height} width={width}>
          {rings(width * 0.04, 150, 6, 30, 24, 40)}
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Diagonal bands across a surface, in the given translucent colours. Used on banners, coupons and tier cards. */
export function Bands({ colours, height, width }: { colours: readonly string[]; width: number; height: number }) {
  const step = width * 0.2;
  return (
    <Svg height={height} pointerEvents="none" style={StyleSheet.absoluteFill} width={width}>
      {colours.map((fill, i) => {
        const x = width * 0.32 + i * step * 0.8;
        return <Polygon fill={fill} key={i} points={`${x},0 ${x + step},0 ${x + step - height * 0.55},${height} ${x - height * 0.55},${height}`} />;
      })}
    </Svg>
  );
}

/** A ring and a few dots: the quiet pattern behind a product photo. */
export function Rings({ colour = "rgba(255,255,255,0.22)", size }: { colour?: string; size: number }) {
  return (
    <Svg height={size} pointerEvents="none" width={size}>
      <Circle cx={size / 2} cy={size / 2} fill="none" r={size * 0.48} stroke={colour} strokeWidth={1.5} />
      <Circle cx={size / 2} cy={size / 2} fill="none" r={size * 0.36} stroke={colour} strokeDasharray="2 7" strokeWidth={2} />
    </Svg>
  );
}

const STUB = 92;

/**
 * A coupon: a coloured stub on the left (bands and the discount) joined to the body by a perforated edge with a
 * notch top and bottom. A light sweep crosses it once when it appears.
 */
export function Ticket({ children, dim = false, stub, stubColours = ["#40677A", "#2F5A67"], testID }: { children: ReactNode; stub: ReactNode; stubColours?: readonly [string, string]; dim?: boolean; testID?: string }) {
  const reduced = useReducedMotion();
  const [bodyWidth, setBodyWidth] = useState(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduced || dim || bodyWidth === 0) return;
    sweep.set(withDelay(350, withTiming(1, { duration: 1100, easing: ease.out })));
  }, [bodyWidth, dim, reduced, sweep]);
  const sweepStyle = useAnimatedStyle(() => ({ opacity: sweep.get() > 0 && sweep.get() < 1 ? 1 : 0, transform: [{ translateX: -120 + sweep.get() * (bodyWidth + STUB + 240) }, { rotate: "18deg" }] }));
  const onLayout = (event: LayoutChangeEvent) => setBodyWidth(event.nativeEvent.layout.width);
  return (
    <View onLayout={onLayout} style={[styles.ticket, dim && styles.ticketDim]} testID={testID}>
      <View style={[styles.stub, { width: STUB }]}>
        <LinearGradient colors={stubColours} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <Bands colours={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.07)"]} height={110} width={STUB + 30} />
        {stub}
      </View>
      <View style={styles.perforation} pointerEvents="none">
        <View style={[styles.notch, { top: -9 }]} />
        <View style={styles.dashes} />
        <View style={[styles.notch, { bottom: -9 }]} />
      </View>
      <View style={styles.ticketBody}>{children}</View>
      <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]}>
        <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** A gradient panel with diagonal bands and a ring: the common surface for tier cards, plan headers and receipts. */
export function BandPanel({
  bands = ["rgba(255,255,255,0.09)", "rgba(255,255,255,0.06)", "rgba(233,196,150,0.14)"],
  children,
  colours = ["#40677A", "#2F5A67"],
  ring = true,
  style,
}: {
  children?: ReactNode;
  colours?: readonly [string, string];
  bands?: readonly string[];
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [box, setBox] = useState({ height: 80, width: 360 });
  return (
    <View onLayout={(event) => setBox({ height: event.nativeEvent.layout.height, width: event.nativeEvent.layout.width })} style={[styles.panel, style]}>
      <LinearGradient colors={colours} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Bands colours={bands} height={box.height} width={box.width} />
      {ring ? (
        <View pointerEvents="none" style={styles.panelRing}>
          <Rings size={Math.max(90, box.height * 1.4)} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** The branded strip across the top of a receipt: slate with bands and a ring, so it reads as a Vossie receipt. */
export function ReceiptBand({ children, height = 56 }: { children?: ReactNode; height?: number }) {
  return <BandPanel style={{ alignItems: "center", flexDirection: "row", height, justifyContent: "space-between", paddingHorizontal: 16 }}>{children}</BandPanel>;
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  panel: { overflow: "hidden" },
  panelRing: { position: "absolute", right: -18, top: -14 },
  dashes: { borderColor: color.borderStrong, borderLeftWidth: 1.5, borderStyle: "dashed", flex: 1 },
  notch: { backgroundColor: color.background, borderRadius: 9, height: 18, left: -8, position: "absolute", width: 18, zIndex: 2 },
  perforation: { alignSelf: "stretch", width: 2 },
  stub: { alignItems: "center", gap: 2, justifyContent: "center", overflow: "hidden", paddingVertical: 12 },
  sweep: { bottom: -20, left: 0, position: "absolute", top: -20, width: 90 },
  ticket: { backgroundColor: color.surface, borderColor: color.border, borderCurve: "continuous", borderRadius: corner.lg, borderWidth: 1, boxShadow: "0 6px 16px rgba(30, 42, 56, 0.08)", flexDirection: "row", overflow: "hidden" },
  ticketBody: { flex: 1, padding: 12 },
  ticketDim: { opacity: 0.55 },
});
