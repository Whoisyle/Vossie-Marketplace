import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppHeader, Avatar, Chip, EmptyState, Icon, Screen, SearchBar, type IconName, PageHero } from "@/components";
import { relativeTime } from "@/data/format";
import type { Conversation } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

export type InboxFilter = "all" | "unread" | Conversation["kind"];

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "seller", label: "Sellers" },
  { key: "buyer", label: "Buyers" },
  { key: "courier", label: "Couriers" },
  { key: "support", label: "Support" },
];

export const KIND_ICON: Record<Conversation["kind"], IconName> = {
  buyer: "user",
  courier: "truck",
  seller: "shopping-bag",
  support: "life-buoy",
};

export const KIND_LABEL: Record<Conversation["kind"], string> = {
  buyer: "Buyer",
  courier: "Courier",
  seller: "Seller",
  support: "Vossie Support",
};

/** Newest message first; conversations with no messages go last. */
export function sortConversations(conversations: Conversation[]): Conversation[] {
  const latest = (conversation: Conversation) => {
    const last = conversation.messages[conversation.messages.length - 1];
    return last ? new Date(last.sentAt).getTime() : 0;
  };
  return [...conversations].sort((a, b) => latest(b) - latest(a));
}

/** Apply a filter chip and a search text to the list. */
export function filterConversations(conversations: Conversation[], filter: InboxFilter, query: string): Conversation[] {
  const needle = query.trim().toLowerCase();
  return conversations.filter((conversation) => {
    if (filter === "unread" && !conversation.unread) return false;
    if (filter !== "all" && filter !== "unread" && conversation.kind !== filter) return false;
    if (!needle) return true;
    const last = conversation.messages[conversation.messages.length - 1];
    return `${conversation.name} ${last?.body ?? ""}`.toLowerCase().includes(needle);
  });
}

/** Inbox: search, filter by who you are talking to, newest first, unread highlighted. */
export function InboxScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");
  const unread = state.conversations.filter((item) => item.unread).length;
  const list = useMemo(
    () => filterConversations(sortConversations(state.conversations), filter, query),
    [filter, query, state.conversations],
  );

  return (
    <Screen testID="inbox-screen">
      <AppHeader back subtitle={unread ? `${unread} unread` : "You're all caught up"} title="Messages" />
      <PageHero
        chips={[{ icon: "users", label: `${state.conversations.length} ${state.conversations.length === 1 ? "conversation" : "conversations"}` }]}
        icon="message-circle"
        subtitle="Sellers, couriers and Vossie Support."
        testID="inbox-hero"
        title={unread ? `${unread} new ${unread === 1 ? "message" : "messages"}` : "All caught up"}
        tone="slate"
      />
      <SearchBar onChangeText={setQuery} placeholder="Search messages" value={query} />
      <View style={styles.chips}>
        {FILTERS.filter((item) => item.key === "all" || item.key === "unread" || state.conversations.some((c) => c.kind === item.key)).map((item) => (
          <Chip
            key={item.key}
            label={item.key === "unread" && unread ? `Unread (${unread})` : item.label}
            onPress={() => setFilter(item.key)}
            selected={filter === item.key}
          />
        ))}
      </View>

      {state.conversations.length === 0 ? (
        <EmptyState icon="mail" message="Message a seller from any listing to start a chat." title="No messages yet" />
      ) : list.length === 0 ? (
        <EmptyState
          actionLabel="Clear filters"
          icon="search"
          message="Nothing matches that search."
          onAction={() => {
            setFilter("all");
            setQuery("");
          }}
          title="No conversations found"
        />
      ) : (
        <View style={styles.list}>
          {list.map((conversation, index) => {
            const last = conversation.messages[conversation.messages.length - 1];
            const preview = last ? `${last.fromMe ? "You: " : ""}${last.place ? `Meet at ${last.place}` : last.body}` : "No messages yet";
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(260)} key={conversation.id}>
                <Pressable
                  accessibilityLabel={`${conversation.name}, ${KIND_LABEL[conversation.kind]}${conversation.unread ? ", unread" : ""}. ${preview}`}
                  accessibilityRole="button"
                  onPress={() => router.push(`/account/inbox/${conversation.id}` as Href)}
                  style={({ pressed }) => [styles.row, conversation.unread && styles.unread, pressed && styles.pressed]}
                  testID={`conversation-${conversation.id}`}
                >
                  <View>
                    <Avatar name={conversation.name} size={48} />
                    <View style={styles.kindBadge}>
                      <Icon color={color.onPrimary} name={KIND_ICON[conversation.kind]} size={10} />
                    </View>
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.top}>
                      <Text numberOfLines={1} style={[text.cardTitle, styles.flex, conversation.unread && styles.bold]}>
                        {conversation.name}
                      </Text>
                      {last ? <Text style={[text.caption, conversation.unread && styles.accent]}>{relativeTime(last.sentAt)}</Text> : null}
                    </View>
                    <View style={styles.top}>
                      <Text numberOfLines={1} style={[styles.preview, styles.flex, conversation.unread && styles.bold]}>
                        {preview}
                      </Text>
                      {conversation.unread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.kind}>{KIND_LABEL[conversation.kind]}{conversation.orderId ? " · About an order" : ""}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accent: { color: color.accent, fontWeight: "700" },
  bold: { fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  dot: { backgroundColor: color.accent, borderRadius: 5, height: 10, width: 10 },
  flex: { flex: 1 },
  kind: { color: color.textMuted, fontSize: 11 },
  kindBadge: {
    alignItems: "center",
    backgroundColor: color.primary,
    borderColor: color.background,
    borderRadius: 10,
    borderWidth: 2,
    bottom: -2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 20,
  },
  list: { gap: space.xs, marginTop: space.sm },
  pressed: { opacity: 0.75 },
  preview: { color: color.textSecondary, fontSize: 13 },
  row: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.border,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    minHeight: 76,
    padding: space.sm,
  },
  top: { alignItems: "center", flexDirection: "row", gap: space.xs },
  unread: { backgroundColor: color.surfaceSoft, borderColor: color.mist },
});
