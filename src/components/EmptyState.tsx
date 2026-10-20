import { StyleSheet, Text, View } from "react-native";

import { color, space } from "@/theme/tokens";

import { Button } from "./Button";
import { Rings } from "./Decor";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  actionLabel,
  icon,
  message,
  onAction,
  title,
}: {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <View style={styles.rings}>
          <Rings colour="rgba(55,99,113,0.28)" size={172} />
        </View>
        <View style={styles.iconCircle}>
          <Icon name={icon} size={38} color={color.heading} />
        </View>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} shape="rounded" size="lg" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: space.xs, minWidth: 180 },
  container: {
    alignItems: "center",
    flex: 1,
    gap: space.sm,
    justifyContent: "center",
    paddingVertical: space.huge,
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderRadius: 64,
    height: 128,
    justifyContent: "center",
    marginBottom: space.xs,
    width: 128,
  },
  iconWrap: { alignItems: "center", height: 172, justifyContent: "center", width: 172 },
  rings: { left: 0, position: "absolute", top: 0 },
  message: { color: color.textMuted, fontSize: 13, textAlign: "center" },
  title: { color: color.text, fontSize: 15, fontWeight: "700" },
});
