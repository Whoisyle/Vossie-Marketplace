import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { Button, Icon, Sheet, useToast } from "@/components";
import { ArtTile, hasArt } from "@/components/art/ProductArt";
import { LIMITS, upgradeReason } from "@/seller/plan";
import { bestReel, engagementPercent, liveReelCount, rankReels } from "@/seller/selectors";
import { sellerId } from "@/seller/state";
import type { SellerListing, SellerReel } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import { SellerField } from "./fields";
import { useSeller } from "./hooks";
import { Pill, SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar, SellerWell, Text } from "./ui";

/** Tells a seller what the next plan adds, and sends them to the plans. Used wherever a plan limit is reached. */
export function UpgradeSheet({ kind, onClose, visible }: { kind: "products" | "reels" | "analytics" | "orderTools" | "returningBuyers"; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  return (
    <Sheet onClose={onClose} title="Upgrade your plan" visible={visible}>
      <Text style={text.body}>{upgradeReason(kind)}</Text>
      <Button
        fullWidth
        label="See plans"
        onPress={() => {
          onClose();
          router.push("/seller/account/plans" as Href);
        }}
        testID="see-plans"
      />
      <Button fullWidth label="Not now" onPress={onClose} variant="soft" />
    </Sheet>
  );
}

function Thumb({ listing }: { listing?: SellerListing }) {
  return (
    <View style={styles.thumb}>
      {listing?.artId && hasArt(listing.artId) ? <ArtTile id={listing.artId} inset={0.06} /> : <Icon color="#FFFFFF" name="film" size={22} />}
      <View style={styles.play}>
        <Icon color="#FFFFFF" name="play" size={12} />
      </View>
    </View>
  );
}

const STATUS = { draft: { label: "Draft", tone: "neutral" }, hidden: { label: "Hidden", tone: "warn" }, published: { label: "Live", tone: "success" } } as const;

/** The seller's reels inside Products: each with how it is doing, the best performer marked, and a way to hide, edit or delete it. */
export function ReelsPanel({ onPreview }: { onPreview?: (id: string) => void } = {}) {
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const [upgrade, setUpgrade] = useState(false);
  const [removing, setRemoving] = useState<SellerReel | null>(null);
  const reels = rankReels(view.seller.reels);
  const best = bestReel(view.seller.reels);
  const live = liveReelCount(view.seller.reels);
  const limit = LIMITS[view.plan].liveReels;
  const canAdd = live < limit;

  return (
    <View testID="reels-panel">
      <View style={styles.head}>
        <Text style={styles.hint}>
          {live} live{Number.isFinite(limit) && limit > 0 ? ` of ${limit}` : ""} · {reels.length} total{limit === 0 ? " · new reels need Plus" : ""}
        </Text>
        <SellerButton icon="plus" label="Add reel" onPress={() => (canAdd ? router.push("/seller/products/reel/new" as Href) : setUpgrade(true))} size="sm" testID="add-reel" variant="light" />
      </View>
      {reels.length === 0 ? (
        <SellerCard style={styles.empty} testID="reels-empty">
          <Icon color={SELLER.solid} name="film" size={26} />
          <Text style={styles.name}>No reels yet</Text>
          <Text style={styles.hint}>A short video of a product shows it to students in the Reels tab.</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {reels.map((reel, index) => {
            const listing = view.seller.listings.find((item) => item.id === reel.listingId);
            const look = STATUS[reel.status];
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(320)} key={reel.id} layout={LinearTransition.springify().damping(20)}>
                <SellerCard onPress={() => router.push(`/seller/products/reel/${reel.id}` as Href)} style={styles.card} testID={`reel-${reel.id}`}>
                  <View style={styles.row}>
                    <Thumb listing={listing} />
                    <View style={styles.flex}>
                      <Text numberOfLines={2} style={styles.name}>
                        {reel.caption}
                      </Text>
                      <Text numberOfLines={1} style={styles.hint}>
                        {listing ? listing.title : "No product linked"}
                      </Text>
                      <View style={styles.pills}>
                        <Pill label={look.label} tone={look.tone} />
                        {best?.id === reel.id ? <Pill label="Best performing" tone="info" /> : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.stats}>
                    <Stat label="Views" value={reel.views.toLocaleString("en-ZA")} />
                    <Stat label="Likes" value={reel.likes} />
                    <Stat label="Taps" value={reel.taps} />
                    <Stat label="Orders" value={reel.orders} />
                  </View>
                  <View style={styles.actions}>
                    <SellerButton icon="play" label="Preview" onPress={() => (onPreview ?? ((id: string) => router.push(`/seller/account/reel-preview/${id}` as Href)))(reel.id)} size="sm" testID={`preview-${reel.id}`} variant="light" />
                    {reel.status === "draft" || reel.status === "hidden" ? (
                      <SellerButton
                        label="Publish"
                        onPress={() => {
                          if (!canAdd) return setUpgrade(true);
                          view.dispatch({ id: reel.id, status: "published", type: "sellerSetReelStatus" });
                          toast.show("Reel is live");
                        }}
                        size="sm"
                        testID={`publish-${reel.id}`}
                        variant="solid"
                      />
                    ) : (
                      <SellerButton label="Hide" onPress={() => view.dispatch({ id: reel.id, status: "hidden", type: "sellerSetReelStatus" })} size="sm" testID={`hide-${reel.id}`} variant="outline" />
                    )}
                    <SellerButton label="Delete" onPress={() => setRemoving(reel)} size="sm" testID={`delete-${reel.id}`} variant="outline" />
                  </View>
                </SellerCard>
              </Animated.View>
            );
          })}
        </View>
      )}
      <UpgradeSheet kind="reels" onClose={() => setUpgrade(false)} visible={upgrade} />
      <Sheet onClose={() => setRemoving(null)} title="Delete this reel?" visible={Boolean(removing)}>
        <Text style={text.body}>{removing?.caption} will be removed for good, with its numbers.</Text>
        <Button
          fullWidth
          label="Delete reel"
          onPress={() => {
            if (removing) view.dispatch({ id: removing.id, type: "sellerDeleteReel" });
            setRemoving(null);
            toast.show("Reel deleted");
          }}
          testID="confirm-delete-reel"
          variant="outline"
        />
      </Sheet>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

/** Add a reel or edit one: pick a video, write a caption, choose the product it sells, and publish or keep it as a draft. */
export function SellerReelFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const existing = id && id !== "new" ? view.seller.reels.find((item) => item.id === id) : undefined;
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [listingId, setListingId] = useState<string | undefined>(existing?.listingId ?? view.seller.listings.find((item) => item.status === "published")?.id);
  const [videoUri, setVideoUri] = useState<string | undefined>(existing?.videoUri);
  const [error, setError] = useState<string | undefined>();
  const [upgrade, setUpgrade] = useState(false);
  const live = liveReelCount(view.seller.reels);
  const limit = LIMITS[view.plan].liveReels;
  const alreadyLive = existing?.status === "published";

  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], videoMaxDuration: 60 });
      if (!result.canceled && result.assets[0]) setVideoUri(result.assets[0].uri);
    } catch {
      toast.show("Vossie could not open your videos. Check access in Settings.");
    }
  };

  const save = (publish: boolean) => {
    if (caption.trim().length < 3) return setError("Write a short caption, at least 3 letters.");
    if (publish && !alreadyLive && live >= limit) return setUpgrade(true);
    setError(undefined);
    const reel: SellerReel = { caption: caption.trim(), createdAt: "", id: existing?.id ?? sellerId("rl"), likes: existing?.likes ?? 0, listingId, orders: existing?.orders ?? 0, salesCents: existing?.salesCents ?? 0, saves: existing?.saves ?? 0, status: publish ? "published" : existing?.status === "published" ? "published" : "draft", taps: existing?.taps ?? 0, videoUri, views: existing?.views ?? 0 };
    view.dispatch({ reel, type: "sellerSaveReel" });
    toast.show(publish ? "Reel is live" : "Draft saved");
    router.back();
  };

  return (
    <SellerScreen
      footer={
        <View style={styles.footer}>
          <SellerButton label={alreadyLive ? "Save changes" : "Publish reel"} onPress={() => save(true)} size="lg" testID="reel-publish" variant="glass" />
          {!alreadyLive ? <SellerButton label="Save as draft" onPress={() => save(false)} size="sm" style={styles.center} testID="reel-draft" variant="light" /> : null}
        </View>
      }
      tone="white"
      testID="seller-reel-form"
    >
      <SellerTopBar title={existing ? "Edit reel" : "Add reel"} />
      <View style={styles.form}>
        <Pressable accessibilityLabel="Choose a video" accessibilityRole="button" onPress={() => void pick()} testID="pick-video">
          <SellerWell style={styles.video}>
            <Icon color={SELLER.solid} name={videoUri ? "check-circle" : "video"} size={30} />
            <Text style={styles.name}>{videoUri ? "Video chosen" : "Choose a video"}</Text>
            <Text style={styles.hint}>Up to 60 seconds. It stays on this phone until uploads are switched on.</Text>
          </SellerWell>
        </Pressable>
        <SellerField error={error} label="Caption" multiline onChangeText={setCaption} placeholder="What should students see?" testID="reel-caption" value={caption} />
        <View style={styles.block}>
          <Text style={styles.name}>Product it sells</Text>
          <View style={styles.chips}>
            {view.seller.listings
              .filter((item) => item.status === "published" || item.id === existing?.listingId)
              .map((item) => (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: listingId === item.id }} key={item.id} onPress={() => setListingId(item.id)} style={[styles.chip, listingId === item.id && styles.chipOn]} testID={`reel-product-${item.id}`}>
                  <Text style={[styles.chipText, listingId === item.id && styles.chipTextOn]}>{item.title}</Text>
                </Pressable>
              ))}
          </View>
        </View>
        {existing ? (
          <SellerCard style={styles.statsCard}>
            <Stat label="Views" value={existing.views.toLocaleString("en-ZA")} />
            <Stat label="Engagement" value={`${engagementPercent(existing)}%`} />
            <Stat label="Sales" value={`R ${Math.round(existing.salesCents / 100)}`} />
          </SellerCard>
        ) : null}
      </View>
      <UpgradeSheet kind="reels" onClose={() => setUpgrade(false)} visible={upgrade} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.xs },
  block: { gap: 8 },
  card: { gap: 12 },
  center: { alignSelf: "center" },
  chip: { backgroundColor: "#E9EFF3", borderRadius: 18, boxShadow: "-4px -4px 9px rgba(255,255,255,0.95), 4px 4px 10px rgba(150,166,180,0.45)", paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: SELLER.solid, boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.3)" },
  chipText: { color: SELLER.inkSoft, fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: "#FFFFFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  empty: { alignItems: "center", gap: 6, marginTop: 12, paddingVertical: 28 },
  flex: { flex: 1, gap: 3 },
  footer: { gap: 8 },
  form: { gap: 16, marginTop: 16 },
  head: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginVertical: 10 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  list: { gap: 12, marginTop: 4 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  play: { alignItems: "center", backgroundColor: "rgba(20,35,44,0.6)", borderRadius: 11, bottom: 4, height: 22, justifyContent: "center", position: "absolute", right: 4, width: 22 },
  row: { flexDirection: "row", gap: 12 },
  stat: { alignItems: "center", flex: 1, gap: 1 },
  statValue: { color: SELLER.ink, fontSize: 16, fontWeight: "800" },
  stats: { flexDirection: "row" },
  statsCard: { flexDirection: "row" },
  thumb: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 14, height: 72, justifyContent: "center", overflow: "hidden", width: 56 },
  video: { alignItems: "center", gap: 6, padding: 22 },
});
