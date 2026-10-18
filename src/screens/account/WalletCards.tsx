import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import type { SavedCard } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

import { BrandMark } from "../cart/BrandMark";

export const WALLET_CARD_WIDTH = 190;
export const WALLET_CARD_HEIGHT = 300;
const GAP = space.sm;

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

/** Medium, upright cards in a swipeable row. The one in the middle is lifted; the others sit back a little. */
export function WalletCarousel({
  items,
  onAdd,
  onSelect,
  selected,
}: {
  items: WalletItem[];
  selected: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}) {
  const scroller = useRef<ScrollView>(null);
  const snap = WALLET_CARD_WIDTH + GAP;

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
        contentContainerStyle={styles.row}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={onEnd}
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
              else {
                scroller.current?.scrollTo({ animated: true, x: index * snap });
                onSelect(index);
              }
            }}
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

function WalletCard({ active, item, onPress }: { item: WalletItem; active: boolean; onPress: () => void }) {
  const lift = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    lift.set(withSpring(active ? 1 : 0, spring.soft));
  }, [active, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.82 + lift.get() * 0.18, transform: [{ scale: 0.95 + lift.get() * 0.05 }] }));
  const look = lookFor(item);

  return (
    <Pressable accessibilityLabel={look.label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} testID={`wallet-card-${item.id}`}>
      <Animated.View style={[styles.card, item.kind === "add" && styles.addCard, style]}>
        {look.colors ? <LinearGradient colors={look.colors} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} /> : null}
        <View pointerEvents="none" style={styles.bubble} />
        <View style={styles.top}>
          {item.kind === "add" ? (
            <View style={styles.plus}>
              <Icon color={color.heading} name="plus" size={22} />
            </View>
          ) : (
            <BrandMark kind={look.mark} />
          )}
          {look.tag ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{look.tag}</Text>
            </View>
          ) : null}
        </View>
        {item.kind === "card" ? <View style={styles.chip} /> : null}
        <View style={styles.bottom}>
          <Text style={[styles.title, look.dark ? styles.onLight : styles.onDark]}>{look.title}</Text>
          <Text style={[styles.sub, look.dark ? styles.onLightMuted : styles.onDarkMuted]}>{look.sub}</Text>
          {look.foot ? <Text style={[styles.foot, look.dark ? styles.onLightMuted : styles.onDarkMuted]}>{look.foot}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

type Look = {
  title: string;
  sub: string;
  foot?: string;
  tag?: string;
  label: string;
  mark: Parameters<typeof BrandMark>[0]["kind"];
  colors?: readonly [string, string];
  dark: boolean;
};

function lookFor(item: WalletItem): Look {
  switch (item.kind) {
    case "card": {
      const mc = item.card.brand === "mastercard";
      return {
        colors: mc ? gradient.ink : gradient.primary,
        dark: false,
        foot: `${item.card.holder || "Cardholder"} · ${item.card.expiry}`,
        label: `${mc ? "Mastercard" : "Visa"} ending ${item.card.last4}${item.card.isDefault ? ", default" : ""}`,
        mark: item.card.brand,
        sub: mc ? "Mastercard" : "Visa",
        tag: item.card.isDefault ? "Default" : undefined,
        title: `•••• ${item.card.last4}`,
      };
    }
    case "apple-pay":
      return { colors: ["#1C1C1E", "#000000"], dark: false, foot: item.ready ? "Ready on this iPhone" : "iPhone only", label: `Apple Pay, ${item.ready ? "ready" : "not on this phone"}`, mark: "apple-pay", sub: "Pay with Face ID or Touch ID", tag: item.ready ? "Ready" : "Not on this phone", title: "Apple Pay" };
    case "google-pay":
      return { colors: ["#FFFFFF", "#E8EEF1"], dark: true, foot: item.ready ? "Ready on this phone" : "Android only", label: `Google Pay, ${item.ready ? "ready" : "not on this phone"}`, mark: "google-pay", sub: "Pay with your Google account", tag: item.ready ? "Ready" : "Not on this phone", title: "Google Pay" };
    case "wallet":
      return { colors: gradient.teal, dark: false, foot: "Top up any time", label: `Vossie Wallet, ${formatRand(item.balanceCents)}`, mark: "wallet", sub: "Vossie Wallet", title: formatRand(item.balanceCents) };
    case "eft":
      return { colors: gradient.soft, dark: true, foot: "Pay straight from your bank", label: `Instant EFT${item.bank ? `, ${item.bank}` : ""}`, mark: "eft", sub: item.bank ? `Linked to ${item.bank}` : "Choose your bank at checkout", tag: item.bank ? "Linked" : undefined, title: "Instant EFT" };
    default:
      return { dark: true, label: "Add a new card", mark: "card", sub: "Visa or Mastercard", title: "Add a card" };
  }
}

const styles = StyleSheet.create({
  addCard: { backgroundColor: color.surfaceSoft, borderColor: color.borderStrong, borderStyle: "dashed", borderWidth: 1.5 },
  bleed: { marginHorizontal: -space.lg },
  bottom: { gap: 2, marginTop: "auto" },
  bubble: { backgroundColor: "rgba(255, 255, 255, 0.10)", borderRadius: 80, height: 160, position: "absolute", right: -60, top: -50, width: 160 },
  card: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 10px 24px rgba(30, 42, 56, 0.2)",
    height: WALLET_CARD_HEIGHT,
    overflow: "hidden",
    padding: space.md,
    width: WALLET_CARD_WIDTH,
  },
  chip: { backgroundColor: "rgba(255, 255, 255, 0.28)", borderRadius: 6, height: 28, marginTop: space.md, width: 40 },
  dot: { backgroundColor: color.mist, borderRadius: 3, height: 6, width: 6 },
  dotActive: { backgroundColor: color.ink, width: 18 },
  dots: { alignItems: "center", flexDirection: "row", gap: 5, justifyContent: "center", marginTop: space.sm },
  foot: { fontSize: 11, marginTop: 4 },
  onDark: { color: color.onPrimary },
  onDarkMuted: { color: "rgba(255, 255, 255, 0.78)" },
  onLight: { color: color.heading },
  onLightMuted: { color: color.textSecondary },
  plus: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  row: { gap: GAP, paddingHorizontal: space.lg, paddingVertical: space.xs },
  sub: { fontSize: 12 },
  tag: { backgroundColor: "rgba(255, 255, 255, 0.22)", borderRadius: corner.pill, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: color.mist, fontSize: 10, fontWeight: "800" },
  title: { fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "800" },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});

/** Index of the item to show first: the default card, or the first item. */
export function initialIndex(items: WalletItem[]): number {
  const index = items.findIndex((item) => item.kind === "card" && item.card.isDefault);
  return Math.max(0, index);
}

export function useWalletSelection(items: WalletItem[]) {
  return useState(() => initialIndex(items));
}
