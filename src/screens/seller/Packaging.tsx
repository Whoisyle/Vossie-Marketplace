import { useEffect, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import Svg, { Circle, Defs, Ellipse, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";

import { Wordmark } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";

/** The Vossie brand as used on the packaging: the app's own wordmark colour and the accent colours. */
const BRAND = {
  charcoal: "#191B1D",
  facet: "#A9B8C0",
  front: "#DCE0E1",
  ink: "#29475B",
  inside: "#6F8189",
  insideDark: "#5C6E76",
  lightTeal: "#4E7E8D",
  sage: "#DFE2DC",
  side: "#B9C2C7",
  slate: "#586879",
  steel: "#8B9DA6",
  teal: "#376371",
  top: "#EEF1F1",
  white: "#F4F5F2",
} as const;
const SANS = "Arial, Helvetica, sans-serif";

/** The scene is drawn on a 360 x 372 canvas; the top 42 holds the chips that pop up, and the boxes sit below it. */
export const SCENE = { height: 372, top: 42, width: 360 } as const;
/** The fixed headers have no chips, so they drop the top band. */
export const COMPACT_HEIGHT = SCENE.height - SCENE.top;

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
  { box: "A", delay: 0, float: { rot: -12, x: 10, y: 78 }, h: 88, home: { x: 44, y: 196 }, kind: "notepad", peek: 22, w: 66 },
  { box: "A", delay: 120, float: { rot: 6, x: 112, y: 8 }, h: 82, home: { x: 118, y: 196 }, kind: "cup", peek: 26, w: 54 },
  { box: "A", delay: 240, float: { rot: 5, x: 88, y: 98 }, h: 74, home: { x: 74, y: 196 }, kind: "meal", peek: 0, w: 92 },
  { box: "B", delay: 80, float: { rot: -8, x: 196, y: 4 }, h: 82, home: { x: 232, y: 146 }, kind: "cupLight", peek: 24, w: 54 },
  { box: "B", delay: 200, float: { rot: -6, x: 250, y: 80 }, h: 82, home: { x: 262, y: 146 }, kind: "mealTall", peek: 14, w: 80 },
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

function BoxFront({ k, side }: { k: number; side: Side }) {
  const stripe = side === "A" ? BRAND.teal : BRAND.slate;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg height="100%" viewBox={`0 0 ${BOX_W} ${BOX_H}`} width="100%">
        <Polygon fill={BRAND.front} points="0,40 160,60 160,138 0,114" />
        <Polygon fill={BRAND.side} points="160,60 160,138 222,104 222,28" />
        <Polygon fill={side === "A" ? BRAND.steel : BRAND.facet} opacity={0.9} points="0,40 56,47 0,92" />
        <Polygon fill={BRAND.lightTeal} opacity={0.7} points="160,60 110,54 160,104" />
        <Polygon fill={BRAND.steel} opacity={0.55} points="160,60 222,28 222,68" />
        <Polygon fill={stripe} points="0,104 160,128 160,138 0,114" />
        <Polygon fill={BRAND.sage} opacity={0.85} points="160,128 222,94 222,104 160,138" />
      </Svg>
      <View pointerEvents="none" style={{ left: 34 * k, position: "absolute", top: 70 * k, transform: [{ skewY: "7.1deg" }] }}>
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
      <Polygon fill={BRAND.sage} opacity={0.8} points="160,60 222,28 200,24 150,52" />
    </Svg>
  );
}

function Tick({ color }: { color: string }) {
  return (
    <Svg height={10} viewBox="0 0 10 10" width={10}>
      <Path d="M1.5 5.2 L4 7.7 L8.6 2.4" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
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
          <Polygon fill={BRAND.lightTeal} opacity={0.75} points="60,6 60,38 32,6" />
          <Polygon fill={BRAND.steel} opacity={0.55} points="4,86 4,66 24,86" />
          {[12, 20, 28, 36, 44, 52].map((cx) => (
            <Circle cx={cx} cy={8} fill={BRAND.sage} key={cx} r={3.2} />
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
    const sleeve = kind === "cup" ? BRAND.teal : BRAND.slate;
    const lid = kind === "cup" ? BRAND.slate : BRAND.charcoal;
    return (
      <Svg height={h} viewBox="0 0 54 82" width={w}>
        <Rect fill={lid} height={9} rx={3} width={46} x={4} y={4} />
        <Rect fill={BRAND.steel} height={6} rx={3} width={36} x={9} y={0} />
        <Polygon fill={body} points="7,13 47,13 41,78 13,78" />
        <Polygon fill={sleeve} points="9,34 45,34 43,58 11,58" />
        <Polygon fill={BRAND.facet} opacity={0.5} points="7,13 20,13 13,78" />
        <SvgText fill="#FFFFFF" fontFamily={SANS} fontSize={9} fontWeight="700" textAnchor="middle" x={27} y={50}>
          vossie
        </SvgText>
      </Svg>
    );
  }
  if (kind === "mealTall") {
    return (
      <Svg height={h} viewBox="0 0 80 82" width={w}>
        <Polygon fill={BRAND.sage} points="8,10 72,10 76,30 4,30" />
        <Polygon fill={BRAND.white} points="4,30 76,30 70,78 10,78" />
        <Polygon fill={BRAND.facet} opacity={0.8} points="4,30 30,30 10,78" />
        <Rect fill={BRAND.teal} height={9} width={72} x={4} y={48} />
        <SvgText fill={BRAND.ink} fontFamily={SANS} fontSize={13} fontWeight="700" textAnchor="middle" x={40} y={72}>
          vossie
        </SvgText>
      </Svg>
    );
  }
  return (
    <Svg height={h} viewBox="0 0 92 74" width={w}>
      <Polygon fill={BRAND.slate} points="12,14 80,14 88,36 4,36" />
      <Polygon fill="#3F4D5B" points="4,36 88,36 82,70 10,70" />
      <Polygon fill={BRAND.steel} opacity={0.7} points="4,36 34,36 10,70" />
      <Polygon fill={BRAND.lightTeal} opacity={0.6} points="88,36 60,36 82,70" />
      <Rect fill={BRAND.sage} height={4} width={84} x={4} y={44} />
      <SvgText fill={BRAND.sage} fontFamily={SANS} fontSize={14} fontWeight="700" textAnchor="middle" x={46} y={62}>
        vossie
      </SvgText>
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
  /** 1 on the first slide: the boxes breathe and a lid flutters while they wait. */
  idle: SharedValue<number>;
};

const clamp01 = (value: number) => {
  "worklet";
  return Math.min(1, Math.max(0, value));
};

function useGroupStyle(side: Side, s: Shared) {
  const sign = side === "A" ? -1 : 1;
  return useAnimatedStyle(() => {
    const e = s.enter.get();
    const shake = Math.sin(s.shake.get() * Math.PI * 22) * 4.5 * s.shake.get();
    const x = sign * (1 - e) * 170 - sign * s.tilt.get() * 9 + shake;
    const breathe = 1 + Math.sin(s.phase.get() * 2 + (side === "A" ? 0 : 1.4)) * 0.012 * s.idle.get();
    return {
      opacity: Math.min(1, e * 1.6),
      transform: [{ translateX: x }, { rotate: `${sign * s.tilt.get() * 2.2}deg` }, { scaleY: breathe }],
    };
  });
}

function Box({ k, layer, s, side }: { side: Side; layer: "back" | "front" | "lid"; k: number; s: Shared }) {
  const group = useGroupStyle(side, s);
  const lid = useAnimatedStyle(() => {
    // the lid is as open as the slide says, or as the burst says, whichever is more
    const open = Math.max(s.lid.get(), Math.min(1, s.go.get() * 3));
    const flap = Math.sin(s.rattle.get() * Math.PI * 6) * 0.05 * s.rattle.get() + Math.sin(s.phase.get() * 3 + (side === "A" ? 0 : 2)) * 0.04 * s.idle.get();
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
      {layer === "back" ? <BoxBack /> : layer === "front" ? <BoxFront k={k} side={side} /> : (
        <Animated.View style={[StyleSheet.absoluteFill, lid]}>
          <BoxLid />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** A thin curl of steam above a cup once it is out, rising and fading in turn. */
function Steam({ s, seed, spec }: { s: Shared; spec: Spec; seed: number }) {
  const style = useAnimatedStyle(() => {
    const t = clamp01((s.go.get() * GO_MS - spec.delay) / FLIGHT_MS);
    const cycle = (s.phase.get() / (Math.PI * 2) + seed) % 1;
    return { opacity: t >= 1 ? 0.75 * Math.sin(cycle * Math.PI) : 0, transform: [{ translateY: -cycle * 12 }, { translateX: Math.sin(cycle * 6) * 2 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.steam, { left: 12 + seed * 18 }, style]}>
      <Svg height={22} width={14}>
        <Path d="M7 21 C1 15 12 11 6 6 C3 3 7 2 7 0" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={2.2} />
      </Svg>
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
    const t = clamp01((s.go.get() * GO_MS - spec.delay) / FLIGHT_MS);
    const e = 1 - Math.pow(1 - t, 3);
    const baseY = spec.home.y - spec.peek * s.peek.get();
    const arc = 70 * 4 * t * (1 - t);
    const wave = s.phase.get() + spec.delay / 90;
    const bob = Math.sin(wave) * 7 * e;
    const x = spec.home.x + (spec.float.x - spec.home.x) * e + sign * (1 - s.enter.get()) * 170 - sign * s.tilt.get() * 9 + Math.cos(wave * 0.8) * 4 * e;
    const y = baseY + (spec.float.y - baseY) * e - arc + bob;
    const squash = 1 + 0.14 * Math.sin(t * Math.PI * 2) * (t > 0 && t < 1 ? 1 : 0);
    const out = t >= 0.18;
    const sway = Math.sin(wave * 0.9) * 4 * e;
    return {
      opacity: inside ? (out ? 0 : Math.min(1, s.enter.get() * 1.6)) : out ? 1 : 0,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${spec.float.rot * e + sway + Math.sin(t * Math.PI) * 18 * sign}deg` }, { scaleY: squash }, { scaleX: 2 - squash }],
    };
  });
  const cup = spec.kind === "cup" || spec.kind === "cupLight";
  return (
    <Animated.View pointerEvents="none" style={[styles.item, { height: spec.h, width: spec.w }, style]}>
      <Drawing h={spec.h} kind={spec.kind} w={spec.w} />
      {cup && !inside ? (
        <>
          <Steam s={s} seed={0} spec={spec} />
          <Steam s={s} seed={0.5} spec={spec} />
        </>
      ) : null}
    </Animated.View>
  );
}

/** Soft coloured blobs drifting slowly behind the boxes, in the brand's accent colours. */
const ORBS = [
  { color: BRAND.lightTeal, opacity: 0.5, size: 190, x: -50, y: 30 },
  { color: BRAND.sage, opacity: 0.22, size: 170, x: 220, y: 20 },
  { color: BRAND.steel, opacity: 0.32, size: 150, x: 150, y: 200 },
  { color: BRAND.slate, opacity: 0.4, size: 130, x: -30, y: 240 },
];

function Orbs({ s }: { s: Shared }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORBS.map((orb, i) => (
        <Orb index={i} key={i} orb={orb} s={s} />
      ))}
    </View>
  );
}

function Orb({ index, orb, s }: { index: number; orb: (typeof ORBS)[number]; s: Shared }) {
  const style = useAnimatedStyle(() => {
    const wave = s.phase.get() * (0.6 + index * 0.15) + index * 1.7;
    // the blobs swell a little when the burst goes off
    const pulse = 1 + 0.12 * Math.sin(s.go.get() * Math.PI);
    return { transform: [{ translateX: Math.sin(wave) * 18 }, { translateY: Math.cos(wave * 0.8) * 14 }, { scale: pulse }] };
  });
  const id = `orb${index}`;
  return (
    <Animated.View style={[{ height: orb.size, left: orb.x, opacity: orb.opacity, position: "absolute", top: orb.y, width: orb.size }, style]}>
      <Svg height={orb.size} width={orb.size}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id={id} r="50%">
            <Stop offset="0" stopColor={orb.color} stopOpacity={1} />
            <Stop offset="1" stopColor={orb.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={orb.size / 2} cy={orb.size / 2} fill={`url(#${id})`} r={orb.size / 2} />
      </Svg>
    </Animated.View>
  );
}

const SPARK_COLORS = [BRAND.sage, "#FFFFFF", BRAND.steel, BRAND.lightTeal];
const SPARKS = Array.from({ length: 16 }, (_, i) => i);

function Burst({ go, flash }: { go: SharedValue<number>; flash: SharedValue<number> }) {
  const ring = useAnimatedStyle(() => {
    const t = Math.min(1, go.get() * 2.2);
    return { opacity: t > 0 && t < 1 ? 0.85 * (1 - t) : 0, transform: [{ scale: 0.2 + t * 2.1 }] };
  });
  const ring2 = useAnimatedStyle(() => {
    const t = clamp01(go.get() * 2.2 - 0.25);
    return { opacity: t > 0 && t < 1 ? 0.6 * (1 - t) : 0, transform: [{ scale: 0.2 + t * 2.6 }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: flash.get(), transform: [{ scale: 0.6 + flash.get() * 0.9 }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ring, ring]}>
        <Svg height={160} width={160}>
          <Circle cx={80} cy={80} fill="none" r={74} stroke="#FFFFFF" strokeWidth={5} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.ring, ring2]}>
        <Svg height={160} width={160}>
          <Circle cx={80} cy={80} fill="none" r={74} stroke={BRAND.sage} strokeWidth={3} />
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
    const radius = 30 + t * (110 + (i % 3) * 26);
    return { opacity: t > 0 && t < 1 ? 1 - t : 0, transform: [{ translateX: Math.cos(angle) * radius }, { translateY: Math.sin(angle) * radius }, { rotate: `${t * 240}deg` }, { scale: 1 - t * 0.5 }] };
  });
  return <Animated.View style={[styles.spark, i % 4 === 0 && styles.sparkSquare, { backgroundColor: SPARK_COLORS[i % SPARK_COLORS.length] }, style]} />;
}

/** The small notices that pop up at the top: a new order on slide 2, then the order on its way and delivered after the burst. */
const CHIPS = [
  { bg: BRAND.sage, delay: 0, fg: BRAND.ink, label: "New order", trigger: "peek" as const, x: 8, y: 2 },
  { bg: BRAND.teal, delay: 260, fg: "#FFFFFF", label: "On its way", trigger: "go" as const, x: 112, y: 0 },
  { bg: BRAND.white, delay: 420, fg: BRAND.charcoal, label: "Delivered", trigger: "go" as const, x: 218, y: 2 },
];

function Chip({ chip, s }: { chip: (typeof CHIPS)[number]; s: Shared }) {
  const style = useAnimatedStyle(() => {
    const p = chip.trigger === "peek" ? clamp01((s.peek.get() - 0.4) / 0.6) : clamp01((s.go.get() * GO_MS - chip.delay) / 420);
    const pop = p < 1 ? 1 + 0.25 * Math.sin(p * Math.PI) : 1;
    const bob = Math.sin(s.phase.get() * 1.3 + chip.x / 40) * 3 * p;
    return { opacity: p, transform: [{ translateY: bob + (1 - p) * 14 }, { scale: Math.max(0.01, p * pop) }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.chip, { backgroundColor: chip.bg, left: chip.x, top: chip.y }, style]}>
      <View style={[styles.chipDot, { backgroundColor: chip.fg }]}>
        <Tick color={chip.bg} />
      </View>
      <Text style={[styles.chipText, { color: chip.fg }]}>{chip.label}</Text>
    </Animated.View>
  );
}

/**
 * The seller welcome's two Vossie boxes and the things that come out of them. `index` is the slide (0, 1 or 2):
 * 0 the boxes slide in, settle and breathe; 1 they turn toward each other, the lids lift and a latte lid and a notepad peek
 * out; 2 they shake, then bang: the lids fly open and the notepad, meal boxes and cups jump out and float, with steam and
 * small notices around them. It is one scene that keeps going from slide to slide, not three pictures.
 *
 * `still` is the small version for the setup headers: it never stops, but loops (lids open, things hop out and float, then
 * settle back in) with no chips. Reduce Motion shows one calm pose and nothing moves.
 */
export function PackagingScene({ index, scale = 1, still = false }: { index: number; scale?: number; still?: boolean }) {
  const reduced = useReducedMotion();
  const instant = reduced;
  const loop = still && !reduced;
  const enter = useSharedValue(still || instant ? 1 : 0);
  const tilt = useSharedValue(instant && index >= 1 ? 1 : 0);
  const peek = useSharedValue(instant && index >= 1 ? 1 : 0);
  const lid = useSharedValue(loop ? 0.2 : instant ? (index === 0 ? 0 : index === 1 ? 0.34 : 1) : 0);
  const shake = useSharedValue(0);
  const go = useSharedValue(instant && index === 2 ? 1 : 0);
  const flash = useSharedValue(0);
  const phase = useSharedValue(0);
  const rattle = useSharedValue(0);
  const lift = useSharedValue(instant || still ? 0 : 1);
  const idle = useSharedValue(0);
  const shared: Shared = { enter, go, idle, lid, lift, peek, phase, rattle, shake, tilt };

  useEffect(() => {
    if (instant || still) return;
    enter.set(withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.3)) }));
  }, [enter, instant, still]);

  useEffect(() => {
    if (instant) return;
    phase.set(withRepeat(withTiming(Math.PI * 2, { duration: 3400, easing: Easing.linear }), -1));
  }, [phase, instant]);

  // the setup headers: an endless little cycle, a different beat for each of the three
  useEffect(() => {
    if (!loop) return;
    const offset = index * 650;
    const sine = { easing: Easing.inOut(Easing.sin) };
    tilt.set(withRepeat(withSequence(withTiming(0.8, { duration: 2600, ...sine }), withTiming(0.1, { duration: 2600, ...sine })), -1));
    peek.set(withRepeat(withSequence(withTiming(1, { duration: 1300, ...sine }), withTiming(0.15, { duration: 1300, ...sine })), -1));
    go.set(withRepeat(withSequence(withDelay(1500 + offset, withTiming(1, { duration: GO_MS, easing: Easing.linear })), withDelay(2200, withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }))), -1));
  }, [go, index, loop, peek, tilt]);

  useEffect(() => {
    if (loop) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ease = { easing: Easing.out(Easing.cubic) };
    const move = (value: SharedValue<number>, to: number, duration: number) => value.set(instant ? to : withTiming(to, { duration, ...ease }));
    idle.set(instant ? 0 : withTiming(index === 0 ? 1 : 0, { duration: 400 }));
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
  }, [go, idle, index, instant, flash, lid, lift, loop, peek, rattle, shake, tilt]);

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

  const top = still ? 0 : SCENE.top;
  const height = still ? COMPACT_HEIGHT : SCENE.height;
  return (
    <View style={{ height: height * scale, width: SCENE.width * scale }} testID="packaging-scene">
      <View style={{ height, left: 0, position: "absolute", top: 0, transform: [{ scale }], transformOrigin: "0% 0%", width: SCENE.width }}>
        {still ? null : <Orbs s={shared} />}
        <Animated.View style={[{ height: COMPACT_HEIGHT, left: 0, position: "absolute", top, width: SCENE.width }, bob]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shadow]}>
            <Svg height={COMPACT_HEIGHT} width={SCENE.width}>
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
        {still ? null : CHIPS.map((chip) => <Chip chip={chip} key={chip.label} s={shared} />)}
      </View>
    </View>
  );
}

/** The small version for the setup headers: the same boxes and products, looping all the time. */
export function Hero({ index, scale = 1 }: { index: number; scale?: number }) {
  return <PackagingScene index={index} scale={scale} still />;
}

const styles = StyleSheet.create({
  chip: { alignItems: "center", borderRadius: 14, boxShadow: "0 4px 10px rgba(8,18,24,0.3)", flexDirection: "row", gap: 6, height: 28, paddingHorizontal: 10, position: "absolute" },
  chipDot: { alignItems: "center", borderRadius: 7, height: 14, justifyContent: "center", width: 14 },
  chipText: { fontSize: 12, fontWeight: "800" },
  glow: { left: 30, position: "absolute", top: 80 },
  item: { left: 0, position: "absolute", top: 0 },
  ring: { left: 100, position: "absolute", top: 120 },
  spark: { borderRadius: 4, height: 8, left: 176, position: "absolute", top: 196, width: 8 },
  sparkSquare: { borderRadius: 1.5 },
  steam: { position: "absolute", top: -22 },
});
