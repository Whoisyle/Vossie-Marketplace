import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { THIRD_PARTY_TIERS, deliveryOption, type DeliveryMode, type ThirdPartyTier } from "@/data/delivery";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { color, corner, space, text } from "@/theme/tokens";

/**
 * One group of items and how it gets to the student. "This campus" items can use a campus courier or collection;
 * items "from another campus" can only go hub to hub. Either can use a third-party courier, and choosing that
 * opens three choices (economy, standard, express).
 */
export function DeliveryGroup({
  items,
  mode,
  modes,
  onMode,
  onTier,
  testPrefix,
  tier,
  title,
}: {
  title: string;
  items: string;
  modes: DeliveryMode[];
  mode: DeliveryMode;
  tier: ThirdPartyTier;
  onMode: (mode: DeliveryMode) => void;
  onTier: (tier: ThirdPartyTier) => void;
  testPrefix: string;
}) {
  return (
    <View style={styles.group} testID={`${testPrefix}-group`}>
      <Text style={styles.title}>{title}</Text>
      <Text numberOfLines={2} style={text.caption}>
        {items}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.modes}>
        {modes.map((candidate, index) => (
          <ModeCard
            key={candidate}
            mode={candidate}
            onPress={() => {
              haptic.select();
              onMode(candidate);
            }}
            recommended={index === 0}
            selected={mode === candidate}
            tier={tier}
            testID={`${testPrefix}-${candidate}`}
          />
        ))}
      </View>
      {mode === "third-party" ? (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.tiers} testID={`${testPrefix}-tiers`}>
          <Text style={styles.tiersTitle}>Choose your courier option</Text>
          {THIRD_PARTY_TIERS.map((option) => {
            const selected = tier === option.id;
            return (
              <Pressable
                accessibilityLabel={`${option.label}, ${formatRand(option.feeCents)}, ${option.eta}. ${option.detail}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={option.id}
                onPress={() => {
                  haptic.select();
                  onTier(option.id);
                }}
                style={[styles.tier, selected && styles.tierSelected]}
                testID={`${testPrefix}-tier-${option.id}`}
              >
                <View style={styles.flex}>
                  <Text style={[styles.tierLabel, selected && styles.onDark]}>{option.label}</Text>
                  <Text style={[styles.tierMeta, selected && styles.onDark]}>
                    {option.eta} · {option.detail}
                  </Text>
                </View>
                <Text style={[styles.tierPrice, selected && styles.onDark]}>{formatRand(option.feeCents)}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

function ModeCard({
  mode,
  onPress,
  recommended,
  selected,
  testID,
  tier,
}: {
  mode: DeliveryMode;
  recommended: boolean;
  selected: boolean;
  onPress: () => void;
  testID: string;
  tier: ThirdPartyTier;
}) {
  const option = deliveryOption(mode);
  const isThird = mode === "third-party";
  const fee = isThird ? THIRD_PARTY_TIERS.find((item) => item.id === tier)!.feeCents : option.feeCents;
  const price = isThird ? `From ${formatRand(THIRD_PARTY_TIERS[0]!.feeCents)}` : fee ? formatRand(fee) : "Free";
  return (
    <Pressable
      accessibilityLabel={`${option.label}, ${price}, ${option.eta}. ${option.detail}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.mode, selected && styles.modeSelected]}
      testID={testID}
    >
      <View style={styles.modeTop}>
        <Text style={[styles.modeLabel, selected && styles.onDark]}>{option.label}</Text>
        {recommended ? (
          <View style={[styles.tag, selected && styles.tagOn]}>
            <Text style={[styles.tagText, selected && styles.onDark]}>Recommended</Text>
          </View>
        ) : null}
        <Text style={[styles.modePrice, selected && styles.onDark]}>{price}</Text>
      </View>
      <Text style={[styles.modeMeta, selected && styles.onDark]}>
        {isThird ? "Pick economy, standard or express" : `${option.eta} · ${option.detail}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: space.xs, marginTop: space.sm },
  mode: { backgroundColor: color.surfaceSoft, borderCurve: "continuous", borderRadius: corner.md, gap: 2, minHeight: 64, padding: space.sm },
  modeLabel: { color: color.heading, fontSize: 15, fontWeight: "700" },
  modeMeta: { color: color.textSecondary, fontSize: 12 },
  modePrice: { color: color.heading, fontSize: 15, fontWeight: "700", marginLeft: "auto" },
  modeSelected: { backgroundColor: color.accent },
  modeTop: { alignItems: "center", flexDirection: "row", gap: space.xs },
  modes: { gap: space.xs },
  onDark: { color: color.onPrimary },
  tag: { backgroundColor: color.surfaceIcon, borderRadius: corner.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagOn: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  tagText: { color: color.heading, fontSize: 10, fontWeight: "700" },
  tier: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderCurve: "continuous",
    borderRadius: corner.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: space.sm,
    minHeight: 56,
    padding: space.sm,
  },
  tierLabel: { color: color.heading, fontSize: 15, fontWeight: "700" },
  tierMeta: { color: color.textSecondary, fontSize: 12 },
  tierPrice: { color: color.heading, fontSize: 15, fontWeight: "800" },
  tierSelected: { backgroundColor: color.primary, borderColor: color.primary },
  tiers: { gap: space.xs, paddingLeft: space.sm },
  tiersTitle: { ...text.caption, fontWeight: "700" },
  title: { color: color.heading, fontSize: 15, fontWeight: "700" },
});
