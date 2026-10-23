import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Wordmark } from "@/components";
import { haptic } from "@/lib/haptics";
import { color, size, space } from "@/theme/tokens";

/** The two header colours; the promo photo fades into a colour in between. */
export const HEADER_COLORS = ["#386573", "#335B69"] as const;
export const HEADER_FADE = "#345E6C";

type HomeHeaderProps = {
  campusName: string;
  children?: ReactNode;
  filterCount: number;
  greeting: string;
  hasUnread: boolean;
  hints: string[];
  onBell: () => void;
  onCampus: () => void;
  onFilters: () => void;
  /** Called with the typed words when the student submits; empty when they submit nothing. */
  onSearch: (query: string) => void;
};

/**
 * The curved Vossie teal top of Home: the Vossie wordmark, the student's campus (tap to change), the bell,
 * a search field you can type in, with its filters button, and, passed in as children, the promo banner.
 * It draws under the status bar, so it adds the top inset itself.
 */
export function HomeHeader({
  campusName,
  children,
  filterCount,
  greeting,
  hasUnread,
  hints,
  onBell,
  onCampus,
  onFilters,
  onSearch,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const [hint, setHint] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (hints.length < 2) return;
    const timer = setInterval(() => setHint((current) => (current + 1) % hints.length), 3_200);
    return () => clearInterval(timer);
  }, [hints.length]);

  const submit = () => {
    const clean = query.trim();
    setQuery("");
    onSearch(clean);
  };

  return (
    <View style={styles.bleed}>
      <LinearGradient
        colors={HEADER_COLORS}
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
            hitSlop={10}
            onPress={onBell}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
          >
            <Icon color={color.onPrimary} name="bell" size={26} />
            {hasUnread ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Icon color={color.textSecondary} name="search" size={22} />
            <TextInput
              accessibilityHint="Type what you are looking for, then search"
              accessibilityLabel="Search products, service and sellers"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              onSubmitEditing={submit}
              placeholder={hints[hint]}
              placeholderTextColor={color.textMuted}
              returnKeyType="search"
              style={styles.input}
              testID="home-search"
              value={query}
            />
            {query ? (
              <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} onPress={() => setQuery("")}>
                <Icon color={color.textMuted} name="x-circle" size={18} />
              </Pressable>
            ) : null}
          </View>
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
  bell: { alignItems: "center", height: 44, justifyContent: "center", marginLeft: space.xs, width: 40 },
  bleed: { marginHorizontal: -size.screenGutter },
  campus: { color: color.onPrimary, flexShrink: 1, fontSize: 19, fontWeight: "800" },
  campusRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 2 },
  dot: { backgroundColor: "#FFFFFF", borderColor: HEADER_FADE, borderRadius: 5, borderWidth: 1.5, height: 11, position: "absolute", right: 8, top: 8, width: 11 },
  filter: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  flex: { flex: 1 },
  greeting: { color: "rgba(255,255,255,0.78)", fontSize: 12.5, fontWeight: "600", marginTop: space.xs },
  header: {
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    overflow: "hidden",
    paddingBottom: space.md,
    paddingHorizontal: size.screenGutter,
  },
  hero: { marginTop: space.md },
  input: { color: color.text, flex: 1, fontSize: 15, height: "100%", outlineWidth: 0 },
  pressed: { opacity: 0.75 },
  search: { alignItems: "center", backgroundColor: color.onPrimary, borderRadius: 18, flex: 1, flexDirection: "row", gap: space.xs, height: 52, paddingHorizontal: space.md },
  searchRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.md },
  topRow: { alignItems: "flex-start", flexDirection: "row" },
});
