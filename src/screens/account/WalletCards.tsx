import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components";
import { landscapeHeight } from "@/components/StudentCard";
import { formatRand } from "@/data/format";
import type { SavedCard } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

import { BrandMark } from "../cart/BrandMark";

/** Cards are drawn landscape at real card proportions (85.6 x 54 mm). */
export const WALLET_CARD_WIDTH = 300;
export const WALLET_CARD_HEIGHT = landscapeHeight(WALLET_CARD_WIDTH);
const GAP = space.sm;

/** The card width that fits the screen, leaving the next card peeking in at the edge. */
export function walletCardWidth(screenWidth: number): number {
  return Math.min(340, Math.max(260, screenWidth - space.lg * 2 - 28));
}

/** How long the carousel stays on a card before moving on, and how long it waits after a touch. */
export const WALLET_AUTO_MS = 3800;
export const WALLET_RESUME_MS = 6000;

export type WalletItem =
  | { kind: "card"; id: string; card: SavedCard }
  | { kind: "apple-pay"; id: string; ready: boolean }
  | { kind: "google-pay"; id: string; ready: boolean }
  | { kind: "wallet"; id: string; balanceCents: number }
  | { kind: "eft"; id: string; bank: string | null }
  | { kind: "add"; id: string };

/**
 * Everything the student can pay with, in the order shown: saved cards, Apple Pay, Google Pay, Vossie Wallet,
 * instant EFT, then "add a card". Apple Pay is ready on iPhone and Google Pay on Android; the other shows that
 * it is not on this phone. Nothing here is connected to a real provider yet.
 */
export function walletItems(input: {
  cards: SavedCard[];
  balanceCents: number;
  bank: string | null;
  os?: string;
}): WalletItem[] {
  const os = input.os ?? Platform.OS;
  return [
    ...input.cards.map((card): WalletItem => ({ card, id: card.id, kind: "card" })),
    { id: "apple-pay", kind: "apple-pay", ready: os === "ios" },
    { id: "google-pay", kind: "google-pay", ready: os === "android" },
    { balanceCents: input.balanceCents, id: "wallet", kind: "wallet" },
    { bank: input.bank, id: "eft", kind: "eft" },
    { id: "add", kind: "add" },
  ];
}

/**
 * The face of a payment card: a deep gradient with soft wave lines, drawn at real card proportions. Everything on
 * the wallet screen that looks like a card (saved cards, the balance, the edit preview) is built on this.
 */
export function CardSurface({
  children,
  colors,
  dashed = false,
  testID,
  width,
}: {
  width: number;
  colors?: readonly [string, string];
  dashed?: boolean;
  children?: ReactNode;
  testID?: string;
}) {
  const height = landscapeHeight(width);
  return (
    <View style={[styles.card, dashed && styles.dashed, { height, width }]} testID={testID}>
      {colors ? <LinearGradient colors={colors} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
      {colors ? (
        <Svg height={height} pointerEvents="none" style={StyleSheet.absoluteFill} width={width}>
          {[0, 1, 2, 3, 4].map((line) => (
            <Path
              d={`M ${-20} ${height * (0.35 + line * 0.09)} C ${width * 0.3} ${height * (0.05 + line * 0.1)}, ${width * 0.55} ${height * (0.95 - line * 0.08)}, ${width + 20} ${height * (0.3 + line * 0.07)}`}
              fill="none"
              key={line}
              stroke="rgba(255,255,255,0.13)"
              strokeWidth={1}
            />
          ))}
        </Svg>
      ) : null}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

/** The face of one saved card; also used as the live preview when editing a card. */
export function CardFace({ card, width = WALLET_CARD_WIDTH }: { card: SavedCard; width?: number }) {
  const mc = card.brand === "mastercard";
  return (
    <CardSurface colors={mc ? ["#10161F", "#1B2B3C"] : ["#16243A", "#2A5B6B"]} testID="card-face" width={width}>
      <View style={styles.row}>
        <Text style={styles.bank}>Vossie</Text>
        <Text style={styles.tier}>{card.isDefault ? "Default · " : ""}{mc ? "Mastercard" : "Visa"}</Text>
      </View>
      <Text style={styles.number}>•••• •••• •••• {card.last4}</Text>
      <View style={styles.rowEnd}>
        <View style={styles.flex}>
          <Text style={styles.small}>VALID THRU</Text>
          <Text style={styles.value}>{card.expiry}</Text>
          <Text numberOfLines={1} style={styles.holder}>
            {(card.holder || "Cardholder").toUpperCase()}
          </Text>
        </View>
        <BrandMark kind={card.brand} />
      </View>
    </CardSurface>
  );
}

/** Landscape cards in a swipeable row that moves on by itself. The next card peeks in at the edge. */
export function WalletCarousel({
  items,
  onAdd,
  onEditCard,
  onSelect,
  selected,
}: {
  items: WalletItem[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  /** Tapping a saved card opens it for editing. */
  onEditCard: (cardId: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = walletCardWidth(screenWidth);
  const scroller = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  const snap = cardWidth + GAP;
  const pausedUntil = useRef(0);
  const current = useRef(selected);
  useEffect(() => {
    current.current = selected;
  });

  // moves on by itself, stops while a finger is on it, and stays still with Reduce Motion
  useEffect(() => {
    if (reduced || items.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const next = (current.current + 1) % items.length;
      scroller.current?.scrollTo({ animated: true, x: next * snap });
      onSelect(next);
    }, WALLET_AUTO_MS);
    return () => clearInterval(timer);
  }, [items.length, onSelect, reduced, snap]);

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(items.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / snap)));
    if (next !== selected) {
      haptic.select();
      onSelect(next);
    }
  };

  return (
    <View>
      <ScrollView
        contentContainerStyle={styles.scrollRow}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={onEnd}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + WALLET_RESUME_MS;
        }}
        ref={scroller}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        style={styles.bleed}
        testID="wallet-carousel"
      >
        {items.map((item, index) => (
          <WalletCard
            active={index === selected}
            item={item}
            key={item.id}
            onPress={() => {
              if (item.kind === "add") onAdd();
              else if (item.kind === "card") onEditCard(item.card.id);
              else {
                scroller.current?.scrollTo({ animated: true, x: index * snap });
                onSelect(index);
              }
            }}
            width={cardWidth}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {items.map((item, index) => (
          <View key={item.id} style={[styles.dot, index === selected && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function WalletCard({ active, item, onPress, width }: { item: WalletItem; active: boolean; onPress: () => void; width: number }) {
  const lift = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.85 + lift.get() * 0.15, transform: [{ scale: 0.96 + lift.get() * 0.04 }] }));
  const label = labelFor(item);

  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} testID={`wallet-card-${item.id}`}>
      <Animated.View style={style}>{item.kind === "card" ? <CardFace card={item.card} width={width} /> : <OtherFace item={item} width={width} />}</Animated.View>
    </Pressable>
  );
}

function OtherFace({ item, width }: { item: Exclude<WalletItem, { kind: "card" }>; width: number }) {
  switch (item.kind) {
    case "apple-pay":
      return (
        <CardSurface colors={["#1C1C1E", "#000000"]} width={width}>
          <View style={styles.row}>
            <Text style={styles.bank}>Apple Pay</Text>
            <Text style={styles.tier}>{item.ready ? "Ready" : "Not on this phone"}</Text>
          </View>
          <Text style={styles.big}>Pay with Face ID</Text>
          <View style={styles.rowEnd}>
            <Text style={[styles.small, styles.flex]}>{item.ready ? "Ready on this iPhone" : "iPhone only"}</Text>
            <BrandMark kind="apple-pay" />
          </View>
        </CardSurface>
      );
    case "google-pay":
      return (
        <CardSurface colors={["#F7F9FA", "#DCE5EA"]} width={width}>
          <View style={styles.row}>
            <Text style={[styles.bank, styles.dark]}>Google Pay</Text>
            <Text style={[styles.tier, styles.darkMuted]}>{item.ready ? "Ready" : "Not on this phone"}</Text>
          </View>
          <Text style={[styles.big, styles.dark]}>Pay with Google</Text>
          <View style={styles.rowEnd}>
            <Text style={[styles.small, styles.darkMuted, styles.flex]}>{item.ready ? "Ready on this phone" : "Android only"}</Text>
            <BrandMark kind="google-pay" />
          </View>
        </CardSurface>
      );
    case "wallet":
      return (
        <CardSurface colors={gradient.teal} width={width}>
          <View style={styles.row}>
            <Text style={styles.bank}>Vossie Wallet</Text>
            <Text style={styles.tier}>Balance</Text>
          </View>
          <Text style={styles.big}>{formatRand(item.balanceCents)}</Text>
          <View style={styles.rowEnd}>
            <Text style={[styles.small, styles.flex]}>Top up any time</Text>
            <BrandMark kind="wallet" />
          </View>
        </CardSurface>
      );
    case "eft":
      return (
        <CardSurface colors={["#E8EEF1", "#CBD8DF"]} width={width}>
          <View style={styles.row}>
            <Text style={[styles.bank, styles.dark]}>Instant EFT</Text>
            <Text style={[styles.tier, styles.darkMuted]}>{item.bank ? "Linked" : "Not linked"}</Text>
          </View>
          <Text style={[styles.big, styles.dark]}>{item.bank ?? "Choose your bank"}</Text>
          <View style={styles.rowEnd}>
            <Text style={[styles.small, styles.darkMuted, styles.flex]}>Pay straight from your bank</Text>
            <BrandMark kind="eft" />
          </View>
        </CardSurface>
      );
    default:
      return (
        <CardSurface dashed width={width}>
          <View style={styles.addCenter}>
            <View style={styles.plus}>
              <Icon color={color.heading} name="plus" size={22} />
            </View>
            <Text style={[styles.big, styles.dark]}>Add a card</Text>
            <Text style={[styles.small, styles.darkMuted]}>Visa or Mastercard</Text>
          </View>
        </CardSurface>
      );
  }
}

function labelFor(item: WalletItem): string {
  switch (item.kind) {
    case "card":
      return `${item.card.brand === "mastercard" ? "Mastercard" : "Visa"} ending ${item.card.last4}${item.card.isDefault ? ", default" : ""}. Opens the card to edit.`;
    case "apple-pay":
      return `Apple Pay, ${item.ready ? "ready" : "not on this phone"}`;
    case "google-pay":
      return `Google Pay, ${item.ready ? "ready" : "not on this phone"}`;
    case "wallet":
      return `Vossie Wallet, ${formatRand(item.balanceCents)}`;
    case "eft":
      return `Instant EFT${item.bank ? `, ${item.bank}` : ""}`;
    default:
      return "Add a new card";
  }
}

const styles = StyleSheet.create({
  addCenter: { alignItems: "center", flex: 1, gap: 4, justifyContent: "center" },
  bank: { color: color.onPrimary, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  big: { color: color.onPrimary, fontSize: 26, fontVariant: ["tabular-nums"], fontWeight: "800" },
  bleed: { marginHorizontal: -space.lg },
  card: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.22)",
    overflow: "hidden",
  },
  dark: { color: color.heading },
  darkMuted: { color: color.textSecondary },
  dashed: { backgroundColor: color.surfaceSoft, borderColor: color.borderStrong, borderStyle: "dashed", borderWidth: 1.5, boxShadow: "none" },
  dot: { backgroundColor: color.mist, borderRadius: 3, height: 6, width: 6 },
  dotActive: { backgroundColor: color.ink, width: 18 },
  dots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", marginTop: space.sm },
  flex: { flex: 1 },
  holder: { color: color.onPrimary, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  inner: { flex: 1, justifyContent: "space-between", padding: space.md },
  number: { color: color.onPrimary, fontSize: 20, fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: 2 },
  plus: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowEnd: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  scrollRow: { gap: GAP, paddingHorizontal: space.lg, paddingVertical: space.xs },
  small: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  tier: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  value: { color: color.onPrimary, fontSize: 14, fontVariant: ["tabular-nums"], fontWeight: "700" },
});

/** Index of the item to show first: the default card, or the first item. */
export function initialIndex(items: WalletItem[]): number {
  const index = items.findIndex((item) => item.kind === "card" && item.card.isDefault);
  return Math.max(0, index);
}

export function useWalletSelection(items: WalletItem[]) {
  return useState(() => initialIndex(items));
}
