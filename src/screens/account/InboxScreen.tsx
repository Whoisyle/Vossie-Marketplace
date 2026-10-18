import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Avatar, EmptyState, Screen } from "@/components";
import { relativeTime } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** Inbox: every conversation, unread first highlighted. */
export function InboxScreen() {
  const router = useRouter();
  const { state } = useDemoStore();

  return (
    <Screen>
      <AppHeader back subtitle="Messages from buyers and sellers." title="Inbox" />
      {state.conversations.length === 0 ? (
        <EmptyState icon="mail" message="Message a seller from any listing to start a chat." title="No messages yet" />
      ) : (
        <View style={styles.list}>
          {state.conversations.map((conversation) => {
            const last = conversation.messages[conversation.messages.length - 1];
            return (
              <Pressable
                accessibilityLabel={`${conversation.name}${conversation.unread ? ", unread" : ""}. ${last?.body ?? ""}`}
                accessibilityRole="button"
                key={conversation.id}
                onPress={() => router.push(`/account/inbox/${conversation.id}` as Href)}
                style={({ pressed }) => [styles.row, conversation.unread && styles.unread, pressed && styles.pressed]}
              >
                <Avatar name={conversation.name} size={40} />
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[text.cardTitle, conversation.unread && styles.bold]}>
                    {conversation.name}
                  </Text>
                  <Text numberOfLines={1} style={text.caption}>
                    {last?.body ?? "No messages yet"}
                  </Text>
                </View>
                {last ? <Text style={text.caption}>{relativeTime(last.sentAt)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: "800" },
  flex: { flex: 1 },
  list: { gap: space.xs, marginTop: space.sm },
  pressed: { opacity: 0.75 },
  row: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.border,
    borderRadius: corner.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    minHeight: 64,
    padding: space.sm,
  },
  unread: { backgroundColor: color.surfaceIcon, borderColor: color.surfaceIcon },
});
