import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  AppHeader,
  EmptyState,
  HeaderIconButton,
  Icon,
  ListingCard,
  Media,
  Screen,
  SearchBar,
  SectionHeader,
  useToast,
  type FilterOption,
} from "@/components";
import { formatRand } from "@/data/format";
import { firstName, forYou, greeting, recentListings } from "@/data/personalise";
import { getCampusName, getCategories, getListings } from "@/data/repository";
import type { CategoryId, Listing } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { duration } from "@/theme/motion";
import { color, corner, gradient, size, space, text } from "@/theme/tokens";

import { CategoryPager } from "./CategoryPager";
import { FiltersSheet } from "./FiltersSheet";
import { activeFilterCount, applyFilters, NO_FILTERS, type Filters } from "./filters";
import { PromoCarousel } from "./PromoCarousel";

type CategoryFilter = "all" | CategoryId;

const HINTS = ["Search burgers and coffee", "Search tutors and study rooms", "Search second-hand books", "Search stores near you"];

/** Home tab: greeting, search with filters, promos, your recents and picks, and swipeable category pages. */
export function HomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { dispatch, state } = useDemoStore();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const campusId = state.profile?.campusId ?? null;
  const pageWidth = Math.min(width, size.contentMax + space.xl * 2);
  const hasUnread = state.notifications.some((item) => !item.read);
  const filterCount = activeFilterCount(filters);

  const options = useMemo<FilterOption<CategoryFilter>[]>(
    () => [{ key: "all", label: "All" }, ...getCategories().map((item) => ({ key: item.id, label: item.name }))],
    [],
  );
  const everything = useMemo(() => getListings({ campusId }), [campusId]);
  const picks = useMemo(
    () =>
      forYou(everything, {
        favourites: state.favourites,
        following: state.following,
        orders: state.orders,
        recentViews: state.recentViews,
      }),
    [everything, state.favourites, state.following, state.orders, state.recentViews],
  );
  const recents = useMemo(() => recentListings(everything, state.recentViews), [everything, state.recentViews]);

  const open = (listing: Listing) => router.push(`/home/listing/${listing.id}` as Href);
  const resetFilters = () => setFilters(NO_FILTERS);

  const renderPage = (key: CategoryFilter) => {
    const popular = applyFilters(
      getListings({ campusId, categoryId: key === "all" ? null : key, popularOnly: true }),
      filters,
    );
    if (popular.length === 0) {
      return (
        <EmptyState
          actionLabel={filterCount > 0 ? "Reset filters" : "Show everything"}
          icon="search"
          message={filterCount > 0 ? "Nothing matches these filters." : "Nothing popular in this category on your campus yet."}
          onAction={filterCount > 0 ? resetFilters : () => setCategory("all")}
          title="No listings yet"
        />
      );
    }
    const rows: Listing[][] = [];
    for (let i = 0; i < popular.length; i += 2) rows.push(popular.slice(i, i + 2));
    return (
      <View style={styles.grid}>
        {rows.map((pair, rowIndex) => (
          <Animated.View entering={FadeInDown.delay(rowIndex * 60).duration(320)} key={pair.map((l) => l.id).join("-")} style={styles.row}>
            {pair.map((listing) => (
              <ListingCard
                favourite={state.favourites.includes(listing.id)}
                key={listing.id}
                listing={listing}
                onPress={() => open(listing)}
                onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
              />
            ))}
            {pair.length === 1 ? <View style={styles.spacer} /> : null}
          </Animated.View>
        ))}
      </View>
    );
  };

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

      <Animated.View entering={FadeInDown.duration(380)} style={styles.greeting}>
        <Text style={styles.hello}>
          {greeting()}
          {state.profile ? `, ${firstName(state.profile.fullName)}` : ""}
        </Text>
        <View style={styles.campusRow}>
          <Icon color={color.accent} name="map-pin" size={13} />
          <Text style={styles.campus}>{campusId ? getCampusName(campusId) : "Choose a campus"}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.searchRow}>
        <View style={styles.flex}>
          <SearchBar onPress={() => router.navigate("/explore")} placeholders={HINTS} />
        </View>
        <FilterButton count={filterCount} onPress={() => setFiltersOpen(true)} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={styles.section}>
        <PromoCarousel onPress={() => toast.show("Promotions are placeholders for now")} width={pageWidth} />
      </Animated.View>

      {recents.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(320)} style={styles.section}>
          <SectionHeader title="Pick up where you left off" />
          <MiniRow listings={recents} onPress={open} />
        </Animated.View>
      ) : null}

      {picks.length > 0 ? (
        <Animated.View entering={FadeInDown.duration(320)} style={styles.section}>
          <SectionHeader title="For you" />
          <MiniRow listings={picks} onPress={open} />
        </Animated.View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader onAction={() => router.navigate("/explore")} title="Popular Near You" />
        <CategoryPager onChange={setCategory} options={options} pageWidth={pageWidth} renderPage={renderPage} value={category} />
      </View>

      <FiltersSheet
        filters={filters}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      />
    </Screen>
  );
}

function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.08 }] }));
  return (
    <Pressable
      accessibilityLabel={count > 0 ? `Filters, ${count} active` : "Filters"}
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={() => press.set(withTiming(1, { duration: 80 }))}
      onPressOut={() => press.set(withTiming(0, { duration: duration.base }))}
      testID="open-filters"
    >
      <Animated.View style={[styles.filter, style]}>
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <Icon color={color.onPrimary} name="sliders" size={20} />
        {count > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{count}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function MiniRow({ listings, onPress }: { listings: Listing[]; onPress: (listing: Listing) => void }) {
  return (
    <View style={styles.miniWrap}>
      <Animated.ScrollView contentContainerStyle={styles.miniRow} horizontal showsHorizontalScrollIndicator={false}>
        {listings.map((listing, index) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(300)} key={listing.id}>
            <Pressable
              accessibilityLabel={`${listing.title}, ${formatRand(listing.priceCents)}`}
              accessibilityRole="button"
              onPress={() => onPress(listing)}
              style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
            >
              <Media radius={corner.sm} source={listing.images[0]} style={styles.miniImage} />
              <Text numberOfLines={1} style={styles.miniTitle}>
                {listing.title}
              </Text>
              <Text style={styles.miniPrice}>{formatRand(listing.priceCents)}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  campus: { color: color.accent, fontSize: 12, fontWeight: "600" },
  campusRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  filter: {
    alignItems: "center",
    borderRadius: corner.lg,
    boxShadow: "0 8px 16px rgba(30, 42, 56, 0.22)",
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  filterBadge: {
    alignItems: "center",
    backgroundColor: color.mist,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    position: "absolute",
    right: 6,
    top: 6,
  },
  filterBadgeText: { color: color.ink, fontSize: 10, fontWeight: "800" },
  flex: { flex: 1 },
  greeting: { gap: 2, marginBottom: space.sm },
  grid: { gap: space.xs, paddingTop: space.xs },
  hello: { ...text.pageTitle, fontSize: 22 },
  mini: { borderRadius: corner.md, gap: 4, width: 124 },
  miniImage: { height: 92, width: 124 },
  miniPressed: { opacity: 0.8 },
  miniPrice: { color: color.accent, fontSize: 12, fontWeight: "700" },
  miniRow: { gap: space.xs, paddingHorizontal: space.lg },
  miniTitle: { color: color.text, fontSize: 12, fontWeight: "600" },
  miniWrap: { marginHorizontal: -space.lg },
  row: { flexDirection: "row", gap: space.xs },
  searchRow: { alignItems: "center", flexDirection: "row", gap: space.xs },
  section: { marginTop: space.md },
  spacer: { flex: 1 },
});
