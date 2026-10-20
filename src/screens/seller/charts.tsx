import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop } from "react-native-svg";

import { haptic } from "@/lib/haptics";

import { SELLER, Text } from "./ui";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const BAR = "#B5CAD2";
const BAR_ON = SELLER.solid;

/** How far across a width a touch is, as an index into `count` equal columns. */
export function indexAt(x: number, width: number, count: number): number {
  if (width <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.floor((x / width) * count)));
}

/** A little label that floats over a chart and follows the finger. It keeps itself inside the chart. */
function Tip({ left, lines, width }: { left: number; lines: string[]; width: number }) {
  const w = 132;
  const x = Math.max(0, Math.min(width - w, left - w / 2));
  return (
    <View pointerEvents="none" style={[styles.tip, { left: x, width: w }]} testID="chart-tip">
      {lines.map((line, i) => (
        <Text key={line} style={i === 0 ? styles.tipTitle : styles.tipLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/**
 * Bars you can touch: tap one or drag a finger across them and it lights up with its value over it. `value` is what the bar is
 * worth; `detail` is the second line of the label (a comparison, a count).
 */
export function ScrubBars({ bars, height = 140, onSelect, selected, testID = "scrub-bars" }: { testID?: string; bars: { label: string; value: number; title: string; detail?: string }[]; height?: number; selected?: number | null; onSelect?: (index: number | null) => void }) {
  const [width, setWidth] = useState(0);
  const [own, setOwn] = useState<number | null>(null);
  const chosen = selected !== undefined ? selected : own;
  const peak = Math.max(1, ...bars.map((bar) => bar.value));
  const pick = (index: number) => {
    if (index === chosen) return;
    haptic.select();
    setOwn(index);
    onSelect?.(index);
  };
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => pick(indexAt(event.x, width, bars.length)))
        .onUpdate((event) => pick(indexAt(event.x, width, bars.length)))
        .runOnJS(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, bars.length, chosen],
  );
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const column = width / Math.max(1, bars.length);

  return (
    <GestureDetector gesture={gesture}>
      <View accessibilityLabel={`Chart. ${bars.map((bar) => `${bar.label} ${bar.title}`).join(", ")}`} accessibilityRole="image" onLayout={onLayout} style={[styles.chart, { height: height + 56 }]} testID={testID}>
        {chosen !== null && bars[chosen] ? <Tip left={column * chosen + column / 2} lines={[bars[chosen]!.title, ...(bars[chosen]!.detail ? [bars[chosen]!.detail!] : [])]} width={width} /> : null}
        <View style={[styles.bars, { height }]}>
          {bars.map((bar, i) => (
            <Bar height={height} index={i} key={`${bar.label}-${i}`} on={chosen === i} peak={peak} value={bar.value} />
          ))}
        </View>
        <View style={styles.labels}>
          {bars.map((bar, i) => (
            <Text key={`${bar.label}-${i}`} style={[styles.label, chosen === i && styles.labelOn]}>
              {bar.label}
            </Text>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

function Bar({ height, index, on, peak, value }: { height: number; index: number; on: boolean; peak: number; value: number }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (!reduced) grow.set(withDelay(index * 40, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [grow, index, reduced]);
  useEffect(() => {
    lift.set(withTiming(on ? 1 : 0, { duration: 160 }));
  }, [lift, on]);
  const style = useAnimatedStyle(() => ({ height: Math.max(6, (value / peak) * height) * grow.get(), transform: [{ scaleX: 1 + lift.get() * 0.12 }] }));
  return (
    <View style={styles.barSlot}>
      <Animated.View style={[styles.bar, { backgroundColor: on ? BAR_ON : BAR }, style]} />
    </View>
  );
}

/**
 * A smooth line over time with the area under it shaded, and the period before drawn dashed for comparison. Touch or drag
 * anywhere on it: a marker follows your finger and the day, the amount and the same day before are shown.
 */
export function ScrubLine({ compare, height = 150, points }: { points: { label: string; value: number; title: string }[]; compare?: { value: number; title: string }[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const reveal = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) reveal.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [reduced, reveal]);
  const peak = Math.max(1, ...points.map((p) => p.value), ...(compare ?? []).map((p) => p.value));
  const pad = 8;
  const x = (i: number) => (points.length <= 1 ? width / 2 : pad + (i / (points.length - 1)) * (width - pad * 2));
  const y = (v: number) => height - pad - (v / peak) * (height - pad * 2);
  const path = (values: number[]) => {
    if (values.length === 0 || width === 0) return "";
    let d = `M ${x(0)} ${y(values[0]!)}`;
    for (let i = 1; i < values.length; i += 1) {
      const mx = (x(i - 1) + x(i)) / 2;
      d += ` C ${mx} ${y(values[i - 1]!)} ${mx} ${y(values[i]!)} ${x(i)} ${y(values[i]!)}`;
    }
    return d;
  };
  const line = path(points.map((p) => p.value));
  const prior = compare ? path(compare.map((p) => p.value)) : "";
  const area = line ? `${line} L ${x(points.length - 1)} ${height} L ${x(0)} ${height} Z` : "";
  const animatedClip = useAnimatedProps(() => ({ width: width * reveal.get() }));
  const move = (px: number) => {
    const next = indexAt(px, width, points.length);
    if (next === chosen) return;
    haptic.select();
    setChosen(next);
  };
  const gesture = useMemo(() => Gesture.Pan().minDistance(0).onBegin((event) => move(event.x)).onUpdate((event) => move(event.x)).runOnJS(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, chosen, points.length]);
  const sel = chosen !== null ? points[chosen] : undefined;
  const before = chosen !== null ? compare?.[chosen] : undefined;

  return (
    <GestureDetector gesture={gesture}>
      <View accessibilityLabel={`Line chart of ${points.length} points`} accessibilityRole="image" onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: height + 28 }} testID="scrub-line">
        {sel && chosen !== null ? <Tip left={x(chosen)} lines={[sel.title, ...(before ? [`Before: ${before.title}`] : [])]} width={width} /> : null}
        {width > 0 ? (
          <Svg height={height} style={styles.svg} width={width}>
            <Defs>
              <SvgGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor={SELLER.solid} stopOpacity="0.32" />
                <Stop offset="1" stopColor={SELLER.solid} stopOpacity="0" />
              </SvgGradient>
              <ClipPath id="reveal">
                <AnimatedRect animatedProps={animatedClip} height={height} x={0} y={0} />
              </ClipPath>
            </Defs>
            <G clipPath="url(#reveal)">
              {area ? <Path d={area} fill="url(#area)" /> : null}
              {prior ? <Path d={prior} fill="none" stroke="#9FB3BC" strokeDasharray="5 5" strokeWidth={2} /> : null}
              {line ? <Path d={line} fill="none" stroke={SELLER.solid} strokeLinecap="round" strokeWidth={3} /> : null}
            </G>
            {chosen !== null && sel ? (
              <G>
                <Path d={`M ${x(chosen)} 0 L ${x(chosen)} ${height}`} stroke={SELLER.solid} strokeDasharray="3 4" strokeOpacity={0.5} strokeWidth={1.5} />
                <Circle cx={x(chosen)} cy={y(sel.value)} fill="#FFFFFF" r={6} stroke={SELLER.solid} strokeWidth={3} />
              </G>
            ) : null}
          </Svg>
        ) : null}
        <View style={styles.axis}>
          <Text style={styles.label}>{points[0]?.label}</Text>
          <Text style={styles.label}>{points[Math.floor(points.length / 2)]?.label}</Text>
          <Text style={styles.label}>{points[points.length - 1]?.label}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

export type Slice = { key: string; label: string; value: number; color: string };

/**
 * A ring split into parts. Tap the ring or a row in the list and that part grows and the middle tells you its share.
 */
export function Donut({ size = 150, slices, unit = "" }: { slices: Slice[]; size?: number; unit?: string }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const arcs = slices.map((slice, i) => {
    const before = slices.slice(0, i).reduce((sum, item) => sum + item.value, 0);
    const length = total > 0 ? (slice.value / total) * circumference : 0;
    return { ...slice, length, offset: total > 0 ? (before / total) * circumference : 0 };
  });
  const sel = slices.find((slice) => slice.key === chosen);
  const centre = sel ?? slices[0];
  const pick = (key: string) => {
    haptic.select();
    setChosen((current) => (current === key ? null : key));
  };
  const onRing = (x: number, y: number) => {
    const angle = (Math.atan2(y - size / 2, x - size / 2) * 180) / Math.PI + 90;
    const turn = ((angle % 360) + 360) % 360;
    const target = (turn / 360) * circumference;
    const hit = arcs.find((arc) => target >= arc.offset && target < arc.offset + arc.length);
    if (hit) pick(hit.key);
  };

  return (
    <View style={styles.donut} testID="donut">
      <Pressable accessibilityLabel="Ring chart. Tap a part to pick it" onPress={(event) => onRing(event.nativeEvent.locationX, event.nativeEvent.locationY)} style={{ height: size, width: size }}>
        <Svg height={size} width={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} fill="none" r={radius} stroke="#E3ECEF" strokeWidth={18} />
            {arcs.map((arc) => (
              <Circle
                cx={size / 2}
                cy={size / 2}
                fill="none"
                key={arc.key}
                opacity={chosen && chosen !== arc.key ? 0.35 : 1}
                r={radius}
                stroke={arc.color}
                strokeDasharray={`${Math.max(0, arc.length - 3)} ${circumference}`}
                strokeDashoffset={-arc.offset}
                strokeWidth={chosen === arc.key ? 24 : 18}
              />
            ))}
          </G>
        </Svg>
        <View pointerEvents="none" style={[styles.donutCentre, { height: size, width: size }]}>
          <Text style={styles.donutBig}>{centre && total > 0 ? `${Math.round((centre.value / total) * 100)}%` : "0%"}</Text>
          <Text numberOfLines={1} style={styles.donutLabel}>
            {centre?.label ?? ""}
          </Text>
        </View>
      </Pressable>
      <View style={styles.legend}>
        {slices.map((slice) => (
          <Pressable accessibilityRole="button" key={slice.key} onPress={() => pick(slice.key)} style={[styles.legendRow, chosen === slice.key && styles.legendOn]} testID={`slice-${slice.key}`}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <Text style={styles.legendText}>{slice.label}</Text>
            <Text style={styles.legendValue}>
              {slice.value}
              {unit}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** A grid of days against parts of the day, darker where more happened. Tap a square to read it. */
export function HeatGrid({ cells, cols, rows }: { rows: string[]; cols: string[]; cells: number[][] }) {
  const [chosen, setChosen] = useState<{ r: number; c: number } | null>(null);
  const peak = Math.max(1, ...cells.flat());
  const sel = chosen ? cells[chosen.r]?.[chosen.c] : undefined;
  return (
    <View style={styles.heat} testID="heat-grid">
      <View style={styles.heatRow}>
        <View style={styles.heatLabel} />
        {cols.map((col) => (
          <Text key={col} style={[styles.label, styles.heatCol]}>
            {col}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={row} style={styles.heatRow}>
          <Text style={[styles.label, styles.heatLabel]}>{row}</Text>
          {cols.map((col, c) => {
            const count = cells[r]?.[c] ?? 0;
            const on = chosen?.r === r && chosen.c === c;
            return (
              <Pressable
                accessibilityLabel={`${row} ${col}: ${count} sales`}
                accessibilityRole="button"
                key={col}
                onPress={() => {
                  haptic.select();
                  setChosen({ c, r });
                }}
                style={[styles.cell, { backgroundColor: count === 0 ? "#E3ECEF" : `rgba(56,96,111,${0.18 + (count / peak) * 0.82})` }, on && styles.cellOn]}
                testID={`cell-${r}-${c}`}
              />
            );
          })}
        </View>
      ))}
      <Text style={styles.heatNote} testID="heat-note">
        {chosen && sel !== undefined ? `${rows[chosen.r]} ${cols[chosen.c]?.toLowerCase()}: ${sel} ${sel === 1 ? "sale" : "sales"}` : "Tap a square to see the sales"}
      </Text>
    </View>
  );
}

/** Steps that get narrower, like views, taps and orders. Tap one to read it with the share that carried on from the step before. */
export function Funnel({ steps }: { steps: { key: string; label: string; value: number }[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <View style={styles.funnel} testID="funnel">
      {steps.map((step, i) => {
        const share = Math.round((step.value / top) * 100);
        const carried = i === 0 ? 100 : steps[i - 1]!.value > 0 ? Math.round((step.value / steps[i - 1]!.value) * 100) : 0;
        const on = chosen === step.key;
        return (
          <Pressable accessibilityRole="button" key={step.key} onPress={() => { haptic.select(); setChosen(on ? null : step.key); }} style={styles.funnelRow} testID={`funnel-${step.key}`}>
            <View style={[styles.funnelBar, { backgroundColor: on ? BAR_ON : BAR, width: `${Math.max(14, share)}%` }]}>
              <Text style={[styles.funnelText, { color: on ? "#FFFFFF" : SELLER.ink }]}>{step.label}</Text>
              <Text style={[styles.funnelText, { color: on ? "#FFFFFF" : SELLER.ink }]}>{step.value.toLocaleString("en-ZA")}</Text>
            </View>
            {on ? <Text style={styles.funnelNote}>{i === 0 ? "Everyone who saw your reels" : `${carried}% of the step before, ${share}% of all views`}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  bar: { borderRadius: 7, width: "62%" },
  barSlot: { alignItems: "center", flex: 1, justifyContent: "flex-end" },
  bars: { alignItems: "flex-end", flexDirection: "row", marginTop: 40 },
  cell: { borderRadius: 7, flex: 1, height: 30 },
  cellOn: { borderColor: SELLER.ink, borderWidth: 2 },
  chart: { justifyContent: "flex-end" },
  donut: { alignItems: "center", flexDirection: "row", gap: 16 },
  donutBig: { color: SELLER.ink, fontSize: 24, fontWeight: "800" },
  donutCentre: { alignItems: "center", justifyContent: "center", left: 0, position: "absolute", top: 0 },
  donutLabel: { color: SELLER.inkSoft, fontSize: 12, maxWidth: 70 },
  funnel: { gap: 8 },
  funnelBar: { alignItems: "center", borderRadius: 10, flexDirection: "row", height: 38, justifyContent: "space-between", paddingHorizontal: 12 },
  funnelNote: { color: SELLER.inkSoft, fontSize: 12, marginTop: 3 },
  funnelRow: { gap: 0 },
  funnelText: { fontSize: 13, fontWeight: "800" },
  heat: { gap: 6 },
  heatCol: { flex: 1, textAlign: "center" },
  heatLabel: { width: 38 },
  heatNote: { color: SELLER.inkSoft, fontSize: 13, marginTop: 4 },
  heatRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  label: { color: SELLER.inkSoft, fontSize: 12, fontWeight: "600" },
  labelOn: { color: SELLER.ink, fontWeight: "800" },
  labels: { flexDirection: "row", justifyContent: "space-around", marginTop: 6 },
  legend: { flex: 1, gap: 4 },
  legendOn: { backgroundColor: "#E3ECEF" },
  legendRow: { alignItems: "center", borderRadius: 10, flexDirection: "row", gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
  legendText: { color: SELLER.ink, flex: 1, fontSize: 13, fontWeight: "700" },
  legendValue: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
  svg: { position: "absolute" },
  swatch: { borderRadius: 5, height: 10, width: 10 },
  tip: { backgroundColor: "#14232C", borderRadius: 12, gap: 1, padding: 8, position: "absolute", top: 0, zIndex: 3 },
  tipLine: { color: "rgba(255,255,255,0.78)", fontSize: 11 },
  tipTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
