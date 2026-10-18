import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { formatStudentNumber } from "@/data/studentRecord";
import { color, corner, gradient, space } from "@/theme/tokens";

import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

/**
 * The digital student card: navy gradient, wordmark, name, student number and campus. Used on the Verified
 * screen and at the top of Account. The student number comes from the Eduvos record (mock until the backend).
 */
export function StudentCard({
  avatarUri,
  campusName,
  name,
  studentNumber,
  verified = true,
}: {
  name: string;
  studentNumber?: string;
  campusName: string;
  avatarUri?: string;
  verified?: boolean;
}) {
  return (
    <View
      accessibilityLabel={`Student card. ${name}. Student number ${studentNumber ? formatStudentNumber(studentNumber) : "not available"}. ${campusName}.${verified ? " Verified." : ""}`}
      accessible
      style={styles.card}
      testID="student-card"
    >
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
          <Text style={styles.number}>{studentNumber ? formatStudentNumber(studentNumber) : "—"}</Text>
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
  verified: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.pill, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { color: color.ink, fontSize: 11, fontWeight: "800" },
});
