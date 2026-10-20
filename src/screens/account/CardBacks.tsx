import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Wordmark } from "@/components/Wordmark";
import { FlipCard } from "@/components/FlipCard";
import { cardHeight, FLAT_RADIUS, landscapeHeight, StudentCard, UPRIGHT_RADIUS } from "@/components/StudentCard";
import type { Issuer } from "@/data/cardBrands";
import { formatStudentNumber } from "@/data/studentRecord";
import type { SavedCard } from "@/data/types";

import { SchemeLogo } from "./CardArt";

/** Back of each bank card: the card's own base colour, and whether the printing is light or dark. */
const BACKS: Record<string, { base: [string, string]; ink: string; stripe: string }> = {
  "african-bank": { base: ["#101010", "#0A0A0A"], ink: "#C8C8C8", stripe: "#000000" },
  absa: { base: ["#1C1419", "#120C10"], ink: "#D9CFD4", stripe: "#000000" },
  capitec: { base: ["#1E1E1E", "#141414"], ink: "#B89A3E", stripe: "#050505" },
  discovery: { base: ["#FFFFFF", "#F1EEE6"], ink: "#6B5A33", stripe: "#1A1A1A" },
  fnb: { base: ["#1B1C1E", "#101112"], ink: "#E4A81C", stripe: "#000000" },
  investec: { base: ["#9A9B9E", "#7C7D80"], ink: "#1C1C1E", stripe: "#1A1A1A" },
  nedbank: { base: ["#B9B49C", "#A29D86"], ink: "#3C392D", stripe: "#1A1A1A" },
  "standard-bank": { base: ["#243FA0", "#172A78"], ink: "#E8EEFF", stripe: "#050A1E" },
  tymebank: { base: ["#0B0F12", "#05070A"], ink: "#22E5CF", stripe: "#000000" },
};
const DEFAULT_BACK = { base: ["#22252B", "#14161A"] as [string, string], ink: "#D5D8DD", stripe: "#000000" };

/** Magnetic stripe plus the white signature panel with a masked security code, laid out like a real card back. */
function StripeAndPanel({ h, ink, stripe, w }: { h: number; ink: string; stripe: string; w: number }) {
  return (
    <>
      <View style={{ backgroundColor: stripe, height: h * 0.17, left: 0, position: "absolute", right: 0, top: h * 0.1 }} />
      <View style={[styles.panel, { height: h * 0.15, left: w * 0.06, right: w * 0.06, top: h * 0.38 }]}>
        <View style={styles.signature}>
          <Text style={[styles.signText, { fontSize: h * 0.05 }]}>AUTHORISED SIGNATURE</Text>
        </View>
        <View style={[styles.cvv, { width: w * 0.2 }]}>
          <Text style={{ color: "#1B1B1B", fontSize: h * 0.075, fontStyle: "italic", fontWeight: "700", letterSpacing: 2 }}>•••</Text>
        </View>
      </View>
      <Text style={{ color: ink, fontSize: h * 0.044, left: w * 0.06, opacity: 0.8, position: "absolute", top: h * 0.56 }}>CVV</Text>
    </>
  );
}

/** The back of a bank card: stripe, signature panel and the printed small print, in the card's own colours. */
export function BankBack({ card, issuer, width }: { card: SavedCard; issuer: Issuer; width: number }) {
  const h = landscapeHeight(width);
  const look = BACKS[issuer.id] ?? DEFAULT_BACK;
  return (
    <View style={[styles.frame, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-back">
      <LinearGradient colors={look.base} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <StripeAndPanel h={h} ink={look.ink} stripe={look.stripe} w={width} />
      <Text style={{ color: look.ink, fontSize: h * 0.05, left: width * 0.06, lineHeight: h * 0.07, opacity: 0.85, position: "absolute", right: width * 0.32, top: h * 0.66 }}>
        Issued by {issuer.name}. Not valid unless signed. Lost or stolen? Call your bank's 24-hour line.
      </Text>
      <Text style={{ bottom: h * 0.07, color: look.ink, fontSize: h * 0.05, left: width * 0.06, letterSpacing: 1, opacity: 0.85, position: "absolute" }}>
        •••• {card.last4}  ·  VALID THRU {card.expiry || "--/--"}
      </Text>
      <View style={{ bottom: h * 0.06, position: "absolute", right: width * 0.06 }}>
        <SchemeLogo brand={card.brand} size={h * 0.3} />
      </View>
    </View>
  );
}

/** Back of a card with no bank chosen: the plain scheme card with stripe and signature panel. */
export function SchemeBack({ card, width }: { card: SavedCard; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-back">
      <LinearGradient colors={card.brand === "visa" ? ["#1A1F71", "#0E1345"] : ["#1B1B1F", "#3A2A2A"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <StripeAndPanel h={h} ink="#E8EAF2" stripe="#000000" w={width} />
      <Text style={{ bottom: h * 0.07, color: "#E8EAF2", fontSize: h * 0.05, left: width * 0.06, letterSpacing: 1, opacity: 0.85, position: "absolute" }}>
        •••• {card.last4}  ·  VALID THRU {card.expiry || "--/--"}
      </Text>
      <View style={{ bottom: h * 0.06, position: "absolute", right: width * 0.06 }}>
        <SchemeLogo brand={card.brand} size={h * 0.3} />
      </View>
    </View>
  );
}

/** Back of the Vossie Wallet card, from the owner's black card reference: charcoal with a darker stripe. */
export function WalletBack({ width }: { width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-back">
      <LinearGradient colors={["#3A3A3C", "#2A2A2C"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={{ backgroundColor: "#1B1B1D", height: h * 0.17, left: 0, position: "absolute", right: 0, top: h * 0.12 }} />
      <View style={{ left: width * 0.07, position: "absolute", top: h * 0.4 }}>
        <Wordmark tone="white" width={Math.round(width * 0.3)} />
        <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: Math.max(8, h * 0.052), lineHeight: h * 0.075, marginTop: h * 0.05 }}>
          Your Vossie Wallet debit card. Spend your balance on campus, in the app and at checkout.
        </Text>
      </View>
      <Text style={{ bottom: h * 0.08, color: "#7A7A7D", fontSize: h * 0.1, fontWeight: "600", position: "absolute", right: width * 0.07 }}>debit</Text>
    </View>
  );
}

/** Back of the Apple Pay option: matte black with a short note on how to pay. */
export function ApplePayBack({ ready, width }: { ready: boolean; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { backgroundColor: "#121213", borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-back">
      <View style={{ backgroundColor: "#050505", height: h * 0.17, left: 0, position: "absolute", right: 0, top: h * 0.12 }} />
      <Text style={{ color: "#FFFFFF", fontSize: h * 0.075, fontWeight: "600", left: width * 0.07, position: "absolute", top: h * 0.4 }}>Apple Pay</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: h * 0.058, left: width * 0.07, lineHeight: h * 0.085, position: "absolute", right: width * 0.07, top: h * 0.53 }}>
        {ready ? "Double-click the side button, look at your iPhone and hold it near the reader." : "Apple Pay works on iPhone. On this phone, pick another way to pay."}
      </Text>
    </View>
  );
}

/** Back of the Google Pay option: white with a short note on how to pay. */
export function GooglePayBack({ ready, width }: { ready: boolean; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { backgroundColor: "#FFFFFF", borderColor: "#E3E6E8", borderRadius: width * FLAT_RADIUS, borderWidth: 1, height: h, width }]} testID="card-back">
      <View style={{ backgroundColor: "#E8EAED", height: h * 0.17, left: 0, position: "absolute", right: 0, top: h * 0.12 }} />
      <Text style={{ color: "#3C4043", fontSize: h * 0.075, fontWeight: "600", left: width * 0.07, position: "absolute", top: h * 0.4 }}>Google Pay</Text>
      <Text style={{ color: "#5F6368", fontSize: h * 0.058, left: width * 0.07, lineHeight: h * 0.085, position: "absolute", right: width * 0.07, top: h * 0.53 }}>
        {ready ? "Unlock your phone, then hold it near the reader." : "Google Pay works on Android. On this phone, pick another way to pay."}
      </Text>
    </View>
  );
}

/**
 * Back of the upright student card: the same blue as the front, a QR code of the student number on a white tile and
 * the return line. The QR is a stand-in for the Eduvos access code until the campus system is connected.
 */
export function StudentBack({ studentNumber, width }: { studentNumber?: string; width: number }) {
  const h = cardHeight(width);
  const qr = Math.round(width * 0.62);
  return (
    <View style={[styles.frame, { borderRadius: UPRIGHT_RADIUS * width, height: h, width }]} testID="student-card-back">
      <LinearGradient colors={["#083264", "#0A3A79", "#054088"]} end={{ x: 1, y: 0 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: "center", left: 0, position: "absolute", right: 0, top: h * 0.12 }}>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: width * 0.04, padding: width * 0.05 }}>
          <QRCode backgroundColor="#FFFFFF" color="#0A2A55" size={qr} value={`vossie-student:${studentNumber ?? "unknown"}`} />
        </View>
        <Text style={{ color: "#CFE0F5", fontSize: Math.max(8, width * 0.045), letterSpacing: 0.4, marginTop: h * 0.04 }}>STUDENT NUMBER</Text>
        <Text style={{ color: "#FFFFFF", fontSize: Math.max(13, width * 0.085), fontVariant: ["tabular-nums"], fontWeight: "600" }}>
          {studentNumber ? formatStudentNumber(studentNumber) : "not available"}
        </Text>
      </View>
      <Text style={{ bottom: h * 0.05, color: "#9DB8DA", fontSize: Math.max(7, width * 0.04), left: width * 0.1, lineHeight: Math.max(10, width * 0.055), position: "absolute", right: width * 0.1, textAlign: "center" }}>
        This card belongs to Eduvos. If found, please return it to any campus.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cvv: { alignItems: "center", backgroundColor: "#FFFFFF", justifyContent: "center" },
  frame: { borderCurve: "continuous", boxShadow: "0 12px 28px rgba(15, 20, 30, 0.3)", overflow: "hidden" },
  panel: { flexDirection: "row", position: "absolute" },
  signature: { backgroundColor: "#F2F0E8", flex: 1, justifyContent: "center", paddingHorizontal: 6 },
  signText: { color: "#9A968A", fontWeight: "600", letterSpacing: 0.6 },
});

/** The student card with its back: tap to turn it over. */
export function StudentCardFlip({ campusName, name, studentNumber, verified, width }: { name: string; studentNumber?: string; campusName: string; verified?: boolean; width: number }) {
  return (
    <FlipCard
      back={<StudentBack studentNumber={studentNumber} width={width} />}
      front={<StudentCard campusName={campusName} name={name} studentNumber={studentNumber} verified={verified} width={width} />}
      height={cardHeight(width)}
      label={`Student card for ${name}`}
      width={width}
    />
  );
}
