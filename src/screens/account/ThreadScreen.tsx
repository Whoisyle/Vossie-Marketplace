import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Fragment, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppHeader, Avatar, Button, EmptyState, Icon, RadioRow, Screen, Sheet, StatusBadge, useToast } from "@/components";
import { campusPlaces } from "@/data/geo";
import { dayLabel, timeOfDay } from "@/data/format";
import type { Conversation, Message } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { statusInfo } from "@/screens/activity/orderStatus";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { KIND_LABEL } from "./InboxScreen";

/** Quick replies that fit who you are talking to. */
export function quickReplies(kind: Conversation["kind"]): string[] {
  switch (kind) {
    case "seller":
      return ["Is this still available?", "Can you do a better price?", "Where can we meet?"];
    case "buyer":
      return ["Yes, it's available", "Sorry, it's sold", "I can meet on campus"];
    case "courier":
      return ["I'm at the gate", "Please call me", "Leave it at reception"];
    default:
      return ["Thanks, that helps", "I still need help", "Can I speak to someone?"];
  }
}

/** Groups messages by day so a divider can be shown whenever the day changes. */
export function groupByDay(messages: Message[], now: Date = new Date()): { label: string; messages: Message[] }[] {
  const groups: { label: string; messages: Message[] }[] = [];
  for (const message of messages) {
    const label = dayLabel(message.sentAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.messages.push(message);
    else groups.push({ label, messages: [message] });
  }
  return groups;
}

/** The status line under the last message I sent: read once they have replied after it, otherwise delivered. */
export function deliveryStatus(messages: Message[]): { id: string; text: "Read" | "Delivered" } | null {
  let lastMine = -1;
  messages.forEach((message, index) => {
    if (message.fromMe) lastMine = index;
  });
  if (lastMine === -1) return null;
  const replied = messages.slice(lastMine + 1).some((message) => !message.fromMe);
  return { id: messages[lastMine]!.id, text: replied ? "Read" : "Delivered" };
}

/** One conversation: day dividers, bubbles, an order card, quick replies, meet-up spots and block or report. */
export function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState<"meet" | "more" | null>(null);
  const conversation = state.conversations.find((item) => item.id === id);
  const unread = conversation?.unread ?? false;

  useEffect(() => {
    if (unread && id) dispatch({ conversationId: id, type: "markConversationRead" });
  }, [dispatch, id, unread]);

  if (!conversation) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState
          actionLabel="Back to Messages"
          icon="mail"
          onAction={() => router.replace("/account/inbox" as Href)}
          title="Conversation not found"
        />
      </Screen>
    );
  }

  const order = conversation.orderId ? state.orders.find((item) => item.id === conversation.orderId) : undefined;
  const campusId = state.profile?.campusId ?? "potchefstroom";
  const status = deliveryStatus(conversation.messages);
  const groups = groupByDay(conversation.messages);
  const isPerson = conversation.kind === "buyer" || conversation.kind === "seller";
  const blocked = state.blocked.some((item) => item.id === conversation.id);

  const send = (body: string, place?: string) => {
    if (!body.trim()) return;
    haptic.tap();
    dispatch({ body, conversationId: conversation.id, place, type: "sendMessage" });
    setDraft("");
  };

  return (
    <Screen
      footer={
        blocked ? (
          <Text style={styles.blockedNote}>You blocked {conversation.name}. Unblock them in Security and Settings to message again.</Text>
        ) : (
          <View style={styles.footer}>
            <ScrollView contentContainerStyle={styles.quick} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
              {quickReplies(conversation.kind).map((reply) => (
                <Pressable accessibilityRole="button" key={reply} onPress={() => send(reply)} style={styles.quickChip}>
                  <Text style={styles.quickText}>{reply}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.composer}>
              <Pressable
                accessibilityLabel="Suggest a safe meet-up spot"
                accessibilityRole="button"
                onPress={() => setSheet("meet")}
                style={styles.attach}
                testID="meet-spot"
              >
                <Icon color={color.heading} name="map-pin" size={18} />
              </Pressable>
              <TextInput
                accessibilityLabel="Message"
                multiline
                onChangeText={setDraft}
                placeholder="Write a message"
                placeholderTextColor={color.textMuted}
                style={styles.input}
                value={draft}
              />
              <Pressable
                accessibilityLabel="Send message"
                accessibilityRole="button"
                accessibilityState={{ disabled: !draft.trim() }}
                disabled={!draft.trim()}
                onPress={() => send(draft)}
                style={[styles.send, !draft.trim() && styles.sendDisabled]}
                testID="send-message"
              >
                <Icon color={color.onPrimary} name="send" size={18} />
              </Pressable>
            </View>
          </View>
        )
      }
    >
      <AppHeader
        back
        right={
          <Pressable accessibilityLabel="More options" accessibilityRole="button" hitSlop={8} onPress={() => setSheet("more")} style={styles.more} testID="thread-more">
            <Icon color={color.heading} name="more-horizontal" size={20} />
          </Pressable>
        }
        subtitle={KIND_LABEL[conversation.kind]}
        title={conversation.name}
      />

      {order ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/activity/order/${order.id}` as Href)}
          style={styles.orderCard}
          testID="thread-order"
        >
          <View style={styles.orderIcon}>
            <Icon color={color.onPrimary} name="package" size={16} />
          </View>
          <View style={styles.flex}>
            <Text style={text.cardTitle}>Order {order.number}</Text>
            <Text numberOfLines={1} style={text.caption}>
              {order.lines.map((line) => line.title).join(", ")}
            </Text>
          </View>
          <StatusBadge label={statusInfo(order.status).label} tone={statusInfo(order.status).tone} />
        </Pressable>
      ) : null}

      {isPerson ? (
        <View style={styles.safety}>
          <Icon color={color.textSecondary} name="shield" size={13} />
          <Text style={styles.safetyText}>Keep chats and payments inside Vossie, and meet in a public spot on campus.</Text>
        </View>
      ) : null}

      <View>
        <View style={styles.thread}>
          {conversation.messages.length === 0 ? (
            <View style={styles.hello}>
              <Avatar name={conversation.name} size={64} />
              <Text style={styles.empty}>Say hello to {conversation.name}.</Text>
            </View>
          ) : (
            groups.map((group) => (
              <Fragment key={group.label}>
                <Text style={styles.day}>{group.label}</Text>
                {group.messages.map((message) => (
                  <Animated.View entering={FadeInDown.duration(200)} key={message.id} style={message.fromMe ? styles.mineWrap : styles.theirsWrap}>
                    {message.place ? (
                      <View style={[styles.bubble, styles.placeCard, message.fromMe ? styles.mine : styles.theirs]}>
                        <View style={styles.placeRow}>
                          <Icon color={message.fromMe ? color.onPrimary : color.heading} name="map-pin" size={16} />
                          <Text style={[styles.placeTitle, message.fromMe && styles.mineText]}>Suggested meet-up spot</Text>
                        </View>
                        <Text style={[styles.placeName, message.fromMe && styles.mineText]}>{message.place}</Text>
                        <Text style={[styles.time, message.fromMe && styles.mineTime]}>{timeOfDay(message.sentAt)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.bubble, message.fromMe ? styles.mine : styles.theirs]}>
                        <Text style={[text.body, message.fromMe && styles.mineText]}>{message.body}</Text>
                        <Text style={[styles.time, message.fromMe && styles.mineTime]}>{timeOfDay(message.sentAt)}</Text>
                      </View>
                    )}
                    {status && status.id === message.id ? <Text style={styles.status}>{status.text}</Text> : null}
                  </Animated.View>
                ))}
              </Fragment>
            ))
          )}
        </View>
      </View>

      <Sheet onClose={() => setSheet(null)} title="Safe meet-up spots" visible={sheet === "meet"}>
        <Text style={[text.bodySmall, styles.sheetIntro]}>Busy, well-lit places on campus. Tap one to suggest it.</Text>
        {campusPlaces(campusId).map((place) => (
          <RadioRow
            key={place.id}
            onPress={() => {
              send(`Let's meet at ${place.name}.`, place.name);
              setSheet(null);
            }}
            selected={false}
            subtitle={place.detail}
            title={place.name}
          />
        ))}
      </Sheet>

      <Sheet onClose={() => setSheet(null)} title={conversation.name} visible={sheet === "more"}>
        <Button
          fullWidth
          icon="flag"
          label="Report this conversation"
          onPress={() => {
            setSheet(null);
            toast.show("Thanks, our team will take a look");
          }}
          variant="outline"
        />
        {isPerson ? (
          <Button
            fullWidth
            icon="slash"
            label={`Block ${conversation.name}`}
            onPress={() => {
              dispatch({ name: conversation.name, type: "blockUser", userId: conversation.id });
              setSheet(null);
              toast.show(`${conversation.name} blocked`);
            }}
            variant="danger"
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  attach: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  blockedNote: { ...text.caption, textAlign: "center" },
  bubble: { borderCurve: "continuous", borderRadius: 18, gap: 2, maxWidth: "82%", paddingHorizontal: space.sm + 2, paddingVertical: space.xs + 2 },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: space.xs },
  day: { ...text.caption, alignSelf: "center", backgroundColor: color.surfaceIcon, borderRadius: 10, marginVertical: space.xs, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 3 },
  empty: { ...text.bodySmall, textAlign: "center" },
  flex: { flex: 1 },
  footer: { gap: space.xs },
  hello: { alignItems: "center", gap: space.xs, marginTop: space.xl },
  input: {
    backgroundColor: color.searchField,
    borderRadius: corner.lg,
    color: color.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: space.md,
    paddingVertical: 10,
  },
  mine: { backgroundColor: color.accent, borderBottomRightRadius: 6 },
  mineText: { color: color.onPrimary },
  mineTime: { color: "rgba(255,255,255,0.75)" },
  mineWrap: { alignItems: "flex-end", gap: 2 },
  more: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  orderCard: {
    alignItems: "center",
    backgroundColor: color.surfaceSoft,
    borderCurve: "continuous",
    borderRadius: corner.md,
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.sm,
    padding: space.sm,
  },
  orderIcon: { alignItems: "center", backgroundColor: color.primary, borderRadius: 16, height: 32, justifyContent: "center", width: 32 },
  placeCard: { gap: 3, minWidth: 190 },
  placeName: { color: color.heading, fontSize: 17, fontWeight: "800" },
  placeRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  placeTitle: { color: color.textSecondary, fontSize: 11, fontWeight: "700" },
  quick: { gap: space.xs },
  quickChip: { backgroundColor: color.surface, borderColor: color.borderStrong, borderRadius: corner.pill, borderWidth: 1, justifyContent: "center", minHeight: 34, paddingHorizontal: space.sm },
  quickText: { color: color.heading, fontSize: 13, fontWeight: "600" },
  safety: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: space.sm },
  safetyText: { color: color.textSecondary, flex: 1, fontSize: 11 },
  send: { alignItems: "center", backgroundColor: color.primary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  sendDisabled: { opacity: 0.4 },
  sheetIntro: { marginBottom: space.xs },
  status: { color: color.textMuted, fontSize: 11, marginRight: 4 },
  theirs: { backgroundColor: color.surfaceSoft, borderBottomLeftRadius: 6 },
  theirsWrap: { alignItems: "flex-start", gap: 2 },
  thread: { gap: space.xs, marginTop: space.sm },
  time: { color: color.textMuted, fontSize: 10, textAlign: "right" },
});
