import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components";
import { issuers } from "@/data/cardBrands";
import { haptic } from "@/lib/haptics";
import { color, corner, space } from "@/theme/tokens";

/** The gold EMV chip on a bank card. */
export function Chip({ colour = "#D8B65A", size = 1 }: { colour?: string; size?: number }) {
  const w = 38 * size;
  const h = 29 * size;
  const line = { backgroundColor: "rgba(120, 85, 20, 0.55)", position: "absolute" } as const;
  return (
    <View accessibilityElementsHidden style={{ backgroundColor: colour, borderRadius: 5 * size, height: h, overflow: "hidden", width: w }}>
      <View style={{ ...line, height: 1, left: 0, right: 0, top: h * 0.34 }} />
      <View style={{ ...line, height: 1, left: 0, right: 0, top: h * 0.66 }} />
      <View style={{ ...line, bottom: 0, left: w * 0.36, top: 0, width: 1 }} />
      <View style={{ ...line, bottom: 0, left: w * 0.64, top: 0, width: 1 }} />
      <View style={{ borderColor: "rgba(120, 85, 20, 0.55)", borderRadius: 3 * size, borderWidth: 1, height: h * 0.4, left: w * 0.36, position: "absolute", top: h * 0.3, width: w * 0.28 }} />
    </View>
  );
}

/** The contactless waves printed on tap-to-pay cards. */
export function Contactless({ colour = "#FFFFFF", size = 22 }: { colour?: string; size?: number }) {
  return (
    <View accessibilityElementsHidden style={{ transform: [{ rotate: "90deg" }] }}>
      <Icon color={colour} name="wifi" size={size} />
    </View>
  );
}

/** Visa and Mastercard marks drawn in code; the official artwork replaces these before release. */
export function SchemeLogo({ brand, size = 60, tone = "white" }: { brand: "visa" | "mastercard"; size?: number; tone?: "white" | "gold" }) {
  if (brand === "mastercard") {
    const d = size * 0.5;
    return (
      <View accessibilityElementsHidden style={styles.mc}>
        <View style={{ backgroundColor: "#EB001B", borderRadius: d / 2, height: d, width: d }} />
        <View style={{ backgroundColor: "#F79E1B", borderRadius: d / 2, height: d, marginLeft: -d * 0.4, opacity: 0.92, width: d }} />
      </View>
    );
  }
  return (
    <Text accessibilityElementsHidden style={{ color: tone === "gold" ? "#B08A42" : "#FFFFFF", fontSize: size * 0.4, fontStyle: "italic", fontWeight: "900", letterSpacing: -0.5 }}>
      VISA
    </Text>
  );
}

/** Pick which bank issued a card, so the card is drawn in that bank's colours. */
export function IssuerPicker({ onChange, value }: { value?: string; onChange: (id: string | undefined) => void }) {
  return (
    <View accessibilityLabel="Card issuer" style={styles.picker}>
      {[...issuers, undefined].map((issuer) => {
        const selected = (issuer?.id ?? undefined) === value;
        return (
          <Pressable
            accessibilityLabel={issuer ? issuer.name : "Other bank"}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={issuer?.id ?? "other"}
            onPress={() => {
              haptic.select();
              onChange(issuer?.id);
            }}
            style={[styles.option, selected && styles.optionOn]}
          >
            <View style={[styles.swatch, { backgroundColor: issuer?.swatch ?? color.mist }]} />
            <Text style={[styles.optionText, selected && styles.optionTextOn]}>{issuer ? issuer.name : "Other"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  mc: { alignItems: "center", flexDirection: "row" },
  option: { alignItems: "center", borderColor: color.borderStrong, borderRadius: corner.pill, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 36, paddingHorizontal: space.sm },
  optionOn: { backgroundColor: color.surfaceSoft, borderColor: color.primary },
  optionText: { color: color.heading, fontSize: 13, fontWeight: "600" },
  optionTextOn: { fontWeight: "800" },
  picker: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  swatch: { borderRadius: 6, height: 12, width: 12 },
});
