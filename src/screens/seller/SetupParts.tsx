import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { initials } from "@/data/format";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { color } from "@/theme/tokens";
import type { SellerDelivery, SellerKind } from "@/seller/types";

import { StepBar } from "./motion";
import { Hero } from "./Packaging";

export const DELIVERY_LABELS: Record<SellerDelivery, string> = {
  both: "Courier and collection",
  collection: "Collection only",
  courier: "Campus courier",
};

/**
 * The top of each setup step: back arrow, "01 / 03" with the progress bar, a small drawn object floating on its podium,
 * and the step's title and one line under it.
 */
export function SetupHeader({ art, step, subtitle, title }: { art: 0 | 1 | 2; step: 1 | 2 | 3; subtitle: string; title: string }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    float.set(withRepeat(withSequence(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })), -1));
  }, [float, reduced]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -float.get() * 6 }] }));

  return (
    <View style={styles.top}>
      <View style={styles.row}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.back}>
          <Icon color="#FFFFFF" name="arrow-left" size={18} />
        </Pressable>
        <Text style={styles.count}>{`0${step} / 03`}</Text>
        <View style={styles.bar}>
          <StepBar step={step} />
        </View>
      </View>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={styles.eyebrow}>Seller setup</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Animated.View pointerEvents="none" style={[styles.art, bob]}>
          <Hero index={art} scale={0.42} />
        </Animated.View>
      </View>
    </View>
  );
}

/** A small card that builds up as the seller answers: what buyers will see. */
export function StorePreview({
  banner,
  campusId,
  delivery,
  kind,
  logo,
  name,
}: {
  name: string;
  kind: SellerKind | null;
  campusId?: CampusId;
  delivery?: SellerDelivery;
  logo?: string;
  banner?: string;
}) {
  const kindLabel = kind === "student" ? "Student seller" : kind === "campus-business" ? "Campus business" : null;
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.preview} testID="store-preview">
      <Text style={styles.previewLabel}>How buyers will see you</Text>
      <View style={styles.banner}>
        {banner ? (
          <Image contentFit="cover" source={{ uri: banner }} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={["#8B9DA6", "#586879"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        )}
      </View>
      <View style={styles.logoWrap}>
        <View style={styles.logo}>{logo ? <Image contentFit="cover" source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <Text style={styles.logoText}>{initials(name || "Your store")}</Text>}</View>
      </View>
      <View style={styles.previewBody}>
        <Text numberOfLines={1} style={[styles.previewName, !name.trim() && styles.previewEmpty]}>
          {name.trim() || "Your store name"}
        </Text>
        <View style={styles.chips}>
          {kindLabel ? <PreviewChip icon="user" label={kindLabel} /> : null}
          {campusId ? <PreviewChip icon="map-pin" label={getCampusName(campusId)} /> : null}
          {delivery ? <PreviewChip icon="truck" label={DELIVERY_LABELS[delivery]} /> : null}
          {!kindLabel && !campusId && !delivery ? <Text style={styles.hint}>Answer the questions above and your store card fills in.</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
}

function PreviewChip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.chip}>
      <Icon color={color.slate} name={icon} size={13} />
      <Text numberOfLines={1} style={styles.chipText}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  art: { marginRight: -26, marginTop: -8 },
  back: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  banner: { height: 74, overflow: "hidden" },
  bar: { flex: 1 },
  chip: { alignItems: "center", backgroundColor: color.sage, borderRadius: 14, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: color.slate, fontSize: 12, fontWeight: "700", maxWidth: 170 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  count: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  eyebrow: { color: color.steelGrey, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  headRow: { alignItems: "center", flexDirection: "row", marginTop: 14 },
  headText: { flex: 1 },
  hint: { color: color.steelGrey, fontSize: 12.5 },
  logo: { alignItems: "center", backgroundColor: color.sage, borderColor: "#FFFFFF", borderRadius: 28, borderWidth: 3, height: 56, justifyContent: "center", overflow: "hidden", width: 56 },
  logoText: { color: color.slate, fontSize: 18, fontWeight: "800" },
  logoWrap: { marginLeft: 16, marginTop: -28 },
  preview: { backgroundColor: "rgba(243,247,248,0.97)", borderRadius: 24, boxShadow: "0 14px 28px rgba(8,18,24,0.35)", marginTop: 8, overflow: "hidden", paddingBottom: 14 },
  previewBody: { paddingHorizontal: 16, paddingTop: 6 },
  previewEmpty: { color: color.steelGrey },
  previewLabel: { backgroundColor: "rgba(25,27,29,0.55)", borderRadius: 10, color: "#FFFFFF", fontSize: 11, fontWeight: "700", left: 12, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3, position: "absolute", top: 10, zIndex: 2 },
  previewName: { color: color.charcoal, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  subtitle: { color: "rgba(255,255,255,0.86)", fontSize: 15, marginTop: 4 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 33, marginTop: 6 },
  top: { paddingTop: 8 },
});
