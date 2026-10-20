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
import { issuerByName, schemeFaces } from "@/data/cardBrands";
import { formatRand } from "@/data/format";
import type { SavedCard } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, space } from "@/theme/tokens";

import { BankFace } from "./BankFaces";
import { Chip, Contactless, SchemeLogo } from "./CardArt";
import { ApplePayFace, GooglePayFace, VossieWalletFace } from "./PayFaces";

/** Cards are drawn horizontally at real card proportions (85.6 x 54 mm). */
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
 * A plain horizontal card face with a gradient, at real card proportions. The card preview for a card with no bank
 * chosen and the "add a card" tile are built on this.
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
    <View style={[styles.card, dashed && styles.dashed, { borderRadius: Math.round(width * 0.05), height, width }]} testID={testID}>
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

/**
 * The face of one saved card, drawn like the real thing: the issuing bank's own design, or the Visa or Mastercard
 * colours when no bank is chosen. Also the live preview when adding or editing a card.
 */
export function CardFace({ card, width = WALLET_CARD_WIDTH }: { card: SavedCard; width?: number }) {
  const issuer = issuerByName(card.issuer);
  if (issuer) return <BankFace card={card} issuer={issuer} width={width} />;
  const scale = width / WALLET_CARD_WIDTH;
  return (
    <CardSurface colors={schemeFaces[card.brand].face} testID="card-face" width={width}>
      <View style={styles.row}>
        <Text style={[styles.bank, { fontSize: 15 * scale }]}>{card.brand === "mastercard" ? "Mastercard" : "Visa"}</Text>
        <Contactless size={22 * scale} />
      </View>
      <Chip size={scale} />
      <View style={styles.rowEnd}>
        <View style={styles.flex}>
          <Text style={[styles.number, { fontSize: 18 * scale }]}>•••• •••• •••• {card.last4}</Text>
          <Text style={styles.small}>{card.isDefault ? "DEFAULT · " : ""}VALID THRU {card.expiry}</Text>
          <Text numberOfLines={1} style={styles.holder}>
            {(card.holder || "Cardholder").toUpperCase()}
          </Text>
        </View>
        <SchemeLogo brand={card.brand} size={64 * scale} />
      </View>
    </CardSurface>
  );
}

/** Cards in a swipeable row that moves on by itself. The next card peeks in at the edge. */
export function WalletCarousel({
  items,
  onAdd,
  onChooseBank,
  onEditCard,
  onSelect,
  selected,
}: {
  items: WalletItem[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  /** Tapping the instant EFT card once it is showing opens the bank chooser. */
  onChooseBank?: () => void;
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
              else if (item.kind === "eft" && index === selected && onChooseBank) onChooseBank();
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
      return <ApplePayFace ready={item.ready} width={width} />;
    case "google-pay":
      return <GooglePayFace ready={item.ready} width={width} />;
    case "wallet":
      return <VossieWalletFace balanceCents={item.balanceCents} width={width} />;
    case "eft": {
      const bank = issuerByName(item.bank);
      if (bank) {
        return <BankFace card={{ brand: "visa", expiry: "", holder: "", id: "eft", isDefault: false, issuer: bank.id, last4: "" }} eft issuer={bank} width={width} />;
      }
      return (
        <CardSurface colors={["#E8EEF1", "#CBD8DF"]} width={width}>
          <Text style={[styles.bank, styles.dark]}>Instant EFT</Text>
          <Icon color={color.heading} name="repeat" size={28} />
          <View>
            <Text style={[styles.big, styles.dark]}>Choose your bank</Text>
            <Text style={[styles.small, styles.darkMuted]}>Pay straight from your bank</Text>
          </View>
        </CardSurface>
      );
    }
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
  bank: { color: color.onPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  big: { color: color.onPrimary, fontSize: 18, fontWeight: "800" },
  bleed: { marginHorizontal: -space.lg },
  card: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.22)",
    overflow: "hidden",
  },
  dark: { color: color.heading },
  darkMuted: { color: color.textSecondary },
  dashed: { backgroundColor: color.surfaceSoft, borderColor: color.borderStrong, borderStyle: "dashed", borderWidth: 1.5, boxShadow: "none" },
  dot: { backgroundColor: color.mist, borderRadius: 3, height: 6, width: 6 },
  dotActive: { backgroundColor: color.ink, width: 18 },
  dots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", marginTop: space.sm },
  holder: { color: color.onPrimary, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
  inner: { flex: 1, justifyContent: "space-between", padding: space.md },
  number: { color: color.onPrimary, fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: 1.5 },
  plus: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowEnd: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  flex: { flex: 1 },
  scrollRow: { gap: GAP, paddingHorizontal: space.lg, paddingVertical: space.xs },
  small: { color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
});

/** Index of the item to show first: the default card, or the first item. */
export function initialIndex(items: WalletItem[]): number {
  const index = items.findIndex((item) => item.kind === "card" && item.card.isDefault);
  return Math.max(0, index);
}

export function useWalletSelection(items: WalletItem[]) {
  return useState(() => initialIndex(items));
}
