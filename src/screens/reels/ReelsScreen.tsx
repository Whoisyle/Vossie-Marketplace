import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button, Icon, Sheet, useToast, type IconName } from "@/components";
import type { Reel } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** Reels tab: full-screen vertical feed with like, comment, share and a link to the listing. */
export function ReelsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [height, setHeight] = useState(0);
  const { dispatch, state } = useDemoStore();
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [paused, setPaused] = useState<string[]>([]);
  const active = state.reels.find((reel) => reel.id === commentsFor);

  const share = async (reel: Reel) => {
    try {
      await Share.share({ message: `${reel.seller} on Vossie: ${reel.caption}` });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  const submit = () => {
    if (!active || !draft.trim()) return;
    dispatch({ body: draft, reelId: active.id, type: "addReelComment" });
    setDraft("");
  };

  return (
    <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={styles.root} testID="reels-screen">
      <FlatList
        extraData={height}
        data={state.reels}
        decelerationRate="fast"
        keyExtractor={(reel) => reel.id}
        pagingEnabled
        renderItem={({ item }) => {
          const liked = state.likedReels.includes(item.id);
          const isPaused = paused.includes(item.id);
          return (
            <View style={[styles.page, { backgroundColor: item.tint, height }]}>
              <Pressable
                accessibilityLabel={isPaused ? "Play reel" : "Pause reel"}
                accessibilityRole="button"
                onPress={() =>
                  setPaused((current) =>
                    current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id],
                  )
                }
                style={styles.center}
              >
                <View style={styles.play}>
                  <Icon color={color.onPrimary} name={isPaused ? "play" : "pause"} size={26} />
                </View>
              </Pressable>

              <View style={[styles.actions, { bottom: space.xl }]}>
                <Action
                  active={liked}
                  icon="heart"
                  label={`${item.likes + (liked ? 1 : 0)}`}
                  onPress={() => dispatch({ reelId: item.id, type: "toggleReelLike" })}
                  title={liked ? "Unlike" : "Like"}
                />
                <Action
                  icon="message-circle"
                  label={`${item.comments.length}`}
                  onPress={() => setCommentsFor(item.id)}
                  title="Comments"
                />
                <Action icon="share-2" label="Share" onPress={() => void share(item)} title="Share" />
              </View>

              <View style={[styles.caption, { bottom: space.xl }]}>
                <Text style={styles.seller}>{item.seller}</Text>
                <Text numberOfLines={3} style={styles.captionText}>
                  {item.caption}
                </Text>
                {item.listingId ? (
                  <Button
                    label="View listing"
                    onPress={() => router.push(`/home/listing/${item.listingId}` as Href)}
                    size="sm"
                    variant="light"
                  />
                ) : null}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
      />

      <Sheet onClose={() => setCommentsFor(null)} title="Comments" visible={Boolean(active)}>
        {active?.comments.length === 0 ? <Text style={text.bodySmall}>Be the first to comment.</Text> : null}
        {active?.comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Text style={styles.author}>@{comment.author}</Text>
            <Text style={text.body}>{comment.body}</Text>
          </View>
        ))}
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Add a comment"
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Add a comment"
            placeholderTextColor={color.textMuted}
            returnKeyType="send"
            style={styles.input}
            value={draft}
          />
          <Button disabled={!draft.trim()} label="Post" onPress={submit} size="sm" />
        </View>
      </Sheet>
    </View>
  );
}

function Action({
  active = false,
  icon,
  label,
  onPress,
  title,
}: {
  icon: IconName;
  label: string;
  title: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title}, ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={[styles.actionCircle, active && styles.actionActive]}>
        <Icon color={color.onPrimary} name={icon} size={20} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", gap: 2, minWidth: 44 },
  actionActive: { backgroundColor: "#E2564B" },
  actionCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionLabel: { color: color.onPrimary, fontSize: 11, fontWeight: "600" },
  actions: { gap: space.sm, position: "absolute", right: space.sm },
  author: { color: color.heading, fontSize: 12, fontWeight: "700" },
  caption: { gap: space.xs, left: space.md, position: "absolute", right: 88 },
  captionText: { color: color.onPrimary, fontSize: 14, lineHeight: 20 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  comment: { gap: 2, paddingVertical: space.xs },
  composer: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.sm },
  input: {
    backgroundColor: color.searchField,
    borderRadius: 22,
    color: color.text,
    flex: 1,
    fontSize: 14,
    height: 44,
    paddingHorizontal: space.md,
  },
  page: { width: "100%" },
  play: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  pressed: { opacity: 0.7 },
  root: { backgroundColor: color.primary, flex: 1 },
  seller: { color: color.onPrimary, fontSize: 16, fontWeight: "700" },
});
