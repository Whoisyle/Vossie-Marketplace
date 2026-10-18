import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, size, space, text } from "@/theme/tokens";

import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

type AppHeaderProps = {
  /** Show a back chevron. Pass a function to override the default back action. */
  back?: boolean | (() => void);
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Home uses the large wordmark; inner pages use the compact one. */
  large?: boolean;
};

export function AppHeader({ back, large = false, right, subtitle, title }: AppHeaderProps) {
  const router = useRouter();
  const goBack = () => {
    if (typeof back === "function") back();
    else if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Wordmark width={large ? 196 : 150} />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {back || title ? (
        <View style={styles.titleRow}>
          {back ? (
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              onPress={goBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              testID="header-back"
            >
              <Icon name="chevron-left" size={22} color={color.heading} />
            </Pressable>
          ) : null}
          {title ? (
            <View style={styles.titleText}>
              <Text accessibilityRole="header" style={text.pageTitle}>
                {title}
              </Text>
              {subtitle ? <Text style={text.pageSubtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Round grey icon button used for the notification bell. */
export function HeaderIconButton({
  badge,
  icon,
  label,
  onPress,
}: {
  badge?: boolean;
  icon: "bell" | "share-2" | "more-horizontal";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={color.heading} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    height: size.touch,
    justifyContent: "center",
    marginLeft: -space.xs,
    width: 32,
  },
  badgeDot: {
    backgroundColor: color.primary,
    borderColor: color.background,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    position: "absolute",
    right: 12,
    top: 11,
    width: 10,
  },
  container: { paddingBottom: space.sm, paddingTop: space.xs },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#EDEFF0",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  pressed: { opacity: 0.6 },
  right: { marginLeft: space.sm },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: space.xxs,
    marginTop: space.sm,
  },
  titleText: { flex: 1, gap: 2 },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
