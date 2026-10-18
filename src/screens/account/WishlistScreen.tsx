import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Icon, ListingCard, Screen, SegmentedTabs, Sheet, TextField, useToast } from "@/components";
import { shortDate } from "@/data/format";
import { getListing, getListings, getSellers } from "@/data/repository";
import { searchListings } from "@/data/search";
import type { Listing } from "@/data/types";
import { useDetail } from "@/lib/paths";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

type Tab = "saved" | "collections" | "searches";

/** Wishlist: what you saved, your own collections of saved items, and searches that tell you about new matches. */
export function WishlistScreen() {
  const router = useRouter();
  const open = useDetail();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [tab, setTab] = useState<Tab>("saved");
  const [newName, setNewName] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [openCollection, setOpenCollection] = useState<string | null>(null);

  const saved = state.favourites.map((id) => getListing(id)).filter((item): item is Listing => Boolean(item));
  const everything = useMemo(() => getListings({}), []);
  const sellers = useMemo(() => getSellers(), []);

  const cards = (items: Listing[]) => (
    <View style={styles.grid}>
      {items.map((listing) => (
        <View key={listing.id} style={styles.cell}>
          <ListingCard
            favourite={state.favourites.includes(listing.id)}
            listing={listing}
            onPress={() => router.push(open("listing", listing.id))}
            onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
          />
        </View>
      ))}
    </View>
  );

  return (
    <Screen testID="wishlist-screen">
      <AppHeader back subtitle="Keep what you like and be told about new finds." title="Wishlist" />
      <SegmentedTabs
        onChange={setTab}
        options={[
          { count: saved.length, key: "saved", label: "Saved" },
          { count: state.collections.length, key: "collections", label: "Collections" },
          { count: state.savedSearches.length, key: "searches", label: "Searches" },
        ]}
        value={tab}
      />

      {tab === "saved" ? (
        saved.length === 0 ? (
          <EmptyState actionLabel="Browse" icon="heart" message="Tap the heart on anything you like and it will be here." onAction={() => router.navigate("/explore")} title="Nothing saved yet" />
        ) : (
          <View>
            <View style={styles.grid}>
              {saved.map((listing) => (
                <View key={listing.id} style={styles.cell}>
                  <ListingCard
                    favourite
                    listing={listing}
                    onPress={() => router.push(open("listing", listing.id))}
                    onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
                  />
                  <Button label="Add to a collection" onPress={() => setPicking(listing.id)} size="sm" testID={`collect-${listing.id}`} variant="soft" />
                </View>
              ))}
            </View>
          </View>
        )
      ) : null}

      {tab === "collections" ? (
        <View style={styles.list} testID="tab-collections">
          {state.collections.map((collection) => {
            const items = collection.listingIds.map((id) => getListing(id)).filter((item): item is Listing => Boolean(item));
            const opened = openCollection === collection.id;
            return (
              <View key={collection.id}>
                <Card onPress={() => setOpenCollection(opened ? null : collection.id)} style={styles.row} testID={`collection-${collection.id}`} variant="soft">
                  <View style={styles.badge}>
                    <Icon color={color.onPrimary} name="folder" size={18} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={text.cardTitle}>{collection.name}</Text>
                    <Text style={text.caption}>{items.length} {items.length === 1 ? "item" : "items"}</Text>
                  </View>
                  <Icon color={color.textMuted} name={opened ? "chevron-up" : "chevron-down"} size={18} />
                </Card>
                {opened ? (
                  <View style={styles.opened}>
                    {items.length === 0 ? <Text style={text.bodySmall}>Empty. Add items from your Saved tab.</Text> : cards(items)}
                    <Button label="Delete collection" onPress={() => dispatch({ collectionId: collection.id, type: "deleteCollection" })} size="sm" variant="outline" />
                  </View>
                ) : null}
              </View>
            );
          })}
          <TextField label="New collection" onChangeText={setNewName} placeholder="Birthday ideas" value={newName} />
          <Button
            disabled={newName.trim().length < 2}
            fullWidth
            label="Create collection"
            onPress={() => {
              dispatch({ name: newName, type: "createCollection" });
              setNewName("");
              toast.show("Collection created");
            }}
            testID="create-collection"
          />
        </View>
      ) : null}

      {tab === "searches" ? (
        state.savedSearches.length === 0 ? (
          <EmptyState icon="search" message="Search in Explore, then tap Save search to get alerts for new matches." title="No saved searches" />
        ) : (
          <View style={styles.list} testID="tab-searches">
            {state.savedSearches.map((search) => {
              const matches = searchListings(search.query, everything, sellers).length;
              return (
                <Card key={search.id} onPress={() => router.navigate(`/explore?q=${encodeURIComponent(search.query)}` as Href)} style={styles.row} testID={`search-${search.id}`} variant="soft">
                  <View style={styles.badge}>
                    <Icon color={color.onPrimary} name="search" size={18} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={text.cardTitle}>{search.query}</Text>
                    <Text style={text.caption}>
                      {matches} {matches === 1 ? "match" : "matches"} now · saved {shortDate(search.createdAt)}
                    </Text>
                  </View>
                  <Button label="Remove" onPress={() => dispatch({ searchId: search.id, type: "removeSavedSearch" })} size="sm" variant="outline" />
                </Card>
              );
            })}
          </View>
        )
      ) : null}

      <Sheet onClose={() => setPicking(null)} title="Add to a collection" visible={Boolean(picking)}>
        {state.collections.map((collection) => {
          const inside = picking ? collection.listingIds.includes(picking) : false;
          return (
            <Card
              key={collection.id}
              onPress={() => picking && dispatch({ collectionId: collection.id, listingId: picking, type: "toggleInCollection" })}
              style={styles.row}
              testID={`pick-${collection.id}`}
              variant="row"
            >
              <Icon color={inside ? color.success : color.textMuted} name={inside ? "check-circle" : "circle"} size={20} />
              <Text style={[text.cardTitle, styles.flex]}>{collection.name}</Text>
            </Card>
          );
        })}
        <Button fullWidth label="Done" onPress={() => setPicking(null)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", backgroundColor: color.primary, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  cell: { gap: space.xxs, width: "48.5%" },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  list: { gap: space.xs, marginTop: space.sm },
  opened: { gap: space.xs, marginTop: space.xs },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
});
