import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

import { Wordmark } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

/** The Vossie brand, as used on the packaging. The logo is the app's own wordmark colour. */
const BRAND = {
  facet: "#A9B8C0",
  front: "#DCE0E1",
  ink: "#29475B",
  inside: "#6F8189",
  insideDark: "#5C6E76",
  side: "#B9C2C7",
  sage: "#DFE2DC",
  slate: "#586879",
  steel: "#8B9DA6",
  teal: "#376371",
  top: "#EEF1F1",
  white: "#F4F5F2",
} as const;
const SANS = "Arial, Helvetica, sans-serif";

/** The scene is drawn on a 360 x 330 canvas and scaled to fit. */
export const SCENE = { height: 330, width: 360 } as const;

type Side = "A" | "B";
/** Where each box sits on the canvas and how big it is drawn. Box B stands behind and to the right of box A. */
const BOX = {
  A: { k: 0.86, x: 14, y: 190 },
  B: { k: 0.72, x: 190, y: 140 },
} as const;
const BOX_W = 224;
const BOX_H = 142;

type Product = "notepad" | "meal" | "cup" | "cupLight" | "mealTall";
type Spec = {
  kind: Product;
  box: Side;
  w: number;
  h: number;
  /** Top-left of the product while it is still in the box. */
  home: { x: number; y: number };
  /** Top-left, and tilt, once it has jumped out and is floating. */
  float: { x: number; y: number; rot: number };
  /** How far it rises while the lid is ajar on the second slide. */
  peek: number;
  /** Milliseconds after the bang that this one leaves the box. */
  delay: number;
};

const PRODUCTS: Spec[] = [
  { box: "A", delay: 0, float: { rot: -12, x: 10, y: 78 }, h: 88, home: { x: 44, y: 215 }, kind: "notepad", peek: 22, w: 66 },
  { box: "A", delay: 120, float: { rot: 6, x: 112, y: 8 }, h: 82, home: { x: 118, y: 215 }, kind: "cup", peek: 26, w: 54 },
  { box: "A", delay: 240, float: { rot: 5, x: 88, y: 98 }, h: 74, home: { x: 74, y: 215 }, kind: "meal", peek: 0, w: 92 },
  { box: "B", delay: 80, float: { rot: -8, x: 196, y: 4 }, h: 82, home: { x: 232, y: 160 }, kind: "cupLight", peek: 24, w: 54 },
  { box: "B", delay: 200, float: { rot: -6, x: 250, y: 80 }, h: 82, home: { x: 262, y: 160 }, kind: "mealTall", peek: 14, w: 80 },
];

const BANG_AT_MS = 850;
const GO_MS = 1100;
const FLIGHT_MS = 760;

// ------------------------------------------------------------------ drawings

function BoxBack() {
  return (
    <Svg height="100%" viewBox={`0 0 ${BOX_W} ${BOX_H}`} width="100%">
      <Polygon fill={BRAND.inside} points="0,40 160,60 222,28 62,8" />
      <Polygon fill={BRAND.insideDark} points="62,8 222,28 222,44 62,24" />
    </Svg>
  );
}

function BoxFront({ k }: { k: number }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg height="100%" viewBox={`0 0 ${BOX_W} ${BOX_H}`} width="100%">
        <Polygon fill={BRAND.front} points="0,40 160,60 160,138 0,114" />
        <Polygon fill={BRAND.side} points="160,60 160,138 222,104 222,28" />
        <Polygon fill={BRAND.facet} opacity={0.9} points="0,40 56,47 0,92" />
        <Polygon fill={BRAND.facet} opacity={0.75} points="160,60 110,54 160,104" />
        <Polygon fill={BRAND.steel} opacity={0.55} points="160,60 222,28 222,68" />
      </Svg>
      <View pointerEvents="none" style={{ left: 34 * k, position: "absolute", top: 76 * k, transform: [{ skewY: "7.1deg" }] }}>
        <Wordmark width={92 * k} />
      </View>
    </View>
  );
}

function BoxLid() {
  return (
    <Svg height="100%" viewBox={`0 0 ${BOX_W} ${BOX_H}`} width="100%">
      <Polygon fill={BRAND.top} points="0,40 160,60 222,28 62,8" />
      <Polygon fill="rgba(25,27,29,0.13)" points="30,24 190,44 194,48 34,28" />
      <Polygon fill={BRAND.facet} opacity={0.5} points="0,40 62,8 90,12 30,44" />
    </Svg>
  );
}

function Drawing({ kind, w, h }: { kind: Product; w: number; h: number }) {
  if (kind === "notepad") {
    return (
      <View style={{ height: h, width: w }}>
        <Svg height={h} viewBox="0 0 66 88" width={w}>
          <Rect fill={BRAND.sage} height={78} rx={5} width={56} x={9} y={9} />
          <Rect fill={BRAND.teal} height={78} rx={5} width={56} x={4} y={6} />
          <Polygon fill="#4E7E8D" points="4,62 60,84 60,84 9,84 4,84" opacity={0.0} />
          <Polygon fill="#4E7E8D" opacity={0.6} points="60,6 60,36 34,6" />
          {[12, 20, 28, 36, 44, 52].map((cx) => (
            <Circle cx={cx} cy={8} fill={BRAND.steel} key={cx} r={3.2} />
          ))}
        </Svg>
        <View pointerEvents="none" style={{ left: 11, position: "absolute", top: 40 }}>
          <Wordmark tone="white" width={42} />
        </View>
      </View>
    );
  }
  if (kind === "cup" || kind === "cupLight") {
    const body = kind === "cup" ? BRAND.sage : BRAND.white;
    return (
      <Svg height={h} viewBox="0 0 54 82" width={w}>
        <Rect fill={BRAND.slate} height={9} rx={3} width={46} x={4} y={4} />
        <Rect fill={BRAND.steel} height={6} rx={3} width={36} x={9} y={0} />
        <Polygon fill={body} points="7,13 47,13 41,78 13,78" />
        <Polygon fill={BRAND.teal} points="9,34 45,34 43,58 11,58" />
        <Polygon fill={BRAND.facet} opacity={0.5} points="7,13 20,13 13,78" />
        <SvgText fill="#FFFFFF" fontFamily={SANS} fontSize={9} fontWeight="700" textAnchor="middle" x={27} y={50}>
          vossie
        </SvgText>
      </Svg>
    );
  }
  const tall = kind === "mealTall";
  return (
    <Svg height={h} viewBox={tall ? "0 0 80 82" : "0 0 92 74"} width={w}>
      {tall ? (
        <>
          <Polygon fill={BRAND.top} points="8,10 72,10 76,30 4,30" />
          <Polygon fill={BRAND.front} points="4,30 76,30 70,78 10,78" />
          <Polygon fill={BRAND.facet} opacity={0.8} points="4,30 30,30 10,78" />
          <Rect fill={BRAND.teal} height={9} width={72} x={4} y={48} />
          <SvgText fill={BRAND.ink} fontFamily={SANS} fontSize={13} fontWeight="700" textAnchor="middle" x={40} y={72}>
            vossie
          </SvgText>
        </>
      ) : (
        <>
          <Polygon fill={BRAND.top} points="12,14 80,14 88,36 4,36" />
          <Polygon fill={BRAND.front} points="4,36 88,36 82,70 10,70" />
          <Polygon fill={BRAND.facet} opacity={0.85} points="4,36 34,36 10,70" />
          <Polygon fill={BRAND.steel} opacity={0.6} points="88,36 60,36 82,70" />
          <Rect fill={BRAND.slate} height={4} width={84} x={4} y={44} />
          <SvgText fill={BRAND.ink} fontFamily={SANS} fontSize={14} fontWeight="700" textAnchor="middle" x={46} y={62}>
            vossie
          </SvgText>
        </>
      )}
    </Svg>
  );
}

// ------------------------------------------------------------------ motion

type Shared = {
  /** 0 to 1: the boxes slide in. */
  enter: SharedValue<number>;
  /** 0 to 1: the boxes turn toward each other. */
  tilt: SharedValue<number>;
  /** 0 to 1: the lids lift and the products rise. */
  peek: SharedValue<number>;
  /** 0 to 1: the lids are fully open. */
  lid: SharedValue<number>;
  /** Builds up before the bang. */
  shake: SharedValue<number>;
  /** 0 to 1 over the burst; each product reads its own part of it. */
  go: SharedValue<number>;
  /** Runs forever, drives the floating bob. */
  phase: SharedValue<number>;
  /** A small rattle of the lids on the second slide. */
  rattle: SharedValue<number>;
  /** 1 while the boxes are held up on slides 1 and 2; they thump down at the bang. */
  lift: SharedValue<number>;
};

function useGroupStyle(side: Side, s: Shared) {
  const sign = side === "A" ? -1 : 1;
  return useAnimatedStyle(() => {
    const e = s.enter.get();
    const shake = Math.sin(s.shake.get() * Math.PI * 22) * 4.5 * s.shake.get();
    const x = sign * (1 - e) * 170 - sign * s.tilt.get() * 9 + shake;
    return {
      opacity: Math.min(1, e * 1.6),
      transform: [{ translateX: x }, { rotate: `${sign * s.tilt.get() * 2.2}deg` }],
    };
  });
}

function Box({ k, layer, s, side }: { side: Side; layer: "back" | "front" | "lid"; k: number; s: Shared }) {
  const group = useGroupStyle(side, s);
  const lid = useAnimatedStyle(() => {
    const open = s.lid.get();
    const flap = Math.sin(s.rattle.get() * Math.PI * 6) * 0.05 * s.rattle.get();
    // closed 1, ajar about 0.35, wide open -0.9; box B's lid also pops up and away
    const scaleY = 1 - 1.9 * open + flap;
    const away = side === "B" ? Math.pow(open, 3) : 0;
    return {
      transform: [{ translateY: -30 * away }, { rotate: `${away * 9}deg` }, { scaleY }],
      transformOrigin: "50% 12.7%",
    };
  });
  const rect = { height: BOX_H * k, left: BOX[side].x, position: "absolute" as const, top: BOX[side].y, width: BOX_W * k };
  return (
    <Animated.View pointerEvents="none" style={[rect, group]}>
      {layer === "back" ? <BoxBack /> : layer === "front" ? <BoxFront k={k} /> : (
        <Animated.View style={[StyleSheet.absoluteFill, lid]}>
          <BoxLid />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/**
 * One product. It is drawn twice with the same motion: once between the back and the front of its box, so it appears to
 * come up out of the box, and once on top of everything, for after it has jumped clear.
 */
function Item({ inside, s, spec }: { spec: Spec; inside: boolean; s: Shared }) {
  const sign = spec.box === "A" ? -1 : 1;
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (s.go.get() * GO_MS - spec.delay) / FLIGHT_MS));
    const e = 1 - Math.pow(1 - t, 3);
    const baseY = spec.home.y - spec.peek * s.peek.get();
    const arc = 70 * 4 * t * (1 - t);
    const bob = Math.sin(s.phase.get() + spec.delay / 90) * 5 * e;
    const x = spec.home.x + (spec.float.x - spec.home.x) * e + sign * (1 - s.enter.get()) * 170 - sign * s.tilt.get() * 9;
    const y = baseY + (spec.float.y - baseY) * e - arc + bob;
    const squash = 1 + 0.14 * Math.sin(t * Math.PI * 2) * (t > 0 && t < 1 ? 1 : 0);
    const out = t >= 0.18;
    return {
      opacity: inside ? (out ? 0 : Math.min(1, s.enter.get() * 1.6)) : out ? 1 : 0,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${spec.float.rot * e + Math.sin(t * Math.PI) * 18 * sign}deg` }, { scaleY: squash }, { scaleX: 2 - squash }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.item, { height: spec.h, width: spec.w }, style]}>
      <Drawing h={spec.h} kind={spec.kind} w={spec.w} />
    </Animated.View>
  );
}

const SPARKS = Array.from({ length: 12 }, (_, i) => i);

function Burst({ go, flash }: { go: SharedValue<number>; flash: SharedValue<number> }) {
  const ring = useAnimatedStyle(() => {
    const t = Math.min(1, go.get() * 2.2);
    return { opacity: t > 0 && t < 1 ? 0.85 * (1 - t) : 0, transform: [{ scale: 0.2 + t * 2.1 }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: flash.get(), transform: [{ scale: 0.6 + flash.get() * 0.9 }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ring, ring]}>
        <Svg height={160} width={160}>
          <Circle cx={80} cy={80} fill="none" r={74} stroke="#FFFFFF" strokeWidth={5} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.glow, glow]}>
        <Svg height={300} width={300}>
          <Defs>
            <RadialGradient cx="50%" cy="50%" id="glow" r="50%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} fill="url(#glow)" r={150} />
        </Svg>
      </Animated.View>
      {SPARKS.map((i) => (
        <Spark go={go} i={i} key={i} />
      ))}
    </View>
  );
}

function Spark({ go, i }: { go: SharedValue<number>; i: number }) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, go.get() * 1.8);
    const angle = (i / SPARKS.length) * Math.PI * 2 + (i % 2) * 0.2;
    const radius = 30 + t * (110 + (i % 3) * 22);
    return { opacity: t > 0 && t < 1 ? 1 - t : 0, transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }, { scale: 1 - t * 0.5 }] };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: i % 3 === 0 ? BRAND.sage : i % 3 === 1 ? "#FFFFFF" : BRAND.steel }, style]} />;
}

/**
 * The seller welcome's two Vossie boxes and the things that come out of them. `index` is the slide (0, 1 or 2):
 * 0 the boxes slide in and settle; 1 they turn toward each other, the lids lift and a latte lid and a notepad peek out;
 * 2 they shake, then bang: the lids fly open and the notepad, meal boxes and cups jump out and float. It is one scene that
 * keeps going from slide to slide, not three pictures. `still` shows a slide's final pose with no entrance or burst (the setup
 * headers); Reduce Motion does the same.
 */
export function PackagingScene({ index, scale = 1, still = false }: { index: number; scale?: number; still?: boolean }) {
  const reduced = useReducedMotion();
  const instant = still || reduced;
  const enter = useSharedValue(instant ? 1 : 0);
  const tilt = useSharedValue(instant && index >= 1 ? 1 : 0);
  const peek = useSharedValue(instant && index >= 1 ? 1 : 0);
  const lid = useSharedValue(instant ? (index === 0 ? 0 : index === 1 ? 0.34 : 1) : 0);
  const shake = useSharedValue(0);
  const go = useSharedValue(instant && index === 2 ? 1 : 0);
  const flash = useSharedValue(0);
  const phase = useSharedValue(0);
  const rattle = useSharedValue(0);
  const lift = useSharedValue(instant ? 0 : 1);
  const shared: Shared = { enter, go, lid, lift, peek, phase, rattle, shake, tilt };

  useEffect(() => {
    if (instant) return;
    enter.set(withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.3)) }));
  }, [enter, instant]);

  useEffect(() => {
    phase.set(withRepeat(withTiming(Math.PI * 2, { duration: 3400, easing: Easing.linear }), -1));
  }, [phase]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ease = { easing: Easing.out(Easing.cubic) };
    const move = (value: SharedValue<number>, to: number, duration: number) => value.set(instant ? to : withTiming(to, { duration, ...ease }));
    if (index <= 1) {
      move(lift, 1, 500);
      move(tilt, index === 1 ? 1 : 0, 700);
      move(peek, index === 1 ? 1 : 0, 650);
      move(lid, index === 1 ? 0.34 : 0, 600);
      shake.set(0);
      go.set(instant ? 0 : withTiming(0, { duration: 380 }));
      if (index === 1 && !instant) rattle.set(withDelay(500, withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 1 }))));
    } else {
      move(tilt, 1, 500);
      move(peek, 1, 400);
      if (instant) {
        lid.set(1);
        go.set(1);
      } else {
        lid.set(withTiming(0.34, { duration: 400, ...ease }));
        shake.set(withTiming(1, { duration: BANG_AT_MS - 50, easing: Easing.in(Easing.quad) }));
        timers.push(
          setTimeout(() => {
            shake.set(0);
            lift.set(withSpring(0, spring.bouncy));
            lid.set(withSpring(1, spring.bouncy));
            go.set(withTiming(1, { duration: GO_MS, easing: Easing.linear }));
            flash.set(withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 520 })));
            haptic.success();
          }, BANG_AT_MS),
        );
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [go, index, instant, flash, lid, lift, peek, rattle, shake, tilt]);

  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: Math.sin(phase.get()) * 3 - lift.get() * 40 }] }));
  const shadow = useAnimatedStyle(() => ({ opacity: Math.min(1, enter.get() * 1.4) }));

  // products waiting in a box are cut off at the bottom of the box's front, so no part of them shows below it
  const inside = (box: Side): ReactNode => (
    <View pointerEvents="none" style={{ height: BOX[box].y + 114 * BOX[box].k, left: 0, overflow: "hidden", position: "absolute", top: 0, width: SCENE.width }}>
      {PRODUCTS.filter((spec) => spec.box === box).map((spec) => (
        <Item inside key={`${spec.kind}-in`} s={shared} spec={spec} />
      ))}
    </View>
  );

  return (
    <View style={{ height: SCENE.height * scale, width: SCENE.width * scale }} testID="packaging-scene">
      <View style={{ height: SCENE.height, left: 0, position: "absolute", top: 0, transform: [{ scale }], transformOrigin: "0% 0%", width: SCENE.width }}>
        <Animated.View style={[StyleSheet.absoluteFill, bob]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadow]}>
            <Svg height={SCENE.height} width={SCENE.width}>
              <Ellipse cx={265} cy={246} fill="rgba(0,0,0,0.22)" rx={105} ry={11} />
              <Ellipse cx={116} cy={318} fill="rgba(0,0,0,0.26)" rx={118} ry={13} />
            </Svg>
          </Animated.View>

          <Box k={BOX.B.k} layer="back" s={shared} side="B" />
          {inside("B")}
          <Box k={BOX.B.k} layer="front" s={shared} side="B" />
          <Box k={BOX.B.k} layer="lid" s={shared} side="B" />

          <Box k={BOX.A.k} layer="back" s={shared} side="A" />
          {inside("A")}
          <Box k={BOX.A.k} layer="front" s={shared} side="A" />
          <Box k={BOX.A.k} layer="lid" s={shared} side="A" />

          {PRODUCTS.map((spec) => (
            <Item inside={false} key={`${spec.kind}-out`} s={shared} spec={spec} />
          ))}
          <Burst flash={flash} go={go} />
        </Animated.View>
      </View>
    </View>
  );
}

/** The scene at a fixed pose for the setup headers: slide `index`'s final look, nothing moving but a gentle bob. */
export function Hero({ index, scale = 1 }: { index: number; scale?: number }) {
  return <PackagingScene index={index} scale={scale} still />;
}

const styles = StyleSheet.create({
  glow: { left: 30, position: "absolute", top: 80 },
  item: { left: 0, position: "absolute", top: 0 },
  ring: { left: 100, position: "absolute", top: 120 },
  spark: { borderRadius: 4, height: 8, left: 176, position: "absolute", top: 196, width: 8 },
});
