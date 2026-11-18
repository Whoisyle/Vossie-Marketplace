import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text as RNText, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { initials } from "@/data/format";
import { color } from "@/theme/tokens";

/**
 * The top of the seller Account, like a profile page: a dark teal card with the store logo in a white ring, its name, where it
 * is and whether it is verified, and three big numbers across the bottom. A store banner, if there is one, sits faint behind.
 */
export function ProfileHeader({ banner, logo, name, place, stats, verified }: { name: string; place: string; logo?: string; banner?: string; verified: boolean; stats: { label: string; value: string }[] }) {
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.card} testID="store-card">
      <LinearGradient colors={[color.accent, "#1F4350"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      {banner ? <Image accessibilityLabel="Store banner" contentFit="cover" source={{ uri: banner }} style={[StyleSheet.absoluteFill, styles.banner]} /> : null}
      <View style={styles.logoRing}>
        <View style={styles.logo}>{logo ? <Image accessibilityLabel="Store logo" contentFit="cover" source={{ uri: logo }} style={StyleSheet.absoluteFill} /> : <RNText style={styles.logoText}>{initials(name || "Store")}</RNText>}</View>
      </View>
      <RNText accessibilityRole="header" style={styles.name}>
        {name}
      </RNText>
      <RNText numberOfLines={2} style={styles.place}>
        {place}
      </RNText>
      <View style={[styles.badge, !verified && styles.badgeWait]}>
        <RNText style={[styles.badgeText, !verified && styles.badgeTextWait]}>{verified ? "Verified seller" : "In review"}</RNText>
      </View>
      <View style={styles.stats}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={[styles.stat, index > 0 && styles.statLine]}>
            <RNText style={styles.statValue}>{stat.value}</RNText>
            <RNText style={styles.statLabel}>{stat.label}</RNText>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: "rgba(223,226,220,0.22)", borderRadius: 12, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  badgeTextWait: { color: "#FFE0B0" },
  badgeWait: { backgroundColor: "rgba(229,138,43,0.28)" },
  banner: { opacity: 0.22 },
  card: { alignItems: "center", borderRadius: 26, marginTop: 8, overflow: "hidden", paddingBottom: 6, paddingHorizontal: 18, paddingTop: 22 },
  logo: { alignItems: "center", backgroundColor: color.sage, borderRadius: 38, height: 76, justifyContent: "center", overflow: "hidden", width: 76 },
  logoRing: { alignItems: "center", borderColor: "rgba(255,255,255,0.9)", borderRadius: 44, borderWidth: 3, justifyContent: "center", padding: 3 },
  logoText: { color: color.accent, fontSize: 26, fontWeight: "800" },
  name: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.3, marginTop: 12, textAlign: "center" },
  place: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2, textAlign: "center" },
  stat: { alignItems: "center", flex: 1, paddingVertical: 14 },
  statLabel: { color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 },
  statLine: { borderLeftColor: "rgba(255,255,255,0.22)", borderLeftWidth: 1 },
  statValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  stats: { alignSelf: "stretch", borderTopColor: "rgba(255,255,255,0.22)", borderTopWidth: 1, flexDirection: "row", marginTop: 16 },
});
