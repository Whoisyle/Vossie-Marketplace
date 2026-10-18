import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppHeader, EmptyState, Icon, Screen } from "@/components";
import { timeOfDay } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** One conversation: message bubbles and a composer. Messages stay on this device in the demo. */
export function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const [draft, setDraft] = useState("");
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
          actionLabel="Back to Inbox"
          icon="mail"
          onAction={() => router.replace("/account/inbox" as Href)}
          title="Conversation not found"
        />
      </Screen>
    );
  }

  const send = () => {
    if (!draft.trim()) return;
    dispatch({ body: draft, conversationId: conversation.id, type: "sendMessage" });
    setDraft("");
  };

  return (
    <Screen
      footer={
        <View style={styles.composer}>
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
            onPress={send}
            style={[styles.send, !draft.trim() && styles.sendDisabled]}
            testID="send-message"
          >
            <Icon color={color.onPrimary} name="send" size={18} />
          </Pressable>
        </View>
      }
    >
      <AppHeader back title={conversation.name} />
      <View style={styles.thread}>
        {conversation.messages.length === 0 ? (
          <Text style={styles.empty}>Say hello to {conversation.name}.</Text>
        ) : (
          conversation.messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.fromMe ? styles.mine : styles.theirs]}
            >
              <Text style={[text.body, message.fromMe && styles.mineText]}>{message.body}</Text>
              <Text style={[styles.time, message.fromMe && styles.mineText]}>{timeOfDay(message.sentAt)}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: corner.md, gap: 2, maxWidth: "80%", paddingHorizontal: space.sm, paddingVertical: space.xs },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: space.xs },
  empty: { ...text.bodySmall, marginTop: space.lg, textAlign: "center" },
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
  mine: { alignSelf: "flex-end", backgroundColor: color.accent },
  mineText: { color: color.onPrimary },
  send: {
    alignItems: "center",
    backgroundColor: color.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  sendDisabled: { opacity: 0.4 },
  theirs: { alignSelf: "flex-start", backgroundColor: color.surfaceSoft },
  thread: { gap: space.xs, marginTop: space.sm },
  time: { color: color.textMuted, fontSize: 10, textAlign: "right" },
});
