import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  EmptyState,
  FilterChips,
  HeaderIconButton,
  ListingCard,
  Screen,
  SearchBar,
  SectionHeader,
  useToast,
  type FilterOption,
} from "@/components";
import { getCampusName, getCategories, getListings } from "@/data/repository";
import type { CategoryId } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space } from "@/theme/tokens";

type CategoryFilter = "all" | CategoryId;

/** Home tab: campus marketplace feed with search, category chips and popular listings. */
export function HomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [category, setCategory] = useState<CategoryFilter>("all");

  const campusId = state.profile?.campusId ?? null;
  const options = useMemo<FilterOption<CategoryFilter>[]>(
    () => [
      { key: "all", label: "All" },
      ...getCategories().map((item) => ({ key: item.id, label: item.name })),
    ],
    [],
  );
  const listings = useMemo(
    () =>
      getListings({
        campusId,
        categoryId: category === "all" ? null : category,
        popularOnly: true,
      }),
    [campusId, category],
  );
  const hasUnread = state.notifications.some((item) => !item.read);

  // Rows of two keep the feed a simple, stable grid on every width.
  const rows = useMemo(() => {
    const pairs: (typeof listings)[] = [];
    for (let i = 0; i < listings.length; i += 2) pairs.push(listings.slice(i, i + 2));
    return pairs;
  }, [listings]);

  return (
    <Screen testID="home-screen">
      <AppHeader
        large
        right={
          <HeaderIconButton
            badge={hasUnread}
            icon="bell"
            label={hasUnread ? "Notifications, unread" : "Notifications"}
            onPress={() => toast.show("Notifications open in a later step")}
          />
        }
      />
      <Text style={styles.campus}>
        {campusId ? getCampusName(campusId).toUpperCase() : "MARKET PLACE"}
      </Text>
      <View style={styles.search}>
        <SearchBar onPress={() => router.navigate("/explore")} />
      </View>
      <FilterChips onChange={setCategory} options={options} testID="home-categories" value={category} />
      <View style={styles.section}>
        <SectionHeader
          onAction={() => router.navigate("/explore")}
          title="Popular Near You"
        />
      </View>
      {rows.length === 0 ? (
        <EmptyState
          actionLabel="Show everything"
          icon="search"
          message="Nothing popular in this category on your campus yet."
          onAction={() => setCategory("all")}
          title="No listings yet"
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((pair) => (
            <View key={pair.map((l) => l.id).join("-")} style={styles.row}>
              {pair.map((listing) => (
                <ListingCard
                  favourite={state.favourites.includes(listing.id)}
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/listing/${listing.id}` as Href)}
                  onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
                />
              ))}
              {pair.length === 1 ? <View style={styles.spacer} /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  campus: { color: color.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: space.sm },
  grid: { gap: space.xs },
  row: { flexDirection: "row", gap: space.xs },
  search: { marginBottom: space.sm },
  section: { marginTop: space.sm },
  spacer: { flex: 1 },
});
