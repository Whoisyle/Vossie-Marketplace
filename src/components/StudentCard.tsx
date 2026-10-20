import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { formatStudentNumber } from "@/data/studentRecord";

/** A bank card is 54 x 85.6 mm held upright: it is 0.631 as wide as it is tall. */
export const CARD_ASPECT = 54 / 85.6;

/** Height of an upright card of the given width, at real card proportions. Every card in the app uses this. */
export function cardHeight(width: number): number {
  return Math.round(width / CARD_ASPECT);
}

/** Height of a horizontal card of the given width (bank and wallet cards). */
export function landscapeHeight(width: number): number {
  return Math.round(width * CARD_ASPECT);
}

const LOGO = require("../../assets/branding/eduvos-logo-white.png");
const HID = require("../../assets/branding/hid-badge.png");
const LOGO_ASPECT = 595 / 230;
const HID_ASPECT = 113 / 49;

/** Faint vertical streaks (position as a share of the width, width, opacity) that give the card face its brushed look. */
const STREAKS = [
  { left: 0.08, opacity: 0.05, width: 0.09 },
  { left: 0.3, opacity: 0.04, width: 0.14 },
  { left: 0.52, opacity: 0.06, width: 0.08 },
  { left: 0.7, opacity: 0.04, width: 0.15 },
  { left: 0.88, opacity: 0.05, width: 0.08 },
] as const;

/** The soft vertical streaks laid over a card face; shared by the student card and the Vossie Wallet card. */
export function CardStreaks() {
  return (
    <>
      {STREAKS.map((streak) => (
        <LinearGradient
          colors={["rgba(255,255,255,0)", `rgba(255,255,255,${streak.opacity})`, "rgba(255,255,255,0)"]}
          end={{ x: 1, y: 0 }}
          key={streak.left}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={{ bottom: 0, left: `${streak.left * 100}%`, position: "absolute", top: 0, width: `${streak.width * 100}%` }}
        />
      ))}
    </>
  );
}

/**
 * The digital student card: the Eduvos card from the owner's reference, held upright at real card size. A deep blue
 * face with soft vertical streaks, the Eduvos crest and wordmark at the top, the display name bottom left and the HID
 * badge bottom right. The student number comes from the Eduvos record (mock until the backend).
 */
export function StudentCard({
  campusName,
  name,
  studentNumber,
  verified = true,
  width = 200,
}: {
  name: string;
  studentNumber?: string;
  campusName: string;
  verified?: boolean;
  /** Width of the card; its height follows real card proportions. */
  width?: number;
}) {
  const height = cardHeight(width);
  const number = studentNumber ? formatStudentNumber(studentNumber) : "not available";
  const label = `Student card. ${name}. Student number ${number}. ${campusName}.${verified ? " Verified." : ""}`;
  const logoWidth = Math.round(width * 0.78);
  const hidWidth = Math.round(width * 0.17);

  return (
    <View accessibilityLabel={label} accessible style={[styles.card, { borderRadius: Math.round(width * 0.075), height, width }]} testID="student-card">
      <LinearGradient colors={["#083264", "#0A3A79", "#054088"]} end={{ x: 1, y: 0 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <CardStreaks />
      <Image accessibilityLabel="Eduvos" contentFit="contain" source={LOGO} style={{ height: logoWidth / LOGO_ASPECT, left: width * 0.1, position: "absolute", top: height * 0.05, width: logoWidth }} />
      <View style={[styles.bottom, { bottom: height * 0.05, left: width * 0.1, right: width * 0.1 }]}>
        <View style={styles.flex}>
          <Text style={[styles.label, { fontSize: Math.max(8, width * 0.048) }]}>DISPLAY NAME</Text>
          <Text numberOfLines={1} style={[styles.name, { fontSize: Math.max(13, width * 0.085) }]}>
            {name || "Vossie student"}
          </Text>
        </View>
        <Image accessibilityLabel="HID" contentFit="contain" source={HID} style={{ borderRadius: 2, height: hidWidth / HID_ASPECT, width: hidWidth }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { alignItems: "flex-end", flexDirection: "row", gap: 6, justifyContent: "space-between", position: "absolute" },
  card: {
    borderCurve: "continuous",
    boxShadow: "0 14px 32px rgba(5, 64, 136, 0.35)",
    overflow: "hidden",
  },
  flex: { flex: 1 },
  label: { color: "#04122A", fontWeight: "500", letterSpacing: 0.4 },
  name: { color: "#FFFFFF", fontWeight: "600" },
});
