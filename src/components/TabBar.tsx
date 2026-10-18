import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { useCartTotals } from "@/state/DemoStore";
import { spring } from "@/theme/motion";
import { color, corner, space } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";
import { ReelsGlyph } from "./nav/ReelsGlyph";
import { TAB_BAR_HEIGHT, useTabChrome } from "./nav/TabChrome";

export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "home", label: "Home", icon: "home" },
  { name: "explore", label: "Explore", icon: "compass" },
  { name: "reels", label: "Reels", icon: "video" },
  { name: "activity", label: "Activity", icon: "list" },
  { name: "cart", label: "Cart", icon: "shopping-cart" },
  { name: "account", label: "Account", icon: "user" },
];

const BAR_PADDING = space.xxs;

/**
 * Floating frosted-glass bar (owner choice, 2026-10-18). A glass pill slides behind the active tab on a spring,
 * the active icon hops, and the whole bar slowly slides away while you scroll down a page and returns when you
 * scroll up. Screens can lock it hidden (Reels).
 */
export function TabBar({ insets, navigation, state }: BottomTabBarProps) {
  const { itemCount } = useCartTotals();
  const chrome = useTabChrome();
  const reduced = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / state.routes.length : 0;
  const pillX = useSharedValue(0);
  const placed = useSharedValue(0);

  useEffect(() => {
    if (tabWidth === 0) return;
    const x = state.index * tabWidth;
    if (placed.get() === 0) {
      pillX.set(x);
      placed.set(1);
    } else {
      pillX.set(reduced ? withTiming(x, { duration: 120 }) : withSpring(x, spring.soft));
    }
  }, [pillX, placed, reduced, state.index, tabWidth]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.get() }] }));
  const bottom = Math.max(insets.bottom, space.sm);
  const slideStyle = useAnimatedStyle(() => {
    const away = chrome ? chrome.hidden.get() : 0;
    return {
      opacity: 1 - away * 0.95,
      transform: [{ translateY: away * (TAB_BAR_HEIGHT + bottom + 20) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: bottom }, slideStyle]}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={styles.bar}
      >
        {Platform.OS === "android" ? (
          <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />
        ) : (
          <BlurView intensity={55} style={StyleSheet.absoluteFill} tint="light" />
        )}
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(237,243,246,0.55)"]}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        {tabWidth > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.pill, { width: tabWidth - 4 }, pillStyle]}>
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(215,225,231,0.75)"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const tab = TABS.find((item) => item.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const badge = tab.name === "cart" && itemCount > 0 ? itemCount : 0;
          const onPress = () => {
            const event = navigation.emit({ canPreventDefault: true, target: route.key, type: "tabPress" });
            if (!focused && !event.defaultPrevented) {
              haptic.select();
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <TabItem
              badge={badge}
              focused={focused}
              icon={tab.icon}
              key={route.key}
              label={tab.label}
              name={tab.name}
              onPress={onPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabItem({
  badge,
  focused,
  icon,
  label,
  name,
  onPress,
}: {
  badge: number;
  focused: boolean;
  icon: IconName;
  label: string;
  name: string;
  onPress: () => void;
}) {
  const hop = useSharedValue(0);
  const press = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    if (focused) hop.set(withSequence(withTiming(-5, { duration: 110 }), withSpring(0, spring.bouncy)));
  }, [focused, hop]);
  useEffect(() => {
    if (badge > 0) pop.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, spring.bouncy)));
  }, [badge, pop]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.get() }, { scale: (1 - press.get() * 0.14) * (focused ? 1.06 : 1) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.get() * 0.5 }] }));
  const tint = focused ? color.ink : color.textMuted;

  return (
    <Pressable
      accessibilityLabel={badge ? `${label}, ${badge} items` : label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      onPressIn={() => press.set(withTiming(1, { duration: 80 }))}
      onPressOut={() => press.set(withTiming(0, { duration: 160 }))}
      style={styles.tab}
      testID={`tab-${name}`}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        {name === "reels" ? (
          <ReelsGlyph active={focused} color={focused ? color.ink : color.textMuted} size={22} />
        ) : (
          <Icon color={tint} name={icon} size={21} />
        )}
        {badge ? (
          <Animated.View style={[styles.badge, badgeStyle]}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, focused && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  androidGlass: { backgroundColor: "rgba(250,252,253,0.94)" },
  badge: {
    alignItems: "center",
    backgroundColor: color.ink,
    borderColor: color.surface,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: -6,
    top: -4,
  },
  badgeText: { color: color.onPrimary, fontSize: 9, fontWeight: "700" },
  bar: {
    borderColor: "rgba(255,255,255,0.85)",
    borderCurve: "continuous",
    borderRadius: corner.xl,
    borderWidth: 1,
    boxShadow: "0 12px 30px rgba(30, 42, 56, 0.18), 0 2px 6px rgba(30, 42, 56, 0.08)",
    flexDirection: "row",
    maxWidth: 520,
    overflow: "hidden",
    paddingHorizontal: BAR_PADDING,
    paddingVertical: 6,
    width: "100%",
  },
  iconWrap: { alignItems: "center", height: 30, justifyContent: "center", width: 40 },
  label: { color: color.textMuted, fontSize: 10 },
  labelActive: { color: color.ink, fontWeight: "700" },
  pill: {
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    borderWidth: 1,
    bottom: 5,
    boxShadow: "0 4px 10px rgba(30, 42, 56, 0.12)",
    left: BAR_PADDING + 2,
    overflow: "hidden",
    position: "absolute",
    top: 5,
  },
  tab: { alignItems: "center", flex: 1, gap: 1, justifyContent: "center", minHeight: 52 },
  wrapper: {
    alignItems: "center",
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    paddingHorizontal: space.sm,
    paddingTop: space.xxs,
    position: "absolute",
    right: 0,
  },
});
