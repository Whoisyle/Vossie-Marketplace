import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { seeded } from "@/theme/motion";

import { Contactless } from "../account/CardArt";
import { GooglePayFace } from "../account/PayFaces";

const APPLE_LOGO = require("../../../assets/banks/applepay-logo.png");

export type TapMethod = "apple-pay" | "google-pay";
type Stage = "confirm" | "verify" | "hold" | "done";

/** How long the phone waits at the reader before the demo counts the tap, and how long the tick shows. */
export const TAP_HOLD_MS = 2600;
export const TAP_DONE_MS = 1100;
/** How long the Face ID or unlock check takes before the phone is ready for the reader. */
export const TAP_VERIFY_MS = 1400;

/**
 * Demo of paying with the phone's wallet, built from the owner's references. Apple Pay: the sheet with the card and
 * amount, "double-click to pay", then "Hold Here to Pay" under a field of blue dots. Google Pay: "Hold to reader"
 * with the pulsing contactless mark and the card. Nothing is charged and no NFC is used; the tap is simulated after a
 * moment, or when the student taps the reader mark.
 */
export function TapToPay({
  amountCents,
  cardLabel,
  merchant,
  method,
  onCancel,
  onDone,
  visible,
}: {
  visible: boolean;
  method: TapMethod;
  amountCents: number;
  merchant: string;
  /** For example "Visa ending 4242". */
  cardLabel: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent={false} visible={visible}>
      {/* remounted each time it opens so the flow always starts from the first step */}
      <TapFlow amountCents={amountCents} cardLabel={cardLabel} key={`${method}-${visible}`} merchant={merchant} method={method} onCancel={onCancel} onDone={onDone} visible={visible} />
    </Modal>
  );
}

function TapFlow({ amountCents, cardLabel, merchant, method, onCancel, onDone, visible }: Parameters<typeof TapToPay>[0]) {
  const [stage, setStage] = useState<Stage>(method === "apple-pay" ? "confirm" : "verify");

  // Face ID (Apple Pay) or the phone unlock (Google Pay) comes before the phone is held to the reader
  useEffect(() => {
    if (!visible || stage !== "verify") return;
    const timer = setTimeout(() => {
      haptic.success();
      setStage("hold");
    }, TAP_VERIFY_MS);
    return () => clearTimeout(timer);
  }, [stage, visible]);

  useEffect(() => {
    if (!visible || stage !== "hold") return;
    const timer = setTimeout(() => {
      haptic.success();
      setStage("done");
    }, TAP_HOLD_MS);
    return () => clearTimeout(timer);
  }, [stage, visible]);

  useEffect(() => {
    if (!visible || stage !== "done") return;
    const timer = setTimeout(onDone, TAP_DONE_MS);
    return () => clearTimeout(timer);
  }, [onDone, stage, visible]);

  return method === "apple-pay" ? (
    <ApplePaySheet amountCents={amountCents} cardLabel={cardLabel} merchant={merchant} onCancel={onCancel} onConfirm={() => setStage("verify")} onTap={() => setStage("done")} stage={stage} />
  ) : (
    <GooglePayScreen amountCents={amountCents} onCancel={onCancel} onTap={() => setStage("done")} stage={stage} />
  );
}

export function ApplePaySheet({
  amountCents,
  cardLabel,
  merchant,
  onCancel,
  onConfirm,
  onTap,
  stage,
}: {
  stage: Stage;
  amountCents: number;
  cardLabel: string;
  merchant: string;
  onCancel: () => void;
  onConfirm: () => void;
  onTap: () => void;
}) {
  if (stage === "confirm") {
    return (
      <View style={styles.dark} testID="apple-pay-sheet">
        <View style={styles.sideHint} pointerEvents="none">
          <Text style={styles.sideText}>Double Click{"\n"}to Pay</Text>
          <View style={styles.sideBar} />
        </View>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Image accessibilityLabel="Apple Pay" contentFit="contain" source={APPLE_LOGO} style={styles.appleLogo} tintColor="#000000" />
            <Pressable accessibilityLabel="Cancel payment" accessibilityRole="button" hitSlop={10} onPress={onCancel} style={styles.close}>
              <Icon color="#6E6E73" name="x" size={16} />
            </Pressable>
          </View>
          <View style={styles.row}>
            <View style={styles.miniCard} />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{cardLabel}</Text>
              <Text style={styles.rowSub}>Default card</Text>
            </View>
          </View>
          <View style={styles.amountBlock}>
            <Text style={styles.rowSub}>{merchant}</Text>
            <Text style={styles.amountDark}>{formatRand(amountCents)}</Text>
          </View>
          <Pressable accessibilityLabel="Double-click the side button to pay" accessibilityRole="button" onPress={onConfirm} style={styles.confirm} testID="apple-confirm">
            <View style={styles.confirmIcon}>
              <Icon color="#0A84FF" name="corner-down-left" size={22} />
            </View>
            <Text style={styles.confirmText}>Confirm with Side Button</Text>
            <Text style={styles.demoNote}>Demo: tap here to double-click</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (stage === "verify") {
    return (
      <View style={[styles.dark, styles.verifyCentre]} testID="apple-pay-faceid">
        <View style={styles.glyphRing}>
          <Icon color="#FFFFFF" name="user" size={34} />
        </View>
        <Text style={styles.holdText}>Face ID</Text>
        <Text style={styles.demoOnDark}>Looking for your face…</Text>
      </View>
    );
  }
  return (
    <Pressable accessibilityLabel="Hold near the reader" disabled={stage === "done"} onPress={onTap} style={styles.dark} testID="apple-pay-hold">
      <BlueDots />
      {stage === "hold" ? (
        <View style={styles.holdTop}>
          <View style={styles.glyphRing}>
            <Contactless colour="#FFFFFF" size={34} />
          </View>
          <Text style={styles.holdText}>Hold Here to Pay</Text>
        </View>
      ) : (
        <View style={styles.holdTop}>
          <View style={[styles.glyphRing, styles.doneRing]}>
            <Icon color="#FFFFFF" name="check" size={34} />
          </View>
          <Text style={styles.holdText}>Done</Text>
        </View>
      )}
      <View style={styles.payCard}>
        <View style={styles.merchantIcon}>
          <Icon color="#FFFFFF" name="shopping-bag" size={26} />
        </View>
        <Text style={styles.payTo}>Pay {merchant}</Text>
        <Text style={styles.amountLight}>{formatRand(amountCents)}</Text>
      </View>
      <Text style={styles.demoOnDark}>Demo: no money moves. Tap anywhere to simulate the reader.</Text>
    </Pressable>
  );
}

/** The field of blue dots that twinkles at the top of the screen while the phone waits for the reader. */
function BlueDots() {
  const reduced = useReducedMotion();
  const dots = Array.from({ length: 70 }, (_, i) => ({ delay: seeded(i + 40) * 1500, left: seeded(i) * 100, size: 2 + seeded(i + 9) * 2.5, top: seeded(i + 21) * 34 }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {dots.map((dot, index) => (
        <Dot dot={dot} key={index} reduced={reduced} />
      ))}
    </View>
  );
}

function Dot({ dot, reduced }: { dot: { delay: number; left: number; size: number; top: number }; reduced: boolean }) {
  const glow = useSharedValue(0.55);
  useEffect(() => {
    if (reduced) return;
    glow.set(withDelay(dot.delay, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.25, { duration: 1100 })), -1)));
  }, [dot.delay, glow, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return <Animated.View style={[styles.dot, { borderRadius: dot.size, height: dot.size, left: `${dot.left}%`, top: `${dot.top}%`, width: dot.size }, style]} />;
}

export function GooglePayScreen({ amountCents, onCancel, onTap, stage }: { stage: Stage; amountCents: number; onCancel: () => void; onTap: () => void }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1500 }), -1));
  }, [pulse, reduced]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.get()), transform: [{ scale: 1 + pulse.get() * 0.6 }] }));
  if (stage === "verify") {
    return (
      <View style={[styles.light, styles.verifyCentre]} testID="google-pay-unlock">
        <View style={styles.googleGlyph}>
          <Icon color="#1A73E8" name="unlock" size={34} />
        </View>
        <Text style={styles.googleHold}>Unlock to pay</Text>
        <Text style={styles.googleNote}>Touch the fingerprint sensor or use your screen lock.</Text>
      </View>
    );
  }
  return (
    <View style={styles.light} testID="google-pay-screen">
      <View style={styles.googleBar}>
        <Pressable accessibilityLabel="Cancel payment" accessibilityRole="button" hitSlop={10} onPress={onCancel}>
          <Icon color="#202124" name="x" size={24} />
        </Pressable>
      </View>
      <Pressable accessibilityLabel="Hold to reader" disabled={stage === "done"} onPress={onTap} style={styles.googleCenter} testID="google-pay-hold">
        <View style={styles.googleGlyphWrap}>
          <Animated.View style={[styles.googleRing, ring]} />
          <View style={[styles.googleGlyph, stage === "done" && styles.googleGlyphDone]}>
            {stage === "done" ? <Icon color="#FFFFFF" name="check" size={36} /> : <Contactless colour="#1A73E8" size={38} />}
          </View>
        </View>
        <Text style={styles.googleHold}>{stage === "done" ? "Payment successful" : "Hold to reader"}</Text>
      </Pressable>
      <View style={styles.googleCard}>
        <GooglePayFace ready width={260} />
      </View>
      <Text style={styles.googleAmount}>{formatRand(amountCents)}</Text>
      <Text style={styles.googleNote}>Demo: no money moves. Tap the mark to simulate the reader.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amountBlock: { gap: 2, paddingHorizontal: 20, paddingVertical: 14 },
  amountDark: { color: "#000000", fontSize: 30, fontWeight: "700" },
  amountLight: { color: "#FFFFFF", fontSize: 42, fontWeight: "600", marginTop: 4 },
  appleLogo: { height: 28, width: 60 },
  close: { alignItems: "center", backgroundColor: "#E5E5EA", borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  confirm: { alignItems: "center", gap: 6, paddingBottom: 30, paddingTop: 12 },
  confirmIcon: { alignItems: "center", borderColor: "#0A84FF", borderRadius: 24, borderWidth: 2, height: 48, justifyContent: "center", width: 48 },
  confirmText: { color: "#000000", fontSize: 15, fontWeight: "500" },
  dark: { backgroundColor: "#000000", flex: 1, justifyContent: "flex-end" },
  demoNote: { color: "#8E8E93", fontSize: 11 },
  demoOnDark: { color: "rgba(255,255,255,0.45)", fontSize: 11, paddingBottom: 28, paddingTop: 14, textAlign: "center" },
  doneRing: { backgroundColor: "#30D158", borderColor: "#30D158" },
  dot: { backgroundColor: "#2F7BFF", position: "absolute" },
  flex: { flex: 1 },
  glyphRing: { alignItems: "center", borderColor: "#FFFFFF", borderRadius: 40, borderWidth: 1.5, height: 66, justifyContent: "center", width: 96 },
  googleAmount: { color: "#202124", fontSize: 40, fontWeight: "500", textAlign: "center" },
  googleBar: { paddingHorizontal: 20, paddingTop: 54 },
  googleCard: { alignItems: "center", marginVertical: 22 },
  googleCenter: { alignItems: "center", gap: 14, marginTop: 8 },
  googleGlyph: { alignItems: "center", backgroundColor: "#F1F6FE", borderColor: "#D2E3FC", borderRadius: 40, borderWidth: 2, height: 80, justifyContent: "center", width: 80 },
  googleGlyphDone: { backgroundColor: "#1E8E3E", borderColor: "#1E8E3E" },
  googleGlyphWrap: { alignItems: "center", height: 80, justifyContent: "center", width: 80 },
  googleHold: { color: "#5F6368", fontSize: 18 },
  googleNote: { color: "#80868B", fontSize: 12, marginTop: 14, textAlign: "center" },
  googleRing: { backgroundColor: "#1A73E8", borderRadius: 40, height: 80, position: "absolute", width: 80 },
  holdText: { color: "#FFFFFF", fontSize: 20, fontWeight: "500", marginTop: 12 },
  holdTop: { alignItems: "center", marginBottom: 90 },
  light: { backgroundColor: "#FFFFFF", flex: 1 },
  merchantIcon: { alignItems: "center", backgroundColor: "#F28C38", borderRadius: 40, height: 80, justifyContent: "center", width: 80 },
  miniCard: { backgroundColor: "#1A3C7A", borderRadius: 4, height: 28, width: 44 },
  payCard: { alignItems: "center", backgroundColor: "#2C2C2E", borderRadius: 28, gap: 14, marginHorizontal: 22, paddingVertical: 30 },
  payTo: { color: "#EBEBF5", fontSize: 18, marginTop: 8 },
  row: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, flexDirection: "row", gap: 14, marginHorizontal: 16, padding: 14 },
  rowSub: { color: "#8E8E93", fontSize: 13 },
  rowTitle: { color: "#000000", fontSize: 16, fontWeight: "600" },
  sheet: { backgroundColor: "#F2F2F7", borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 8, paddingTop: 16 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 6, paddingHorizontal: 18 },
  verifyCentre: { alignItems: "center", gap: 14, justifyContent: "center" },
  sideBar: { backgroundColor: "#FFFFFF", borderRadius: 3, height: 70, width: 6 },
  sideHint: { alignItems: "center", flexDirection: "row", gap: 12, position: "absolute", right: 0, top: 120 },
  sideText: { color: "#FFFFFF", fontSize: 18, textAlign: "right" },
});
