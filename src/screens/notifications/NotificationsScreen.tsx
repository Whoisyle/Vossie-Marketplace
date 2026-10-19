import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppHeader, Button, Chip, EmptyState, Icon, Screen } from "@/components";
import { relativeTime } from "@/data/format";
import { kindIcon, kindLabel, notificationKind, type NotificationKind } from "@/data/notificationKinds";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

type Filter = "all" | NotificationKind;

/** Notification centre: everything Vossie has told the student, newest first, filtered by what it is about. */
export function NotificationsScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const [filter, setFilter] = useState<Filter>("all");
  const unread = state.notifications.filter((item) => !item.read).length;
  const kinds = (["orders", "messages", "offers", "account"] as const).filter((kind) => state.notifications.some((item) => notificationKind(item) === kind));
  const list = state.notifications.filter((item) => filter === "all" || notificationKind(item) === filter);

  return (
    <Screen testID="notifications-screen">
      <AppHeader
        back
        right={
          unread > 0 ? (
            <Button label="Mark all read" onPress={() => dispatch({ type: "markNotificationsRead" })} size="sm" testID="mark-all-read" variant="soft" />
          ) : undefined
        }
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        title="Notifications"
      />
      {kinds.length > 1 ? (
        <View style={styles.chips}>
          <Chip label="All" onPress={() => setFilter("all")} selected={filter === "all"} />
          {kinds.map((kind) => (
            <Chip key={kind} label={kindLabel[kind]} onPress={() => setFilter(kind)} selected={filter === kind} testID={`filter-${kind}`} />
          ))}
        </View>
      ) : null}

      {list.length === 0 ? (
        <EmptyState icon="bell" message="Order updates, messages and offers will show up here." title="No notifications yet" />
      ) : (
        <View style={styles.list}>
          {list.map((item, index) => {
            const kind = notificationKind(item);
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(260)} key={item.id}>
                <Pressable
                  accessibilityLabel={`${item.title}. ${item.body}${item.read ? "" : ". Unread"}`}
                  accessibilityRole="button"
                  onPress={() => {
                    dispatch({ notificationId: item.id, type: "markNotificationRead" });
                    if (item.href) router.push(item.href as Href);
                  }}
                  style={({ pressed }) => [styles.row, !item.read && styles.unread, pressed && styles.pressed]}
                  testID={`notification-${item.id}`}
                >
                  <View style={[styles.icon, !item.read && styles.iconUnread]}>
                    <Icon color={item.read ? color.heading : color.onPrimary} name={kindIcon[kind]} size={18} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[text.cardTitle, !item.read && styles.bold]}>{item.title}</Text>
                    <Text numberOfLines={2} style={text.bodySmall}>
                      {item.body}
                    </Text>
                    <Text style={text.caption}>{relativeTime(item.createdAt)}</Text>
                  </View>
                  {!item.read ? <View style={styles.dot} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={() => router.push("/account/security" as Href)} style={styles.settings}>
        <Icon color={color.link} name="settings" size={14} />
        <Text style={styles.settingsText}>Notification settings</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  dot: { backgroundColor: color.accent, borderRadius: 5, height: 10, marginTop: 6, width: 10 },
  flex: { flex: 1, gap: 2 },
  icon: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  iconUnread: { backgroundColor: color.primary },
  list: { gap: space.xs, marginTop: space.sm },
  pressed: { opacity: 0.75 },
  row: { alignItems: "flex-start", backgroundColor: color.surface, borderColor: color.border, borderCurve: "continuous", borderRadius: corner.lg, borderWidth: 1, flexDirection: "row", gap: space.sm, padding: space.sm },
  settings: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 6, marginTop: space.lg, minHeight: 44 },
  settingsText: { color: color.link, fontSize: 13, fontWeight: "600" },
  unread: { backgroundColor: color.surfaceSoft, borderColor: color.mist },
});
