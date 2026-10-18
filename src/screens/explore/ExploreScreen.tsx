import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  EmptyState,
  FilterChips,
  ListingCard,
  Screen,
  SearchBar,
  type FilterOption,
} from "@/components";
import { getCategories, getListings } from "@/data/repository";
import type { CategoryId } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

type CategoryFilter = "all" | CategoryId;

/** Explore tab: search every listing on your campus and filter by category. */
export function ExploreScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const campusId = state.profile?.campusId ?? null;

  const options = useMemo<FilterOption<CategoryFilter>[]>(
    () => [{ key: "all", label: "All" }, ...getCategories().map((item) => ({ key: item.id, label: item.name }))],
    [],
  );
  const results = useMemo(
    () => getListings({ campusId, categoryId: category === "all" ? null : category, query }),
    [campusId, category, query],
  );
  const rows = useMemo(() => {
    const pairs: (typeof results)[] = [];
    for (let i = 0; i < results.length; i += 2) pairs.push(results.slice(i, i + 2));
    return pairs;
  }, [results]);

  return (
    <Screen testID="explore-screen">
      <AppHeader title="Explore" />
      <SearchBar onChangeText={setQuery} value={query} />
      <View style={styles.chips}>
        <FilterChips onChange={setCategory} options={options} value={category} />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.count}>
        {results.length} {results.length === 1 ? "result" : "results"}
      </Text>
      {rows.length === 0 ? (
        <EmptyState
          actionLabel="Clear filters"
          icon="search"
          message="Try another word or category."
          onAction={() => {
            setQuery("");
            setCategory("all");
          }}
          title="Nothing found"
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((pair) => (
            <View key={pair.map((listing) => listing.id).join("-")} style={styles.row}>
              {pair.map((listing) => (
                <ListingCard
                  favourite={state.favourites.includes(listing.id)}
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/home/listing/${listing.id}` as Href)}
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
  chips: { marginTop: space.xs },
  count: { ...text.caption, marginBottom: space.xs, marginTop: space.xs },
  grid: { gap: space.xs },
  row: { flexDirection: "row", gap: space.xs },
  spacer: { flex: 1 },
});
