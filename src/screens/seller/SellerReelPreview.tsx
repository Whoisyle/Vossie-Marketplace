import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState, type ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { formatRand } from "@/data/format";
import { engagementPercent } from "@/seller/selectors";

import { useSeller } from "./hooks";
import { ReelsPanel } from "./SellerReelsScreens";
import { SellerScreen, SellerTopBar, Text } from "./ui";

type VideoModule = {
  useVideoPlayer: (source: string, setup?: (player: { loop: boolean; play: () => void; pause: () => void }) => void) => { play: () => void; pause: () => void };
  VideoView: (props: { player: unknown; style: object; contentFit: string; nativeControls: boolean }) => ReactElement;
};

/** The video player is a separate package. With it, a picked video plays here; without it, the reel shows as the poster. */
let Video: VideoModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Video = require("expo-video") as VideoModule;
} catch {
  Video = null;
}

export const videoAvailable = Video !== null;

function Playing({ paused, uri }: { uri: string; paused: boolean }) {
  const player = Video!.useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.play();
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  const VideoView = Video!.VideoView;
  return <VideoView contentFit="cover" nativeControls={false} player={player} style={StyleSheet.absoluteFill} />;
}

const LOOP_MS = 14_000;

/**
 * A full-screen look at a reel the way a buyer sees it in the Reels tab: the video (or the product as the poster), the
 * caption, the like, save and shop buttons, and a progress line. Tap the page to pause. This does not count as a view.
 */
export function SellerReelPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const view = useSeller();
  const reel = view.seller.reels.find((item) => item.id === id);
  const listing = view.seller.listings.find((item) => item.id === reel?.listingId);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const progress = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced || paused) {
      progress.set(progress.get());
      return;
    }
    progress.set(withRepeat(withTiming(1, { duration: LOOP_MS * (1 - progress.get()), easing: Easing.linear }), -1, false));
    drift.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [drift, paused, progress, reduced]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const poster = useAnimatedStyle(() => ({ transform: [{ scale: 1.05 + drift.get() * 0.1 }, { translateX: (drift.get() - 0.5) * 18 }] }));

  if (!reel) {
    return (
      <SellerScreen tone="white" testID="seller-reel-missing">
        <SellerTopBar title="Reel" />
        <Text>That reel is not here any more.</Text>
      </SellerScreen>
    );
  }

  return (
    <View style={styles.page} testID="seller-reel-preview">
      <LinearGradient colors={["#2C4E5B", "#14232C"]} style={StyleSheet.absoluteFill} />
      {reel.videoUri && Video ? (
        <Playing paused={paused} uri={reel.videoUri} />
      ) : (
        <Animated.View style={[styles.posterWrap, poster]}>{listing?.artId && hasArt(listing.artId) ? <ArtTile id={listing.artId} inset={0.1} /> : <Icon color="rgba(255,255,255,0.4)" name="film" size={80} />}</Animated.View>
      )}
      <LinearGradient colors={["rgba(10,20,26,0)", "rgba(10,20,26,0.85)"]} locations={[0.4, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Pressable accessibilityLabel={paused ? "Play" : "Pause"} accessibilityRole="button" onPress={() => setPaused((value) => !value)} style={StyleSheet.absoluteFill} testID="reel-surface" />

      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={styles.top}>
        <Pressable accessibilityLabel="Close preview" accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.close} testID="close-preview">
          <Icon color="#FFFFFF" name="x" size={22} />
        </Pressable>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Preview · {reel.status === "published" ? "Live" : reel.status === "draft" ? "Draft" : "Hidden"}</Text>
        </View>
      </SafeAreaView>

      {paused ? (
        <View pointerEvents="none" style={styles.pausedWrap}>
          <View style={styles.pausedIcon}>
            <Icon color="#FFFFFF" name="play" size={30} />
          </View>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.rail}>
        <RailItem icon="heart" label={reel.likes} />
        <RailItem icon="bookmark" label={reel.saves} />
        <RailItem icon="eye" label={reel.views >= 1000 ? `${(reel.views / 1000).toFixed(1)}k` : reel.views} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.store}>@{view.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "")}</Text>
        <Text style={styles.caption} testID="preview-caption">
          {reel.caption}
        </Text>
        {listing ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/seller/products/${listing.id}` as Href)} style={styles.product} testID="preview-product">
            <Icon color="#FFFFFF" name="shopping-bag" size={16} />
            <Text style={styles.productText}>
              {listing.title} · {formatRand(listing.priceCents)}
            </Text>
            <Text style={styles.shop}>Shop</Text>
          </Pressable>
        ) : null}
        <Text style={styles.stats}>
          {engagementPercent(reel)}% engaged · {reel.orders} orders · {formatRand(reel.salesCents)} in sales
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        {reel.videoUri && !videoAvailable ? <Text style={styles.stats}>Video playback comes with the next app update. The poster is shown for now.</Text> : null}
      </View>
    </View>
  );
}

function RailItem({ icon, label }: { icon: "heart" | "bookmark" | "eye"; label: string | number }) {
  return (
    <View style={styles.railItem}>
      <Icon color="#FFFFFF" name={icon} size={26} />
      <Text style={styles.railText}>{label}</Text>
    </View>
  );
}

/** Account > Reels: the seller's reels with the stats, each with a preview. */
export function SellerReelsPageScreen() {
  const router = useRouter();
  const view = useSeller();
  return (
    <SellerScreen tone="white" testID="seller-reels-page">
      <SellerTopBar title="Reels" />
      <Text style={styles.sub}>Tap a reel to change it, or watch it as a buyer would.</Text>
      <ReelsPanel onPreview={(id) => router.push(`/seller/account/reel-preview/${id}` as Href)} />
      <Text style={styles.hint}>{view.seller.reels.length === 0 ? "" : "Views and likes in this demo grow by themselves."}</Text>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  bottom: { bottom: 28, gap: 8, left: 18, position: "absolute", right: 86 },
  caption: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", lineHeight: 23 },
  close: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  fill: { backgroundColor: "#FFFFFF", borderRadius: 2, height: 3 },
  hint: { color: "rgba(95,110,118,1)", fontSize: 12, marginTop: 10, textAlign: "center" },
  page: { backgroundColor: "#14232C", flex: 1 },
  pausedIcon: { alignItems: "center", backgroundColor: "rgba(20,35,44,0.55)", borderRadius: 40, height: 80, justifyContent: "center", width: 80 },
  pausedWrap: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  posterWrap: { alignSelf: "center", height: "62%", marginTop: "28%", width: "78%" },
  product: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 22, flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  productText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  rail: { bottom: 130, gap: 22, position: "absolute", right: 16 },
  railItem: { alignItems: "center", gap: 2 },
  railText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  shop: { color: "#9FE3C0", fontSize: 14, fontWeight: "800" },
  stats: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  store: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "800" },
  sub: { color: "rgba(95,110,118,1)", fontSize: 14, marginTop: 8 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", left: 16, position: "absolute", right: 16, top: 0 },
  track: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2, height: 3, overflow: "hidden" },
});
