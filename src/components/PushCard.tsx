import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "./Icon";

export type PushButton = { key: string; label: string };

/**
 * A push notification as it looks on the phone: the app's mark with a small badge for what it is about, the app name and
 * when, the title and words, and buttons under it for the usual job. The buyer's and the seller's notifications both use it.
 */
export function PushCard({ actions, appName, body, icon, mark = "V", markColour = "#38606F", onAction, onOpen, quiet = false, tint, time = "now", title }: { appName: string; title: string; body: string; icon: IconName; tint: string; actions: PushButton[]; onAction?: (action: PushButton) => void; onOpen?: () => void; time?: string; quiet?: boolean; mark?: string; markColour?: string }) {
  return (
    <View style={styles.card} testID="push-card">
      <Pressable accessibilityLabel={`${title}. ${body}`} accessibilityRole="button" disabled={!onOpen} onPress={onOpen} style={styles.top}>
        <View style={[styles.appIcon, { backgroundColor: markColour }]}>
          <Text style={styles.appMark}>{mark}</Text>
          <View style={[styles.kindDot, { backgroundColor: tint }]}>
            <Icon color="#FFFFFF" name={icon} size={9} />
          </View>
        </View>
        <View style={styles.flex}>
          <View style={styles.meta}>
            <Text style={styles.app}>{appName}</Text>
            <Text style={styles.time}>
              {quiet ? "silent · " : ""}
              {time}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={2} style={styles.body}>
            {body}
          </Text>
        </View>
      </Pressable>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Pressable accessibilityLabel={action.label} accessibilityRole="button" key={action.key} onPress={() => onAction?.(action)} style={[styles.action, index === 0 && styles.actionMain]} testID={`push-${action.key}`}>
              <Text style={[styles.actionText, index === 0 && styles.actionTextMain]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 38 },
  actionMain: { backgroundColor: "#FFFFFF" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  actionTextMain: { color: "#2F5A67" },
  actions: { flexDirection: "row", gap: 8 },
  app: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  appIcon: { alignItems: "center", borderColor: "rgba(255,255,255,0.35)", borderRadius: 12, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  appMark: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  body: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: "rgba(20,35,44,0.96)", borderCurve: "continuous", borderRadius: 22, boxShadow: "0 12px 28px rgba(5, 14, 20, 0.45)", gap: 10, padding: 12 },
  flex: { flex: 1, gap: 1 },
  kindDot: { alignItems: "center", borderColor: "#14232C", borderRadius: 8, borderWidth: 1.5, bottom: -4, height: 16, justifyContent: "center", position: "absolute", right: -4, width: 16 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  title: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  top: { flexDirection: "row", gap: 12 },
});
