import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Wordmark } from "@/components";
import { initials } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { color, size, space } from "@/theme/tokens";

type HomeHeaderProps = {
  avatarUri?: string;
  campusName: string;
  children?: ReactNode;
  filterCount: number;
  greeting: string;
  hasUnread: boolean;
  hints: string[];
  name: string;
  onAvatar: () => void;
  onBell: () => void;
  onCampus: () => void;
  onFilters: () => void;
  onSearch: () => void;
};

/**
 * The curved Vossie teal top of Home: the Vossie wordmark, the student's campus (tap to change), the bell and
 * profile photo, the search bar with its filters button, and, passed in as children, the promo banner.
 * It draws under the status bar, so it adds the top inset itself.
 */
export function HomeHeader({
  avatarUri,
  campusName,
  children,
  filterCount,
  greeting,
  hasUnread,
  hints,
  name,
  onAvatar,
  onBell,
  onCampus,
  onFilters,
  onSearch,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const [hint, setHint] = useState(0);

  useEffect(() => {
    if (hints.length < 2) return;
    const timer = setInterval(() => setHint((current) => (current + 1) % hints.length), 3_200);
    return () => clearInterval(timer);
  }, [hints.length]);

  return (
    <View style={styles.bleed}>
      <LinearGradient
        colors={[color.accent, color.primary]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + space.xs }]}
      >
        <View style={styles.topRow}>
          <View style={styles.flex}>
            <Wordmark tone="white" width={104} />
            <Text numberOfLines={1} style={styles.greeting}>
              {greeting}
            </Text>
            <Pressable
              accessibilityHint="Change your campus"
              accessibilityLabel={`Campus, ${campusName}`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onCampus}
              style={({ pressed }) => [styles.campusRow, pressed && styles.pressed]}
              testID="home-campus"
            >
              <Icon color={color.onPrimary} name="map-pin" size={16} />
              <Text numberOfLines={1} style={styles.campus}>
                {campusName}
              </Text>
              <Icon color={color.onPrimary} name="chevron-down" size={18} />
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel={hasUnread ? "Notifications, unread" : "Notifications"}
            accessibilityRole="button"
            onPress={onBell}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <Icon color={color.onPrimary} name="bell" size={22} />
            {hasUnread ? <View style={styles.dot} /> : null}
          </Pressable>
          <Pressable
            accessibilityLabel="Your profile"
            accessibilityRole="button"
            onPress={onAvatar}
            style={({ pressed }) => [styles.tile, styles.avatar, pressed && styles.pressed]}
          >
            {avatarUri ? (
              <Image contentFit="cover" source={{ uri: avatarUri }} style={StyleSheet.absoluteFill} />
            ) : (
              <Text style={styles.initials}>{initials(name)}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Pressable
            accessibilityHint="Opens search"
            accessibilityLabel="Search products, service and sellers"
            accessibilityRole="search"
            onPress={onSearch}
            style={({ pressed }) => [styles.search, pressed && styles.pressed]}
          >
            <Icon color={color.textSecondary} name="search" size={22} />
            <View style={styles.hintBox}>
              <Animated.Text
                entering={FadeInDown.duration(320)}
                exiting={FadeOutUp.duration(240)}
                key={hints[hint]}
                numberOfLines={1}
                style={styles.hint}
              >
                {hints[hint]}
              </Animated.Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => {
              haptic.tap();
              onFilters();
            }}
            style={({ pressed }) => [styles.filter, pressed && styles.pressed]}
            testID="open-filters"
          >
            <Icon color={color.accent} name="sliders" size={20} />
            {filterCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{filterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {children ? <View style={styles.hero}>{children}</View> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderColor: color.onPrimary, borderWidth: 2, overflow: "hidden" },
  badge: {
    alignItems: "center",
    backgroundColor: color.accent,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    position: "absolute",
    right: -2,
    top: -2,
  },
  badgeText: { color: color.onPrimary, fontSize: 11, fontWeight: "700" },
  bleed: { marginHorizontal: -size.screenGutter },
  campus: { color: color.onPrimary, flexShrink: 1, fontSize: 19, fontWeight: "800" },
  campusRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 2 },
  dot: { backgroundColor: "#FFFFFF", borderColor: color.accent, borderRadius: 5, borderWidth: 1.5, height: 11, position: "absolute", right: 11, top: 11, width: 11 },
  filter: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  flex: { flex: 1 },
  greeting: { color: "rgba(255,255,255,0.78)", fontSize: 12.5, fontWeight: "600", marginTop: space.xs },
  header: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    paddingBottom: space.md,
    paddingHorizontal: size.screenGutter,
  },
  hero: { marginTop: space.md },
  hint: { color: color.textMuted, fontSize: 15 },
  hintBox: { flex: 1, height: 22, justifyContent: "center", overflow: "hidden" },
  initials: { color: color.onPrimary, fontSize: 17, fontWeight: "800" },
  pressed: { opacity: 0.75 },
  search: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: 18, flex: 1, flexDirection: "row", gap: space.xs, height: 52, paddingHorizontal: space.md },
  searchRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.md },
  tile: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, height: 48, justifyContent: "center", marginLeft: space.xs, width: 48 },
  topRow: { alignItems: "flex-start", flexDirection: "row" },
});
