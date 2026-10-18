import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  PanResponder,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Button, Icon, Sheet, useToast, type IconName } from "@/components";
import { useTabChrome } from "@/components/nav/TabChrome";
import { getCampusName, getSeller } from "@/data/repository";
import type { Reel } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { useDetail } from "@/lib/paths";
import { useDemoStore } from "@/state/DemoStore";
import { ease, spring } from "@/theme/motion";
import { color, space, text } from "@/theme/tokens";

const DOUBLE_TAP_MS = 280;
const LIKED = "#E2564B";

/**
 * Reels tab: a full-screen vertical feed.
 *  - double tap anywhere to like (a heart bursts where you tapped); a single tap pauses or plays
 *  - the store name, its campus and a short description sit bottom left; tap the store to open its page
 *  - the navbar is hidden here; swipe up from the bottom edge to bring it back for a moment
 */
export function ReelsScreen() {
  const router = useRouter();
  const open = useDetail();
  const toast = useToast();
  const chrome = useTabChrome();
  const insets = useSafeAreaInsets();
  const { dispatch, state } = useDemoStore();
  const [height, setHeight] = useState(0);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [paused, setPaused] = useState<string[]>([]);
  const active = state.reels.find((reel) => reel.id === commentsFor);

  useFocusEffect(
    useCallback(() => {
      chrome?.lock(true);
      return () => chrome?.lock(false);
    }, [chrome]),
  );

  const edgeSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy < -8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -24 || g.vy < -0.5) {
            haptic.tap();
            chrome?.peek();
          }
        },
      }),
    [chrome],
  );

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
        data={state.reels}
        decelerationRate="fast"
        extraData={height}
        keyExtractor={(reel) => reel.id}
        pagingEnabled
        renderItem={({ item }) => (
          <ReelPage
            bottomInset={insets.bottom}
            height={height}
            liked={state.likedReels.includes(item.id)}
            onComments={() => setCommentsFor(item.id)}
            onLike={() => dispatch({ reelId: item.id, type: "toggleReelLike" })}
            onOpenListing={() => item.listingId && router.push(open("listing", item.listingId))}
            onOpenStore={() => item.sellerId && router.push(open("store", item.sellerId))}
            onShare={() => void share(item)}
            onTogglePause={() =>
              setPaused((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))
            }
            paused={paused.includes(item.id)}
            reel={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
      />

      <View {...edgeSwipe.panHandlers} style={[styles.edge, { height: 36 + insets.bottom }]}>
        <View style={styles.handle} />
      </View>

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

type Burst = { id: number; x: number; y: number };

function ReelPage({
  bottomInset,
  height,
  liked,
  onComments,
  onLike,
  onOpenListing,
  onOpenStore,
  onShare,
  onTogglePause,
  paused,
  reel,
}: {
  reel: Reel;
  height: number;
  bottomInset: number;
  liked: boolean;
  paused: boolean;
  onLike: () => void;
  onComments: () => void;
  onShare: () => void;
  onOpenStore: () => void;
  onOpenListing: () => void;
  onTogglePause: () => void;
}) {
  const seller = reel.sellerId ? getSeller(reel.sellerId) : undefined;
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [expanded, setExpanded] = useState(false);
  const lastTap = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextBurst = useRef(0);
  const pauseFlash = useSharedValue(0);
  const likePop = useSharedValue(0);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );

  useEffect(() => {
    pauseFlash.set(withSequence(withTiming(1, { duration: 120 }), withTiming(paused ? 1 : 0, { duration: 420, easing: ease.out })));
  }, [paused, pauseFlash]);

  const popLike = () => likePop.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, spring.bouncy)));

  const onTap = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (pending.current) clearTimeout(pending.current);
      // a double tap only ever likes; use the heart button to unlike
      if (!liked) {
        haptic.success();
        onLike();
        popLike();
      }
      const id = (nextBurst.current += 1);
      setBursts((current) => [...current.slice(-3), { id, x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }]);
      return;
    }
    lastTap.current = now;
    pending.current = setTimeout(() => {
      haptic.tap();
      onTogglePause();
    }, DOUBLE_TAP_MS);
  };

  const likeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + likePop.get() * 0.4 }] }));
  const pauseStyle = useAnimatedStyle(() => ({ opacity: pauseFlash.get(), transform: [{ scale: 0.8 + pauseFlash.get() * 0.2 }] }));

  return (
    <View style={[styles.page, { backgroundColor: reel.tint, height }]}>
      <LinearGradient colors={[reel.tint, color.inkDeep]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Pressable
        accessibilityHint="Double tap to like, tap to pause"
        accessibilityLabel={`${reel.seller} reel`}
        onPress={onTap}
        style={StyleSheet.absoluteFill}
        testID={`reel-${reel.id}`}
      />

      <Animated.View pointerEvents="none" style={[styles.pauseBadge, pauseStyle]}>
        <Icon color={color.onPrimary} name={paused ? "play" : "pause"} size={30} />
      </Animated.View>

      {bursts.map((burst) => (
        <HeartBurst
          key={burst.id}
          onDone={() => setBursts((current) => current.filter((item) => item.id !== burst.id))}
          x={burst.x}
          y={burst.y}
        />
      ))}

      <View style={[styles.actions, { bottom: space.xl + bottomInset }]}>
        <Action
          active={liked}
          icon="heart"
          label={`${reel.likes + (liked ? 1 : 0)}`}
          onPress={() => {
            haptic.tap();
            onLike();
            popLike();
          }}
          style={likeStyle}
          title={liked ? "Unlike" : "Like"}
        />
        <Action icon="message-circle" label={`${reel.comments.length}`} onPress={onComments} title="Comments" />
        <Action icon="share-2" label="Share" onPress={onShare} title="Share" />
      </View>

      <View style={[styles.caption, { bottom: space.xl + bottomInset }]}>
        <Pressable accessibilityLabel={`Open ${reel.seller}`} accessibilityRole="button" onPress={onOpenStore} style={styles.storeRow}>
          <Avatar name={reel.seller} size={40} />
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.seller}>
              {reel.seller}
            </Text>
            <View style={styles.campusRow}>
              <Icon color={color.mist} name="map-pin" size={11} />
              <Text numberOfLines={1} style={styles.campus}>
                {seller ? getCampusName(seller.campusId) : "Eduvos campus"}
              </Text>
            </View>
          </View>
          <Icon color={color.mist} name="chevron-right" size={18} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)}>
          <Text numberOfLines={expanded ? 6 : 2} style={styles.captionText}>
            {reel.caption}
          </Text>
        </Pressable>
        {reel.listingId ? <Button icon="shopping-bag" label="View listing" onPress={onOpenListing} size="sm" variant="light" /> : null}
      </View>
    </View>
  );
}

function HeartBurst({ onDone, x, y }: { x: number; y: number; onDone: () => void }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 760, easing: ease.out }));
    const done = setTimeout(onDone, 800);
    return () => clearTimeout(done);
  }, [onDone, t]);
  const tilt = Math.round(x) % 2 ? 12 : -12;
  const style = useAnimatedStyle(() => {
    const v = t.get();
    const pop = v < 0.25 ? v / 0.25 : 1;
    return {
      opacity: v < 0.6 ? 1 : 1 - (v - 0.6) / 0.4,
      transform: [{ translateY: -v * 60 }, { scale: (0.3 + 0.9 * pop) * (1 + v * 0.3) }, { rotate: `${tilt}deg` }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.burst, { left: x - 45, top: y - 45 }, style]}>
      <Icon color={LIKED} name="heart" size={90} />
    </Animated.View>
  );
}

function Action({
  active = false,
  icon,
  label,
  onPress,
  style,
  title,
}: {
  icon: IconName;
  label: string;
  title: string;
  onPress: () => void;
  active?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityLabel={`${title}, ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.actionCircle, active && styles.actionActive, style]}>
        <Icon color={color.onPrimary} name={icon} size={20} />
      </Animated.View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", gap: 2, minWidth: 44 },
  actionActive: { backgroundColor: LIKED },
  actionCircle: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  actionLabel: { color: color.onPrimary, fontSize: 11, fontWeight: "600" },
  actions: { gap: space.sm, position: "absolute", right: space.sm },
  author: { color: color.heading, fontSize: 12, fontWeight: "700" },
  burst: { height: 90, position: "absolute", width: 90 },
  campus: { color: color.mist, flex: 1, fontSize: 12 },
  campusRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  caption: { gap: space.xs, left: space.md, position: "absolute", right: 88 },
  captionText: { color: color.onPrimary, fontSize: 14, lineHeight: 20 },
  comment: { gap: 2, paddingVertical: space.xs },
  composer: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.sm },
  edge: { alignItems: "center", bottom: 0, justifyContent: "flex-end", left: 0, paddingBottom: 8, position: "absolute", right: 0 },
  flex: { flex: 1 },
  handle: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 2, height: 4, width: 38 },
  input: { backgroundColor: color.searchField, borderRadius: 22, color: color.text, flex: 1, fontSize: 14, height: 44, paddingHorizontal: space.md },
  page: { width: "100%" },
  pauseBadge: { alignItems: "center", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 36, height: 72, justifyContent: "center", position: "absolute", top: "44%", width: 72 },
  pressed: { opacity: 0.7 },
  root: { backgroundColor: color.inkDeep, flex: 1 },
  seller: { color: color.onPrimary, fontSize: 16, fontWeight: "700" },
  storeRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
