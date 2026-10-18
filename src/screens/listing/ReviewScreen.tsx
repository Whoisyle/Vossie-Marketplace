import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppHeader, Avatar, Button, Card, EmptyState, Icon, RatingSummary, Screen, StarRating, useToast } from "@/components";
import { shortDate } from "@/data/format";
import { getListing } from "@/data/repository";
import { haptic } from "@/lib/haptics";
import { reviewEligibility } from "@/state/demoReducer";
import { useDemoStore } from "@/state/DemoStore";
import { ease, spring } from "@/theme/motion";
import { color, corner, space, text } from "@/theme/tokens";

const MAX_LENGTH = 280;
const EXPLAIN = {
  already_reviewed: "You have already reviewed this item. Thank you.",
  needs_purchase: "Only buyers with a completed order for this item can review it. Order it and come back after it arrives.",
  signed_out: "Sign in to leave a review.",
} as const;

/** Ratings and reviews for one listing, plus a short review form for students who received it. */
export function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const listing = getListing(id);
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  const reviews = useMemo(() => state.reviews.filter((review) => review.listingId === id), [id, state.reviews]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const counts = useMemo(() => [5, 4, 3, 2, 1].map((star) => reviews.filter((review) => review.rating === star).length), [reviews]);
  const eligibility = reviewEligibility(state, id);

  if (!listing) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back" icon="alert-circle" onAction={() => router.back()} title="Listing not found" />
      </Screen>
    );
  }

  const submit = () => {
    if (!rating) return;
    dispatch({ body, listingId: listing.id, rating, type: "addReview" });
    haptic.success();
    setSent(true);
    toast.show("Thanks for your review");
  };

  return (
    <Screen
      footer={
        eligibility === "can_review" && !sent ? (
          <Button disabled={!rating} fullWidth label="Post review" onPress={submit} size="lg" testID="post-review" />
        ) : undefined
      }
    >
      <AppHeader back subtitle={listing.title} title="Ratings and reviews" />

      <Card style={styles.summary} variant="soft">
        <RatingSummary average={average || listing.rating} count={reviews.length || listing.ratingCount} />
        <View style={styles.bars}>
          {[5, 4, 3, 2, 1].map((star, row) => (
            <Bar count={counts[row]!} key={star} star={star} total={reviews.length} />
          ))}
        </View>
      </Card>

      {eligibility === "can_review" && !sent ? (
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text style={styles.heading}>How was it?</Text>
          <Card>
            <View style={styles.stars}>
              <StarRating onChange={setRating} size={34} value={rating} />
            </View>
            <TextInput
              accessibilityLabel="Your review"
              maxLength={MAX_LENGTH}
              multiline
              onChangeText={setBody}
              placeholder="Share a few words (optional)"
              placeholderTextColor={color.textMuted}
              style={styles.input}
              value={body}
            />
            <Text style={styles.counter}>
              {body.length}/{MAX_LENGTH}
            </Text>
          </Card>
        </Animated.View>
      ) : sent ? (
        <ThankYou />
      ) : (
        <Card style={styles.note} variant="soft">
          <Icon name="info" size={18} />
          <Text style={[text.bodySmall, styles.noteText]}>{EXPLAIN[eligibility === "can_review" ? "needs_purchase" : eligibility]}</Text>
        </Card>
      )}

      <Text style={styles.heading}>Reviews</Text>
      {reviews.length === 0 ? (
        <Text style={text.bodySmall}>No written reviews yet.</Text>
      ) : (
        <View style={styles.list}>
          {reviews.map((review, index) => (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(280)} key={review.id}>
              <Card>
                <View style={styles.reviewHead}>
                  <Avatar name={review.author} size={36} tone="soft" />
                  <View style={styles.flex}>
                    <Text style={text.cardTitle}>{review.author}</Text>
                    <Text style={text.caption}>{shortDate(review.createdAt)}</Text>
                  </View>
                  <StarRating size={13} value={review.rating} />
                </View>
                {review.body ? <Text style={[text.body, styles.reviewBody]}>{review.body}</Text> : null}
              </Card>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Bar({ count, star, total }: { count: number; star: number; total: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay((5 - star) * 70, withTiming(total ? count / total : 0, { duration: 520, easing: ease.out })));
  }, [count, fill, star, total]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{star}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, style]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

function ThankYou() {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, spring.bouncy));
  }, [pop]);
  const style = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ scale: 0.5 + pop.get() * 0.5 }] }));
  return (
    <Animated.View style={[styles.thanks, style]}>
      <View style={styles.tick}>
        <Icon color={color.onPrimary} name="check" size={30} />
      </View>
      <Text style={text.sectionTitle}>Thank you</Text>
      <Text style={text.bodySmall}>Your review helps other students choose.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barCount: { color: color.textMuted, fontSize: 11, textAlign: "right", width: 18 },
  barFill: { backgroundColor: color.accent, borderRadius: 3, height: 6 },
  barLabel: { color: color.textSecondary, fontSize: 11, width: 10 },
  barRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  barTrack: { backgroundColor: color.mist, borderRadius: 3, flex: 1, height: 6, overflow: "hidden" },
  bars: { flex: 1, gap: 5 },
  counter: { ...text.caption, textAlign: "right" },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  input: {
    backgroundColor: color.searchField,
    borderRadius: corner.md,
    color: color.text,
    fontSize: 15,
    marginTop: space.sm,
    minHeight: 96,
    padding: space.sm,
    textAlignVertical: "top",
  },
  list: { gap: space.xs },
  note: { alignItems: "flex-start", flexDirection: "row", gap: space.sm, marginTop: space.md },
  noteText: { flex: 1 },
  reviewBody: { marginTop: space.xs },
  reviewHead: { alignItems: "center", flexDirection: "row", gap: space.sm },
  stars: { alignItems: "center", paddingVertical: space.xs },
  summary: { alignItems: "center", flexDirection: "row", gap: space.lg, marginTop: space.sm },
  thanks: { alignItems: "center", gap: 6, marginTop: space.lg, paddingVertical: space.md },
  tick: { alignItems: "center", backgroundColor: color.success, borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
});

