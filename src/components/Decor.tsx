import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Polygon } from "react-native-svg";

import { ease, seeded } from "@/theme/motion";
import { color, corner } from "@/theme/tokens";

/**
 * Design elements for the app, kept in the brand's slate, mist and teal with a warm peach accent. Three kinds, used
 * where they fit (owner decision, 2026-10-20): soft drifting bubbles behind screens (`Backdrop`), diagonal accent bands
 * on banners and coupons (`Bands`, `Ticket`), and a branded header on receipts (`ReceiptBand`).
 */

export type BackdropTone = "mist" | "warm" | "ink";

const BUBBLES: Record<BackdropTone, readonly string[]> = {
  ink: ["rgba(31,47,57,0.09)", "rgba(183,196,204,0.30)", "rgba(55,99,113,0.10)"],
  mist: ["rgba(55,99,113,0.11)", "rgba(183,196,204,0.34)", "rgba(223,234,241,0.95)"],
  warm: ["rgba(233,196,150,0.30)", "rgba(250,243,234,1)", "rgba(183,196,204,0.28)"],
};

/** Where each bubble sits and how big it is, as a share of the screen width. */
const SHAPES = [
  { size: 0.7, x: -0.22, y: -0.2 },
  { size: 0.52, x: 0.62, y: -0.1 },
  { size: 0.24, x: 0.36, y: 0.2 },
] as const;

/** Which backdrop a route gets, so each area of the app has its own feel. */
export function toneForPath(path: string): BackdropTone {
  if (/(cart|activity|checkout|orders|order|receipt|voucher|promo)/.test(path)) return "warm";
  if (/(account|wallet|points|referral|subscriptions|safety|security)/.test(path)) return "ink";
  return "mist";
}

/** Soft circles that drift slowly behind a screen. They stay still with Reduce Motion. */
export function Backdrop({ tone = "mist" }: { tone?: BackdropTone }) {
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={styles.backdrop} testID="backdrop">
      {SHAPES.map((shape, index) => (
        <Bubble colour={BUBBLES[tone][index]!} index={index} key={index} shape={shape} width={width} />
      ))}
    </View>
  );
}

function Bubble({ colour, index, shape, width }: { colour: string; index: number; shape: (typeof SHAPES)[number]; width: number }) {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    const ms = 7_000 + seeded(index + 3) * 5_000;
    drift.set(withRepeat(withSequence(withTiming(1, { duration: ms, easing: ease.sine }), withTiming(0, { duration: ms, easing: ease.sine })), -1));
  }, [drift, index, reduced]);
  const reach = 14 + seeded(index + 11) * 16;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (drift.get() - 0.5) * reach * (index % 2 ? -1 : 1) }, { translateY: (drift.get() - 0.5) * reach * 0.8 }],
  }));
  const diameter = shape.size * width;
  return <Animated.View style={[{ backgroundColor: colour, borderRadius: diameter / 2, height: diameter, left: shape.x * width, top: shape.y * width, width: diameter, position: "absolute" }, style]} />;
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

/** The branded strip across the top of a receipt: slate with bands and a ring, so it reads as a Vossie receipt. */
export function ReceiptBand({ children, height = 56 }: { children?: ReactNode; height?: number }) {
  const [width, setWidth] = useState(360);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.band, { height }]}>
      <LinearGradient colors={["#40677A", "#2F5A67"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Bands colours={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.06)", "rgba(233,196,150,0.14)"]} height={height} width={width} />
      <View style={styles.bandRing} pointerEvents="none">
        <Rings size={height * 1.5} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  band: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", overflow: "hidden", paddingHorizontal: 16 },
  bandRing: { position: "absolute", right: -16, top: -10 },
  dashes: { borderColor: color.borderStrong, borderLeftWidth: 1.5, borderStyle: "dashed", flex: 1 },
  notch: { backgroundColor: color.background, borderRadius: 9, height: 18, left: -8, position: "absolute", width: 18, zIndex: 2 },
  perforation: { alignSelf: "stretch", width: 2 },
  stub: { alignItems: "center", gap: 2, justifyContent: "center", overflow: "hidden", paddingVertical: 12 },
  sweep: { bottom: -20, left: 0, position: "absolute", top: -20, width: 90 },
  ticket: { backgroundColor: color.surface, borderColor: color.border, borderCurve: "continuous", borderRadius: corner.lg, borderWidth: 1, boxShadow: "0 6px 16px rgba(30, 42, 56, 0.08)", flexDirection: "row", overflow: "hidden" },
  ticketBody: { flex: 1, padding: 12 },
  ticketDim: { opacity: 0.55 },
});
