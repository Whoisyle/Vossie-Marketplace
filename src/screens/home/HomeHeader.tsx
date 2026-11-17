import { type ReactNode, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { haptic } from "@/lib/haptics";
import { color, space } from "@/theme/tokens";

const NAME_FONT = Platform.select({
  android: "serif",
  ios: "Georgia",
  default: "Georgia, 'Times New Roman', serif",
});

const HAND = Platform.select({
  android: "cursive",
  ios: "Noteworthy",
  default: "'Segoe Script', 'Bradley Hand', 'Brush Script MT', cursive",
});

type HomeHeaderProps = {
  campusName: string;
  children?: ReactNode;
  filterCount: number;
  greeting: string;
  /** The student's first name, shown big under the greeting; empty before a profile exists. */
  name?: string;
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
  name,
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
    <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
      <View style={styles.topRow}>
        <View style={styles.note} testID="home-note">
          <Text style={styles.noteText}>One campus.</Text>
          <Text style={styles.noteText}>Many opportunities.</Text>
          <View style={styles.noteLine} />
        </View>
        <Pressable
          accessibilityLabel={hasUnread ? "Notifications, unread" : "Notifications"}
          accessibilityRole="button"
          hitSlop={10}
          onPress={onBell}
          style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
        >
          <Icon color={color.charcoal} name="bell" size={24} />
          {hasUnread ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>

      <View style={styles.hello}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text numberOfLines={1} style={styles.name}>
          {name ?? "there"}
        </Text>
        <Text style={styles.tagline}>Find it. Sell it. Get it delivered.</Text>
        <Pressable
          accessibilityHint="Change your campus"
          accessibilityLabel={`Campus, ${campusName}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCampus}
          style={({ pressed }) => [styles.campusRow, pressed && styles.pressed]}
          testID="home-campus"
        >
          <Icon color={color.slate} name="map-pin" size={15} />
          <Text numberOfLines={1} style={styles.campus}>
            {campusName}
          </Text>
          <Icon color={color.slate} name="chevron-down" size={16} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon color={color.slate} name="search" size={21} />
          <TextInput
            accessibilityHint="Type what you are looking for, then search"
            accessibilityLabel="Search products, service and sellers"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            placeholder={hints[hint]}
            placeholderTextColor={color.steelGrey}
            returnKeyType="search"
            style={styles.input}
            testID="home-search"
            value={query}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={10} onPress={() => setQuery("")}>
              <Icon color={color.steelGrey} name="x-circle" size={18} />
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
          <Icon color={color.onPrimary} name="sliders" size={20} />
          {filterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {children ? <View style={styles.hero}>{children}</View> : null}
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
    right: -4,
    top: -4,
  },
  badgeText: { color: color.onPrimary, fontSize: 11, fontWeight: "700" },
  bell: { alignItems: "center", backgroundColor: color.surface, borderRadius: 22, boxShadow: "0 2px 8px rgba(25,27,29,0.08)", height: 44, justifyContent: "center", width: 44 },
  campus: { color: color.slate, flexShrink: 1, fontSize: 14, fontWeight: "700" },
  campusRow: { alignItems: "center", alignSelf: "flex-start", backgroundColor: color.sage, borderRadius: 16, flexDirection: "row", gap: 6, marginTop: space.sm, paddingHorizontal: 12, paddingVertical: 7 },
  dot: { backgroundColor: color.danger, borderColor: color.surface, borderRadius: 5, borderWidth: 1.5, height: 11, position: "absolute", right: 10, top: 9, width: 11 },
  filter: { alignItems: "center", backgroundColor: color.charcoal, borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  greeting: { color: color.charcoal, fontSize: 24, fontWeight: "400", letterSpacing: -0.2 },
  header: { paddingBottom: space.xs },
  hello: { marginTop: space.md },
  hero: { marginTop: space.md },
  input: { color: color.charcoal, flex: 1, fontSize: 15, height: "100%", outlineWidth: 0 },
  name: { color: color.accent, fontFamily: NAME_FONT, fontSize: 46, fontWeight: "700", letterSpacing: -0.5, lineHeight: 54 },
  note: { transform: [{ rotate: "-4deg" }] },
  noteLine: { backgroundColor: color.slateBlue, borderRadius: 1, height: 2, marginTop: 3, width: 96 },
  noteText: { color: color.slateBlue, fontFamily: HAND, fontSize: 15, lineHeight: 19 },
  pressed: { opacity: 0.75 },
  search: { alignItems: "center", backgroundColor: color.cloudGrey, borderRadius: 18, flex: 1, flexDirection: "row", gap: space.xs, height: 52, paddingHorizontal: space.md },
  searchRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.md },
  tagline: { color: color.steelGrey, fontSize: 14, marginTop: 2 },
  topRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
});
