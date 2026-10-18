import { useRouter } from "expo-router";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import {
  AppHeader,
  Chip,
  EmptyState,
  FilterButton,
  Icon,
  ListingCard,
  Screen,
  SearchBar,
  SectionHeader,
  type IconName,
} from "@/components";
import { effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { alternatives, searchListings, suggest, type Suggestion } from "@/data/search";
import { getCategories, getListings, getSellers } from "@/data/repository";
import type { CategoryId, Listing } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { useDetail } from "@/lib/paths";
import { FiltersSheet } from "@/screens/home/FiltersSheet";
import { activeFilterCount, applyFilters, NO_FILTERS, type Filters } from "@/screens/home/filters";
import { PromoCarousel } from "@/screens/home/PromoCarousel";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, size, space, text } from "@/theme/tokens";

import { FeaturedCarousel, StoreCard } from "./ExploreParts";

const KIND_ICON: Record<Suggestion["kind"], IconName> = { category: "grid", listing: "search", store: "shopping-bag" };

/** Explore tab: featured and top stores while idle, live suggestions while typing, results when you search. */
export function ExploreScreen() {
  const router = useRouter();
  const open = useDetail();
  const { width } = useWindowDimensions();
  const { dispatch, state } = useDemoStore();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageWidth = Math.min(width, size.contentMax + space.xl * 2);
  const campusId = state.profile?.campusId ?? null;

  const categories = useMemo(() => getCategories(), []);
  const sellers = useMemo(() => getSellers().filter((seller) => !campusId || seller.campusId === campusId), [campusId]);
  const everything = useMemo(() => getListings({ campusId }), [campusId]);
  const featured = useMemo(() => [...everything].sort((a, b) => b.rating * 10 + b.ratingCount / 100 - (a.rating * 10 + a.ratingCount / 100)).slice(0, 6), [everything]);
  const topStores = useMemo(() => [...sellers].sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount).slice(0, 8), [sellers]);
  const trending = useMemo(() => [...everything].sort((a, b) => b.ratingCount - a.ratingCount).slice(0, 8), [everything]);

  const typing = query.trim().length > 0 && submitted === null;
  const suggestions = useMemo(() => (typing ? suggest(query, everything, sellers, categories) : []), [categories, everything, query, sellers, typing]);
  const filterCount = activeFilterCount(filters);
  const showingIdle = !typing && submitted === null && category === null;

  const results = useMemo(() => {
    if (submitted === null && category === null) return [];
    const base = submitted ? searchListings(submitted, everything, sellers) : everything;
    return applyFilters(category ? base.filter((listing) => listing.categoryId === category) : base, filters);
  }, [category, everything, filters, sellers, submitted]);
  const showingResults = submitted !== null || category !== null;

  const run = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    haptic.tap();
    setQuery(clean);
    setSubmitted(clean);
    setCategory(null);
    dispatch({ query: clean, type: "addSearch" });
  };
  const reset = () => {
    setQuery("");
    setSubmitted(null);
    setCategory(null);
  };
  const choose = (item: Suggestion) => {
    haptic.tap();
    if (item.kind === "listing") {
      dispatch({ query: item.label, type: "addSearch" });
      router.push(open("listing", item.id));
    } else if (item.kind === "store") router.push(open("store", item.id));
    else {
      setQuery(item.label);
      setSubmitted("");
      setCategory(item.id as CategoryId);
    }
  };

  const grid = (items: Listing[], inserted?: { afterRow: number; node: ReactNode }) => {
    const rows: Listing[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return (
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <Fragment key={pair.map((l) => l.id).join("-")}>
            <Animated.View entering={FadeInDown.delay(Math.min(rowIndex, 4) * 55).duration(300)} style={styles.row}>
              {pair.map((listing) => (
                <ListingCard
                  favourite={state.favourites.includes(listing.id)}
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(open("listing", listing.id))}
                  onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
                />
              ))}
              {pair.length === 1 ? <View style={styles.flex} /> : null}
            </Animated.View>
            {inserted && rowIndex === inserted.afterRow ? inserted.node : null}
          </Fragment>
        ))}
      </View>
    );
  };

  return (
    <Screen testID="explore-screen">
      <AppHeader title="Explore" />
      {showingIdle ? (
        <Animated.View entering={FadeInDown.duration(320)} style={styles.promo}>
          <PromoCarousel width={pageWidth} />
        </Animated.View>
      ) : null}
      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchBar
            onChangeText={(value) => {
              setQuery(value);
              if (submitted !== null) setSubmitted(null);
              if (category) setCategory(null);
            }}
            onSubmit={() => run(query)}
            placeholder="Search products, stores and categories"
            value={query}
          />
        </View>
        <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
      </View>

      {typing ? (
        <View accessibilityLiveRegion="polite" style={styles.suggestions}>
          {suggestions.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(index * 35).duration(220)} exiting={FadeOutUp.duration(120)} key={`${item.kind}-${item.id}`}>
              <Pressable accessibilityRole="button" onPress={() => choose(item)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                <View style={styles.suggestionIcon}>
                  <Icon color={color.heading} name={KIND_ICON[item.kind]} size={16} />
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={text.cardTitle}>
                    {item.label}
                  </Text>
                  <Text numberOfLines={1} style={text.caption}>
                    {item.detail}
                  </Text>
                </View>
                <Icon color={color.textMuted} name="arrow-up-left" size={16} />
              </Pressable>
            </Animated.View>
          ))}
          <Animated.View entering={FadeInDown.delay(suggestions.length * 35).duration(220)}>
            <Pressable accessibilityRole="button" onPress={() => run(query)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]} testID="search-all">
              <View style={[styles.suggestionIcon, styles.searchAllIcon]}>
                <Icon color={color.onPrimary} name="search" size={16} />
              </View>
              <Text style={[text.cardTitle, styles.flex]}>Search for “{query.trim()}”</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : showingResults ? (
        <View style={styles.results}>
          <View style={styles.resultsHead}>
            <Text accessibilityLiveRegion="polite" style={text.sectionTitle}>
              {results.length} {results.length === 1 ? "result" : "results"}
              {submitted ? ` for “${submitted}”` : category ? ` in ${categories.find((item) => item.id === category)?.name}` : ""}
            </Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={reset}>
              <Text style={styles.link}>Clear</Text>
            </Pressable>
          </View>
          {results.length === 0 ? (
            <View>
              <EmptyState
                actionLabel={filterCount > 0 ? "Reset filters" : "Clear search"}
                icon="search"
                message="Try another word, or one of these."
                onAction={filterCount > 0 ? () => setFilters(NO_FILTERS) : reset}
                title="Nothing found"
              />
              <View style={styles.altRow}>
                {alternatives(submitted ?? "", categories, sellers).map((option) => (
                  <Chip key={option} label={option} onPress={() => run(option)} />
                ))}
              </View>
            </View>
          ) : (
            grid(results)
          )}
        </View>
      ) : (
        <>
          {state.recentSearches.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
              <View style={styles.resultsHead}>
                <Text style={text.sectionTitle}>Recent searches</Text>
                <Pressable accessibilityRole="button" hitSlop={8} onPress={() => dispatch({ type: "clearSearches" })}>
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {state.recentSearches.map((item) => (
                  <Chip icon="clock" key={item} label={item} onPress={() => run(item)} />
                ))}
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.section}>
            <SectionHeader title="Trending on campus" />
            <ScrollView contentContainerStyle={styles.storeRow} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed}>
              {trending.map((listing, index) => (
                <Pressable
                  accessibilityLabel={`Trending number ${index + 1}, ${listing.title}`}
                  accessibilityRole="button"
                  key={listing.id}
                  onPress={() => router.push(open("listing", listing.id))}
                  style={({ pressed }) => [styles.trend, pressed && styles.pressed]}
                >
                  <Text style={styles.trendRank}>{index + 1}</Text>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={text.cardTitle}>
                      {listing.title}
                    </Text>
                    <Text style={text.caption}>{formatRand(effectivePrice(listing))}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(110).duration(320)} style={styles.section}>
            <SectionHeader title="Browse by category" />
            <View style={styles.chipRow}>
              {categories.map((item) => (
                <Chip
                  icon={item.icon as IconName}
                  key={item.id}
                  label={item.name}
                  onPress={() => {
                    haptic.select();
                    setQuery("");
                    setSubmitted(null);
                    setCategory(item.id);
                  }}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(320)} style={styles.section}>
            <SectionHeader title="Featured" />
            <FeaturedCarousel
              favourites={state.favourites}
              listings={featured}
              onOpen={(listing) => router.push(open("listing", listing.id))}
              onToggleFavourite={(listing) => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
              width={pageWidth}
            />
          </Animated.View>

          <View style={styles.section}>
            <SectionHeader title="More to explore" />
            {grid(everything, {
              afterRow: 2,
              node: (
                <View style={styles.storesBlock}>
                  <SectionHeader title="Top stores near you" />
                  <ScrollView contentContainerStyle={styles.storeRow} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed}>
                    {topStores.map((seller) => (
                      <StoreCard
                        following={state.following.includes(seller.id)}
                        key={seller.id}
                        onFollow={() => dispatch({ sellerId: seller.id, type: "toggleFollow" })}
                        onOpen={() => router.push(open("store", seller.id))}
                        seller={seller}
                      />
                    ))}
                  </ScrollView>
                </View>
              ),
            })}
          </View>
        </>
      )}

      <FiltersSheet filters={filters} listings={everything} onApply={setFilters} onClose={() => setFiltersOpen(false)} visible={filtersOpen} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  altRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, justifyContent: "center" },
  bleed: { marginHorizontal: -space.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.xs },
  flex: { flex: 1 },
  grid: { gap: space.xs },
  link: { color: color.link, fontSize: 13, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  promo: { marginBottom: space.sm },
  storesBlock: { marginVertical: space.sm },
  results: { marginTop: space.md },
  resultsHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: space.xs },
  row: { flexDirection: "row", gap: space.xs },
  searchAllIcon: { backgroundColor: color.primary },
  searchRow: { alignItems: "center", flexDirection: "row", gap: space.xs },
  section: { marginTop: space.md },
  storeRow: { gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.xs },
  suggestion: { alignItems: "center", flexDirection: "row", gap: space.sm, minHeight: 56, paddingVertical: space.xs },
  suggestionIcon: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  suggestions: { marginTop: space.sm },
  trend: {
    alignItems: "center",
    backgroundColor: color.surfaceRow,
    borderRadius: corner.md,
    flexDirection: "row",
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.sm,
    width: 190,
  },
  trendRank: { color: color.accent, fontSize: 24, fontWeight: "800", width: 22 },
});
