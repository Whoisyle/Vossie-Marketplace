import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Icon, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { parseRandToCents } from "@/screens/account/walletAmount";
import { sellerId } from "@/seller/state";
import type { SellerListing } from "@/seller/types";

import { SellerField, usePickImage } from "./fields";
import { useSeller } from "./hooks";
import { SELLER, SellerButton, SellerScreen, SellerTopBar } from "./ui";

const CATEGORIES: { key: SellerListing["category"]; label: string }[] = [
  { key: "food", label: "Food" },
  { key: "books", label: "Books" },
  { key: "electronics", label: "Electronics" },
  { key: "fashion", label: "Fashion" },
  { key: "services", label: "Services" },
];

/** Add a listing or edit one: name, what it is, price, category and how many there are. Publishes once the seller is approved. */
export function SellerListingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const existing = id && id !== "new" ? view.seller.listings.find((item) => item.id === id) : undefined;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(existing ? (existing.priceCents / 100).toString() : "");
  const [category, setCategory] = useState<SellerListing["category"]>(existing?.category ?? "food");
  const [onHand, setOnHand] = useState(existing ? String(existing.onHand) : "10");
  const [unlimited, setUnlimited] = useState(existing?.unlimited ?? false);
  const [variants, setVariants] = useState((existing?.variants ?? []).join(", "));
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const pick = usePickImage();
  const [errors, setErrors] = useState<{ title?: string; price?: string; stock?: string }>({});

  const save = (publish: boolean) => {
    const found: typeof errors = {};
    const cents = parseRandToCents(price);
    if (title.trim().length < 2) found.title = "Give the listing a name.";
    if (cents === null || cents <= 0) found.price = "Enter a price like 45 or 45.50.";
    const stock = Number.parseInt(onHand, 10);
    if (!unlimited && (!Number.isInteger(stock) || stock < 0)) found.stock = "Enter how many you have, like 10.";
    setErrors(found);
    if (Object.keys(found).length > 0 || cents === null) return;
    const goLive = publish && view.canTrade;
    const listing: SellerListing = {
      artId: existing?.artId,
      category,
      description: description.trim(),
      id: existing?.id ?? sellerId("sl"),
      onHand: unlimited ? 0 : stock,
      photos,
      priceCents: cents,
      sku: existing?.sku ?? `VM-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      status: goLive ? (existing?.status === "paused" ? "paused" : "published") : publish ? "under-review" : "draft",
      title: title.trim(),
      unlimited,
      updatedAt: "",
      variants: variants.split(",").map((item) => item.trim()).filter(Boolean),
    };
    view.dispatch({ listing, type: "sellerSaveListing" });
    toast.show(goLive ? `${listing.title} is live` : publish ? `${listing.title} will go live once you are approved` : "Draft saved");
    router.back();
  };

  return (
    <SellerScreen
      footer={
        <View style={styles.footer}>
          <SellerButton label={view.canTrade ? "Publish" : "Submit for review"} onPress={() => save(true)} size="lg" testID="listing-publish" variant="glass" />
          <SellerButton label="Save as draft" onPress={() => save(false)} size="sm" style={styles.draft} testID="listing-draft" variant="glass" />
        </View>
      }
      testID="seller-listing-form"
    >
      <SellerTopBar title={existing ? "Edit product" : "Add product"} />
      <View style={styles.fields}>
        <View style={styles.block}>
          <Text style={styles.label}>Photos · up to 6</Text>
          <View style={styles.row}>
            {photos.map((uri) => (
              <Image contentFit="cover" key={uri} source={{ uri }} style={styles.photo} />
            ))}
            {photos.length < 6 ? (
              <Pressable
                accessibilityLabel="Add photo"
                accessibilityRole="button"
                onPress={async () => {
                  const picked = await pick();
                  if (picked) setPhotos((current) => [...current, picked.uri]);
                }}
                style={[styles.photo, styles.photoAdd]}
                testID="add-photo"
              >
                <Icon color="#FFFFFF" name="camera" size={22} />
              </Pressable>
            ) : null}
          </View>
        </View>
        <SellerField error={errors.title} icon="tag" label="Name" onChangeText={setTitle} placeholder="Burger & Chips" testID="listing-title" value={title} />
        <SellerField label="Description" multiline onChangeText={setDescription} placeholder="What is it? What comes with it?" testID="listing-description" value={description} />
        <SellerField error={errors.price} icon="dollar-sign" keyboardType="decimal-pad" label="Price (R)" onChangeText={setPrice} placeholder="60" testID="listing-price" value={price} />

        <View style={styles.block}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.row}>
            {CATEGORIES.map((item) => (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: category === item.key }} key={item.key} onPress={() => setCategory(item.key)} style={[styles.chip, category === item.key && styles.chipOn]} testID={`category-${item.key}`}>
                <Text style={[styles.chipText, category === item.key && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.stockRow}>
          <View style={styles.flex}>
            <Text style={styles.label}>No stock limit</Text>
            <Text style={styles.hint}>For services and digital items</Text>
          </View>
          <Switch accessibilityLabel="No stock limit" onValueChange={setUnlimited} thumbColor="#FFFFFF" trackColor={{ false: "rgba(255,255,255,0.3)", true: "#8FD9B8" }} value={unlimited} />
        </View>
        <SellerField label="Variants (optional)" onChangeText={setVariants} placeholder="Black, Blue" testID="listing-variants" value={variants} />
        {!unlimited ? <SellerField error={errors.stock} keyboardType="number-pad" label="In stock" onChangeText={setOnHand} placeholder="10" testID="listing-stock" value={onHand} /> : null}
        <Text style={styles.hint}>Photos stay on this phone for now. Uploading them arrives with the live backend.</Text>
        {existing && existing.status !== "archived" ? (
          <SellerButton
            label="Archive product"
            onPress={() => {
              view.dispatch({ archived: true, id: existing.id, type: "sellerArchiveListing" });
              toast.show(`${existing.title} archived`);
              router.back();
            }}
            size="sm"
            testID="listing-archive"
            variant="glass"
          />
        ) : null}
        {existing ? (
          <SellerButton
            label="Delete product"
            onPress={() => {
              view.dispatch({ id: existing.id, type: "sellerDeleteListing" });
              toast.show(`${existing.title} deleted (${formatRand(existing.priceCents)})`);
              router.back();
            }}
            size="sm"
            testID="listing-delete"
            variant="outline"
          />
        ) : null}
      </View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  chip: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#FFFFFF" },
  chipText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  chipTextOn: { color: SELLER.solid },
  draft: { alignSelf: "center" },
  fields: { gap: 14, marginTop: 16 },
  flex: { flex: 1 },
  footer: { gap: 8 },
  hint: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  photo: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, height: 64, justifyContent: "center", overflow: "hidden", width: 64 },
  photoAdd: { borderColor: "rgba(255,255,255,0.6)", borderStyle: "dashed", borderWidth: 1.5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stockRow: { alignItems: "center", flexDirection: "row", gap: 12 },
});
