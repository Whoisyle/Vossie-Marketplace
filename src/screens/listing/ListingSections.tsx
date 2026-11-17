import { type ReactNode, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, ListingCard, Media, StarRating } from "@/components";
import type { ProductDetail } from "@/data/mock/productDetails";
import type { Listing, Review } from "@/data/types";
import { color, corner, size, space, text } from "@/theme/tokens";

/**
 * The photos of a listing: one wide picture with rounded bottom corners that runs under the status bar.
 * Swipe through them; the counter and tappable dots sit on the picture, and `overlay` holds the buttons on top of it.
 */
export function ListingGallery({ images, overlay, title }: { images: (number | string)[]; title: string; overlay?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const count = Math.max(images.length, 1);
  const go = (next: number) => {
    setIndex(next);
    scroller.current?.scrollTo({ animated: true, x: next * width });
  };
  return (
    <View testID="listing-gallery">
      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.hero, { height: (width || 360) * 0.92 + insets.top }]}
      >
        <ScrollView
          horizontal
          onMomentumScrollEnd={(event) => width > 0 && setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          pagingEnabled
          ref={scroller}
          showsHorizontalScrollIndicator={false}
        >
          {(images.length > 0 ? images : [undefined]).map((source, position) => (
            <View key={position} style={{ height: "100%", width: width || 360 }}>
              <Media accessibilityLabel={`${title}, photo ${position + 1}`} radius={0} source={source} style={StyleSheet.absoluteFill} />
            </View>
          ))}
        </ScrollView>
        <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + space.xs }]}>
          {overlay}
        </View>
        {count > 1 ? (
          <>
            <View style={styles.dots}>
              {images.map((_, position) => (
                <Pressable
                  accessibilityLabel={`Photo ${position + 1}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  key={position}
                  onPress={() => go(position)}
                  style={[styles.dot, position === index && styles.dotOn]}
                />
              ))}
            </View>
            <View pointerEvents="none" style={styles.counter}>
              <Text style={styles.counterText}>
                {index + 1} / {count}
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

/** The description in paragraphs, what is good about it, and the facts table. */
export function ListingFacts({ detail }: { detail: ProductDetail }) {
  return (
    <View testID="listing-facts">
      <Text style={styles.heading}>Description</Text>
      <View style={styles.card}>
        {detail.about.map((paragraph, position) => (
          <Text key={position} style={[text.body, position > 0 && styles.gap]}>
            {paragraph}
          </Text>
        ))}
      </View>

      <Text style={styles.heading}>Highlights</Text>
      <View style={styles.card}>
        {detail.highlights.map((line) => (
          <View key={line} style={styles.bullet}>
            <Icon color={color.link} name="check-circle" size={16} />
            <Text style={[text.body, styles.flex]}>{line}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.heading}>Details</Text>
      <View style={styles.card}>
        {detail.specs.map(([label, value], position) => (
          <View key={label} style={[styles.specRow, position > 0 && styles.specBorder]}>
            <Text style={styles.specLabel}>{label}</Text>
            <Text style={styles.specValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The score, a couple of the latest reviews with the seller's replies, and a way to read them all. */
export function ReviewPreview({ listing, onAll, reviews }: { listing: Listing; reviews: Review[]; onAll: () => void }) {
  const shown = reviews.slice(0, 2);
  return (
    <View testID="listing-reviews">
      <View style={styles.reviewHead}>
        <Text style={styles.headingTight}>Reviews</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAll}>
          <Text style={styles.link}>See all {listing.ratingCount}</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <View style={styles.scoreRow}>
          <Text style={styles.score}>{listing.rating.toFixed(1)}</Text>
          <View style={styles.flex}>
            <StarRating size={16} value={listing.rating} />
            <Text style={text.caption}>{listing.ratingCount} ratings from students</Text>
          </View>
        </View>
        {shown.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.reviewTop}>
              <Text style={styles.reviewAuthor}>{review.mine ? "You" : review.author}</Text>
              <StarRating size={12} value={review.rating} />
            </View>
            <Text style={text.body}>{review.body}</Text>
            {review.reply ? (
              <View style={styles.reply}>
                <Text style={styles.replyHead}>Reply from the seller</Text>
                <Text style={text.bodySmall}>{review.reply}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** A row of other listings to look at next. */
export function ListingRow({ favourites, items, onOpen, onToggle, title }: { title: string; items: Listing[]; favourites: string[]; onOpen: (id: string) => void; onToggle: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <View testID={`row-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <Text style={styles.heading}>{title}</Text>
      <ScrollView contentContainerStyle={styles.rowContent} horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
        {items.map((item) => (
          <View key={item.id} style={styles.rowItem}>
            <ListingCard favourite={favourites.includes(item.id)} height={150} listing={item} onPress={() => onOpen(item.id)} onToggleFavourite={() => onToggle(item.id)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { alignItems: "flex-start", flexDirection: "row", gap: space.xs, paddingVertical: 3 },
  card: { backgroundColor: color.backgroundMuted, borderRadius: corner.lg, padding: space.md },
  counter: { backgroundColor: "rgba(30, 43, 51, 0.6)", borderRadius: corner.pill, bottom: space.md, paddingHorizontal: 10, paddingVertical: 4, position: "absolute", right: space.md },
  counterText: { color: color.onPrimary, fontSize: 12, fontWeight: "600" },
  dot: { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 3, height: 6, width: 6 },
  dotOn: { backgroundColor: "#FFFFFF", width: 16 },
  dots: { alignItems: "center", bottom: space.md + 6, flexDirection: "row", gap: 5, justifyContent: "center", left: 0, position: "absolute", right: 0 },
  flex: { flex: 1 },
  gap: { marginTop: space.xs },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  headingTight: { ...text.sectionTitle },
  hero: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginHorizontal: -size.screenGutter, overflow: "hidden" },
  overlay: { left: 0, paddingHorizontal: space.md, position: "absolute", right: 0, top: 0 },
  link: { color: color.link, fontSize: 13, fontWeight: "700" },
  reply: { backgroundColor: color.surface, borderRadius: 10, gap: 2, marginTop: 6, padding: space.xs },
  replyHead: { color: color.heading, fontSize: 11, fontWeight: "700" },
  review: { borderTopColor: "rgba(30,43,51,0.08)", borderTopWidth: 1, gap: 3, marginTop: space.sm, paddingTop: space.sm },
  reviewAuthor: { color: color.heading, fontSize: 13, fontWeight: "700" },
  reviewHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: space.xs, marginTop: space.md },
  reviewTop: { alignItems: "center", flexDirection: "row", gap: 8 },
  rowContent: { gap: space.sm },
  rowItem: { height: 150, width: 150 },
  rowScroll: { flexGrow: 0, height: 150 },
  score: { color: color.text, fontSize: 34, fontWeight: "800" },
  scoreRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  specBorder: { borderTopColor: "rgba(30,43,51,0.08)", borderTopWidth: 1 },
  specLabel: { color: color.textSecondary, flex: 0.9, fontSize: 13 },
  specRow: { flexDirection: "row", gap: space.sm, paddingVertical: 8 },
  specValue: { color: color.text, flex: 1.4, fontSize: 13, fontWeight: "600" },
});
