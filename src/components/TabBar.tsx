import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCartTotals } from "@/state/DemoStore";
import { color, corner, shadow, space } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "home", label: "Home", icon: "home" },
  { name: "explore", label: "Explore", icon: "compass" },
  { name: "reels", label: "Reels", icon: "video" },
  { name: "activity", label: "Activity", icon: "list" },
  { name: "cart", label: "Cart", icon: "shopping-cart" },
  { name: "account", label: "Account", icon: "user" },
];

/** Floating six-destination bar from the owner's designs. */
export function TabBar({ insets, navigation, state }: BottomTabBarProps) {
  const { itemCount } = useCartTotals();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, space.sm) }]}
    >
      <View accessibilityRole="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS.find((item) => item.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const badge = tab.name === "cart" && itemCount > 0 ? itemCount : 0;
          const onPress = () => {
            const event = navigation.emit({ canPreventDefault: true, target: route.key, type: "tabPress" });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              accessibilityLabel={badge ? `${tab.label}, ${badge} items` : tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              testID={`tab-${tab.name}`}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Icon
                  name={tab.icon}
                  size={21}
                  color={focused ? color.primary : color.textMuted}
                />
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, focused && styles.labelActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: color.primary,
    borderColor: color.surface,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: -2,
  },
  badgeText: { color: color.onPrimary, fontSize: 9, fontWeight: "700" },
  bar: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    borderWidth: 1,
    flexDirection: "row",
    maxWidth: 520,
    paddingHorizontal: space.xxs,
    paddingVertical: 6,
    width: "100%",
    ...shadow.card,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconWrapActive: { backgroundColor: color.surfaceIcon },
  label: { color: color.textMuted, fontSize: 10 },
  labelActive: { color: color.primary, fontWeight: "700" },
  pressed: { opacity: 0.6 },
  tab: { alignItems: "center", flex: 1, gap: 1, minHeight: 50 },
  wrapper: {
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: space.sm,
    paddingTop: space.xxs,
  },
});
