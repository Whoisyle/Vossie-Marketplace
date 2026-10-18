import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { formatStudentNumber } from "@/data/studentRecord";
import { seeded } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

/** A bank card is 85.6 x 54 mm; held upright the width is 0.631 of the height. */
export const CARD_ASPECT = 54 / 85.6;

/** Height of an upright card of the given width, at real card proportions. */
export function cardHeight(width: number): number {
  return Math.round(width / CARD_ASPECT);
}

const BARS = Array.from({ length: 34 }, (_, index) => 1 + Math.round(seeded(index + 5) * 3));

/**
 * The digital student card: navy gradient, wordmark, name, student number and campus. `vertical` is the
 * full-size upright card shown on the Verified screen; the default is the compact one at the top of Account.
 * The student number comes from the Eduvos record (mock until the backend).
 */
export function StudentCard({
  avatarUri,
  campusName,
  name,
  studentNumber,
  verified = true,
  vertical = false,
  width = 270,
}: {
  name: string;
  studentNumber?: string;
  campusName: string;
  avatarUri?: string;
  verified?: boolean;
  vertical?: boolean;
  /** Width of the upright card; its height follows real card proportions. */
  width?: number;
}) {
  const number = studentNumber ? formatStudentNumber(studentNumber) : "—";
  const label = `Student card. ${name}. Student number ${studentNumber ? number : "not available"}. ${campusName}.${verified ? " Verified." : ""}`;

  if (vertical) {
    return (
      <View accessibilityLabel={label} accessible style={[styles.upright, { height: cardHeight(width), width }]} testID="student-card">
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.uBubbleA} />
        <View pointerEvents="none" style={styles.uBubbleB} />
        <View style={styles.uTop}>
          <Wordmark tone="white" width={110} />
          <Text style={styles.kind}>STUDENT CARD</Text>
        </View>
        <View style={styles.uPhoto}>
          <View style={styles.uPhotoRing}>
            <Avatar name={name} size={112} uri={avatarUri} />
          </View>
        </View>
        <View style={styles.uIdentity}>
          <Text numberOfLines={2} style={styles.uName}>
            {name || "Vossie student"}
          </Text>
          <Text style={styles.uLabel}>STUDENT NUMBER</Text>
          <Text style={styles.uNumber}>{number}</Text>
        </View>
        <View style={styles.uCampus}>
          <Icon color={color.mist} name="map-pin" size={14} />
          <Text numberOfLines={1} style={styles.campusText}>
            {campusName}
          </Text>
        </View>
        <View style={styles.uFooter}>
          <View style={styles.bars}>
            {BARS.map((weight, index) => (
              <View key={index} style={[styles.bar, { width: weight }]} />
            ))}
          </View>
          {verified ? (
            <View style={styles.verified}>
              <Icon color={color.ink} name="check-circle" size={12} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={label} accessible style={styles.card} testID="student-card">
      <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.bubbleA} />
      <View pointerEvents="none" style={styles.bubbleB} />
      <View style={styles.top}>
        <Wordmark tone="white" width={92} />
        <Text style={styles.kind}>STUDENT</Text>
      </View>
      <View style={styles.middle}>
        <Avatar name={name} size={52} uri={avatarUri} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.name}>
            {name || "Vossie student"}
          </Text>
          <Text style={styles.number}>{number}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.campus}>
          <Icon color={color.mist} name="map-pin" size={12} />
          <Text numberOfLines={1} style={styles.campusText}>
            {campusName}
          </Text>
        </View>
        {verified ? (
          <View style={styles.verified}>
            <Icon color={color.ink} name="check-circle" size={12} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.mist, height: 26, opacity: 0.85 },
  bars: { alignItems: "center", flexDirection: "row", gap: 2, height: 26, overflow: "hidden", width: "100%" },
  bottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  bubbleA: { backgroundColor: "rgba(183, 196, 204, 0.12)", borderRadius: 70, height: 140, position: "absolute", right: -30, top: -50, width: 140 },
  bubbleB: { backgroundColor: "rgba(183, 196, 204, 0.08)", borderRadius: 50, bottom: -40, height: 100, left: -20, position: "absolute", width: 100 },
  campus: { alignItems: "center", flex: 1, flexDirection: "row", gap: 4 },
  campusText: { color: color.mist, flex: 1, fontSize: 13 },
  card: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 12px 28px rgba(30, 42, 56, 0.3)",
    gap: space.md,
    overflow: "hidden",
    padding: space.md,
  },
  flex: { flex: 1, gap: 2 },
  kind: { color: color.mist, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  middle: { alignItems: "center", flexDirection: "row", gap: space.sm },
  name: { color: color.onPrimary, fontSize: 18, fontWeight: "700" },
  number: { color: color.onPrimary, fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: 1 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  uBubbleA: { backgroundColor: "rgba(183, 196, 204, 0.12)", borderRadius: 120, height: 240, position: "absolute", right: -80, top: -70, width: 240 },
  uBubbleB: { backgroundColor: "rgba(183, 196, 204, 0.08)", borderRadius: 90, bottom: -60, height: 180, left: -50, position: "absolute", width: 180 },
  uCampus: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center" },
  uFooter: { alignItems: "center", gap: space.sm, marginTop: "auto" },
  uIdentity: { alignItems: "center", gap: 3 },
  uLabel: { color: color.mist, fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: space.xs },
  uName: { color: color.onPrimary, fontSize: 22, fontWeight: "800", textAlign: "center" },
  uNumber: { color: color.onPrimary, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: 1.5 },
  uPhoto: { alignItems: "center" },
  uPhotoRing: { alignItems: "center", borderColor: "rgba(183, 196, 204, 0.55)", borderRadius: 66, borderWidth: 3, height: 124, justifyContent: "center", width: 124 },
  uTop: { alignItems: "center", gap: 6 },
  upright: {
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 18px 36px rgba(30, 42, 56, 0.35)",
    gap: space.sm,
    overflow: "hidden",
    padding: space.md,
  },
  verified: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.pill, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { color: color.ink, fontSize: 11, fontWeight: "800" },
});
