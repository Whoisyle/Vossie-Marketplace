import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { BandPanel, Rings } from "./Decor";
import { Icon, type IconName } from "./Icon";
import { corner, space } from "@/theme/tokens";

export type HeroTone = "slate" | "ink" | "warm" | "mist";

/** The hero's colours, all from the brand palette: slate and ink, the warm accent, and a lighter mist-blue. */
const TONES: Record<HeroTone, readonly [string, string]> = {
  ink: ["#2C4150", "#1E2A38"],
  mist: ["#6F8FA0", "#3F6173"],
  slate: ["#40677A", "#2F5A67"],
  warm: ["#DDA46A", "#A8692F"],
};

export type HeroChip = { label: string; icon?: IconName };

/**
 * The card at the top of a page: an icon in a slowly turning ring, a headline that says something about this page
 * right now ("2 open orders"), a line under it, and a few small facts as chips. The same look on every page, in the
 * tone that suits the area.
 */
export function PageHero({
  chips = [],
  icon,
  subtitle,
  testID,
  title,
  tone = "slate",
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  chips?: HeroChip[];
  tone?: HeroTone;
  testID?: string;
}) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    turn.set(withRepeat(withTiming(1, { duration: 22_000, easing: Easing.linear }), -1));
  }, [reduced, turn]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.wrap} testID={testID}>
      <BandPanel colours={TONES[tone]} style={styles.panel}>
        <View style={styles.row}>
          <View style={styles.medallionWrap}>
            <Animated.View style={[styles.ring, ring]}>
              <Rings size={74} />
            </Animated.View>
            <View style={styles.medallion}>
              <Icon color="#FFFFFF" name={icon} size={24} />
            </View>
          </View>
          <View style={styles.texts}>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            {subtitle ? (
              <Text numberOfLines={2} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {chips.length > 0 ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View key={chip.label} style={styles.chip}>
                {chip.icon ? <Icon color="#FFFFFF" name={chip.icon} size={12} /> : null}
                <Text style={styles.chipText}>{chip.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </BandPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: corner.pill, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  medallion: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  medallionWrap: { alignItems: "center", height: 74, justifyContent: "center", width: 74 },
  panel: { borderCurve: "continuous", borderRadius: corner.xl, padding: space.md },
  ring: { left: 0, position: "absolute", top: 0 },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 18 },
  texts: { flex: 1, gap: 2 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.2, lineHeight: 25 },
  wrap: { borderCurve: "continuous", borderRadius: corner.xl, boxShadow: "0 8px 20px rgba(30, 42, 56, 0.16)", marginBottom: space.sm, marginTop: space.xs },
});
