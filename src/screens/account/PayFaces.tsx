import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { FLAT_RADIUS, landscapeHeight } from "@/components/StudentCard";
import { Wordmark } from "@/components/Wordmark";
import { formatRand } from "@/data/format";

import { Chip, Contactless } from "./CardArt";

const ART = {
  appleLogo: require("../../../assets/banks/applepay-logo.png"),
  googleArt: require("../../../assets/banks/googlepay-art.png"),
  googleLogo: require("../../../assets/banks/googlepay-logo.png"),
};

/** Apple Pay option: matte black with the white Apple Pay mark. The pay flow itself is in `cart/TapToPay`. */
export function ApplePayFace({ ready, width }: { ready: boolean; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-face">
      <LinearGradient colors={["#242426", "#141415", "#0A0A0B"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Image accessibilityLabel="Apple Pay" contentFit="contain" source={ART.appleLogo} style={{ height: (width * 0.34 * 104) / 220, left: width * 0.06, position: "absolute", top: h * 0.08, width: width * 0.34 }} />
      <View style={{ position: "absolute", right: width * 0.06, top: h * 0.1 }}>
        <Contactless colour="#FFFFFF" size={h * 0.12} />
      </View>
      <View style={{ bottom: h * 0.09, left: width * 0.06, position: "absolute" }}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.11, fontWeight: "600" }}>{ready ? "Double-click to pay" : "Not on this phone"}</Text>
        <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: h * 0.07, marginTop: 2 }}>{ready ? "Face ID or side button" : "iPhone only"}</Text>
      </View>
    </View>
  );
}

/** Google Pay option: white with the G Pay mark and Google's loop artwork. */
export function GooglePayFace({ ready, width }: { ready: boolean; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, styles.light, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="card-face">
      <Image accessibilityLabel="Google Pay" contentFit="contain" source={ART.googleLogo} style={{ height: (width * 0.28 * 76) / 175, left: width * 0.06, position: "absolute", top: h * 0.08, width: width * 0.28 }} />
      <Image contentFit="contain" source={ART.googleArt} style={{ bottom: 0, height: h * 0.58, position: "absolute", right: width * 0.04, width: (h * 0.58 * 440) / 342 }} />
      <View style={{ bottom: h * 0.09, left: width * 0.06, position: "absolute" }}>
        <Text style={{ color: "#3C4043", fontSize: h * 0.11, fontWeight: "600" }}>{ready ? "Hold to reader" : "Not on this phone"}</Text>
        <Text style={{ color: "#5F6368", fontSize: h * 0.07, marginTop: 2 }}>{ready ? "Tap to pay" : "Android only"}</Text>
      </View>
    </View>
  );
}

/**
 * Vossie Wallet card: the owner's black blank card. Matte charcoal, a silver chip on the left, the sweep of fine lines
 * on the right and "debit" low on the right, with the balance printed where a name would be.
 */
export function VossieWalletFace({ balanceCents, width }: { balanceCents: number; width: number }) {
  const h = landscapeHeight(width);
  return (
    <View style={[styles.frame, { borderRadius: width * FLAT_RADIUS, height: h, width }]} testID="wallet-balance-card">
      <LinearGradient colors={["#2C2C2E", "#363638", "#404042"]} end={{ x: 1, y: 0.2 }} pointerEvents="none" start={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={width}>
        {Array.from({ length: 38 }, (_, i) => {
          const t = i / 37;
          return (
            <Path
              d={`M ${width * (0.52 + t * 0.2)} ${h} C ${width * (0.62 + t * 0.12)} ${h * 0.55}, ${width * (0.7 + t * 0.12)} ${h * (0.1 + t * 0.1)}, ${width * (0.86 + t * 0.16)} ${-h * 0.05}`}
              fill="none"
              key={i}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={0.8}
            />
          );
        })}
      </Svg>
      <View style={{ left: width * 0.07, position: "absolute", top: h * 0.09 }}>
        <Wordmark tone="white" width={Math.round(width * 0.26)} />
      </View>
      <View style={{ left: width * 0.07, position: "absolute", top: h * 0.33 }}>
        <Chip colour="#C9CACC" width={(11.2 * width) / 85.6} />
      </View>
      <View style={{ bottom: h * 0.09, left: width * 0.07, position: "absolute" }}>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: Math.max(8, h * 0.055), fontWeight: "500", letterSpacing: 0.5 }}>WALLET BALANCE</Text>
        <Text numberOfLines={1} style={{ color: "#FFFFFF", fontSize: Math.max(16, h * 0.16), fontVariant: ["tabular-nums"], fontWeight: "700" }}>
          {formatRand(balanceCents)}
        </Text>
      </View>
      <Text style={{ bottom: h * 0.09, color: "#6F6F72", fontSize: h * 0.1, fontWeight: "600", position: "absolute", right: width * 0.07 }}>debit</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderCurve: "continuous", boxShadow: "0 12px 28px rgba(15, 20, 30, 0.3)", overflow: "hidden" },
  light: { backgroundColor: "#FFFFFF", borderColor: "#E3E6E8", borderWidth: 1 },
});
