import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components";
import type { PaymentMethod } from "@/data/types";
import { color } from "@/theme/tokens";

export type BrandKind = PaymentMethod | "visa" | "mastercard";

/**
 * Small payment marks drawn in code. They are stand-ins: the official Visa, Mastercard, Apple Pay and
 * Google Pay artwork must be supplied before release (each scheme has usage rules).
 */
export function BrandMark({ kind }: { kind: BrandKind }) {
  if (kind === "mastercard") {
    return (
      <View accessibilityElementsHidden style={[styles.tile, styles.light]}>
        <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
        <View style={[styles.circle, styles.overlap, { backgroundColor: "#F79E1B", opacity: 0.9 }]} />
      </View>
    );
  }
  if (kind === "visa" || kind === "card") {
    return (
      <View accessibilityElementsHidden style={[styles.tile, { backgroundColor: "#1A1F71" }]}>
        <Text style={styles.visa}>VISA</Text>
      </View>
    );
  }
  if (kind === "apple-pay") {
    return (
      <View accessibilityElementsHidden style={[styles.tile, { backgroundColor: "#000000" }]}>
        <Text style={styles.pay}>Pay</Text>
      </View>
    );
  }
  if (kind === "google-pay") {
    return (
      <View accessibilityElementsHidden style={[styles.tile, styles.light]}>
        <Text style={[styles.pay, { color: "#3C4043" }]}>G Pay</Text>
      </View>
    );
  }
  if (kind === "wallet") {
    return (
      <View accessibilityElementsHidden style={[styles.tile, { backgroundColor: color.primary }]}>
        <Icon color={color.onPrimary} name="credit-card" size={16} />
      </View>
    );
  }
  return (
    <View accessibilityElementsHidden style={[styles.tile, { backgroundColor: color.ink }]}>
      <Icon color={color.onPrimary} name="repeat" size={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 10, height: 20, width: 20 },
  light: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: color.border, borderWidth: 1, flexDirection: "row", justifyContent: "center" },
  overlap: { marginLeft: -8 },
  pay: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  tile: { alignItems: "center", borderRadius: 6, height: 30, justifyContent: "center", width: 44 },
  visa: { color: "#FFFFFF", fontSize: 11, fontStyle: "italic", fontWeight: "800" },
});
