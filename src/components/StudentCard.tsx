import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { formatStudentNumber } from "@/data/studentRecord";
import { color, corner, gradient, space } from "@/theme/tokens";

import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

/** A bank card is 85.6 x 54 mm. Landscape it is 1.585 wide for every 1 high; held upright the width is 0.631 of the height. */
export const CARD_RATIO = 85.6 / 54;
export const CARD_ASPECT = 54 / 85.6;

/** Height of an upright card of the given width, at real card proportions. */
export function cardHeight(width: number): number {
  return Math.round(width / CARD_ASPECT);
}

/** Height of a landscape card of the given width, at real card proportions. */
export function landscapeHeight(width: number): number {
  return Math.round(width / CARD_RATIO);
}

/** What the card's QR code holds: the student number, so campus staff can look the student up. */
export function studentQrValue(studentNumber?: string): string {
  return `vossie://student/${(studentNumber ?? "").replace(/\D/g, "")}`;
}

/**
 * The digital student card. `vertical` is the upright card at real card size: a deep navy face with soft curved
 * shapes, the student's photo, name, student number and campus, the Vossie wordmark and a QR code. The default is
 * the compact horizontal strip. The student number comes from the Eduvos record (mock until the backend).
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
    const height = cardHeight(width);
    const qr = Math.round(width * 0.27);
    return (
      <View accessibilityLabel={label} accessible style={[styles.upright, { height, width }]} testID="student-card">
        <LinearGradient colors={["#14233A", "#0B1626"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        {/* the soft curved shapes at the top of the card */}
        <View pointerEvents="none" style={[styles.shapeA, { height: width * 1.25, width: width * 1.25 }]}>
          <LinearGradient colors={["#1F3A5F", "#16294A"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        <View pointerEvents="none" style={[styles.shapeB, { height: width * 0.95, width: width * 0.95 }]}>
          <LinearGradient colors={["#25497A", "#1B3558"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>

        <View style={styles.uTop}>
          <View style={styles.uPhotoRing}>
            <Avatar name={name} size={Math.round(width * 0.3)} uri={avatarUri} />
          </View>
          {verified ? (
            <View style={styles.verified}>
              <Icon color={color.ink} name="check-circle" size={12} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.uText}>
          <Text style={styles.uKind}>STUDENT CARD</Text>
          <Text numberOfLines={2} style={styles.uName}>
            {name || "Vossie student"}
          </Text>
          <Text style={styles.uSub}>Eduvos student · {campusName}</Text>
          <Text style={styles.uLabel}>STUDENT NUMBER</Text>
          <Text style={styles.uNumber}>{number}</Text>
        </View>

        <View style={styles.uBottom}>
          <Wordmark tone="white" width={Math.round(width * 0.42)} />
          <View accessibilityLabel="Student QR code" style={styles.qrTile}>
            <QRCode backgroundColor="#FFFFFF" color="#0B1626" size={qr} value={studentQrValue(studentNumber)} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={label} accessible style={styles.card} testID="student-card">
      <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
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
      <Text numberOfLines={1} style={styles.campusText}>
        {campusName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  campusText: { color: color.mist, fontSize: 13 },
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
  qrTile: { backgroundColor: "#FFFFFF", borderRadius: 10, padding: 6 },
  shapeA: { borderRadius: 400, opacity: 0.9, overflow: "hidden", position: "absolute", right: "-38%", top: "-20%" },
  shapeB: { borderRadius: 400, bottom: "34%", left: "-30%", opacity: 0.55, overflow: "hidden", position: "absolute" },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  uBottom: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: "auto" },
  uKind: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  uLabel: { color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: "700", letterSpacing: 2, marginTop: space.xs },
  uName: { color: color.onPrimary, fontSize: 22, fontWeight: "800", lineHeight: 27 },
  uNumber: { color: color.onPrimary, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "800", letterSpacing: 1.5 },
  uPhotoRing: { alignItems: "center", borderColor: "rgba(255,255,255,0.35)", borderRadius: 60, borderWidth: 3, justifyContent: "center", padding: 3 },
  uSub: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  uText: { gap: 2, marginTop: space.md },
  uTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  upright: {
    borderCurve: "continuous",
    borderRadius: 18,
    boxShadow: "0 18px 36px rgba(11, 22, 38, 0.4)",
    overflow: "hidden",
    padding: space.md,
  },
  verified: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.pill, flexDirection: "row", gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { color: color.ink, fontSize: 11, fontWeight: "800" },
});
