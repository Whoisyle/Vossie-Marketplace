import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  EmptyState,
  type IconName,
  ListingCard,
  ListingsSkeleton,
  Media,
  Screen,
  SectionHeader,
  useFirstLoad,
} from "@/components";
import { withDeals } from "@/data/deals";
import { hideBlocked } from "@/data/phase4";
import { formatRand } from "@/data/format";
import { firstName, forYou, greeting, recentListings } from "@/data/personalise";
import { getCampusName, getCategories, getListings } from "@/data/repository";
import type { CategoryId, Listing } from "@/data/types";
import { useDetail } from "@/lib/paths";
import { auth } from "@/services";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, size, space } from "@/theme/tokens";

import { FeaturedCarousel } from "@/screens/explore/ExploreParts";
import { CampusPicker } from "@/screens/profile/CampusPicker";

import { CategoryCards, type CategoryCardItem } from "./CategoryCards";
import { FiltersSheet } from "./FiltersSheet";
import { activeFilterCount, applyFilters, NO_FILTERS, type Filters } from "./filters";
import { HomeHeader } from "./HomeHeader";
import { HomeHero } from "./HomeHero";

type CategoryFilter = "all" | CategoryId;

const HINTS = ["Search burgers and coffee", "Search tutors and study rooms", "Search second-hand books", "Search stores near you"];
const CARD_WIDTH = 168;
const CARD_HEIGHT = 196;

/**
 * Home tab: the teal header with campus, search and the fading promo banner, category cards that filter the
 * Popular row, then deals, your recents and picks.
 */
export function HomeScreen() {
  const router = useRouter();
  const detail = useDetail();
  const { width } = useWindowDimensions();
  const { dispatch, state } = useDemoStore();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);

  const campusId = state.profile?.campusId ?? null;
  const pageWidth = Math.min(width, size.contentMax + space.xl * 2);
  const hasUnread = state.notifications.some((item) => !item.read);
  const filterCount = activeFilterCount(filters);

  const categoryItems = useMemo<CategoryCardItem<CategoryFilter>[]>(
    () => [
      { icon: "grid", key: "all", label: "All" },
      ...getCategories().map((item) => ({ icon: item.icon as IconName, key: item.id, label: item.name })),
    ],
    [],
  );
  const everything = useMemo(() => hideBlocked(getListings({ campusId }), state.blocked), [campusId, state.blocked]);
  const loading = useFirstLoad("home");
  const picks = useMemo(
    () =>
      forYou(everything, {
        favourites: state.favourites,
        following: state.following,
        interests: state.interests,
        orders: state.orders,
        recentViews: state.recentViews,
      }),
    [everything, state.favourites, state.following, state.interests, state.orders, state.recentViews],
  );
  const hotDeals = useMemo(() => withDeals(everything).slice(0, 6), [everything]);
  const recents = useMemo(() => recentListings(everything, state.recentViews), [everything, state.recentViews]);
  const popular = useMemo(
    () => applyFilters(getListings({ campusId, categoryId: category === "all" ? null : category, popularOnly: true }), filters),
    [campusId, category, filters],
  );

  const open = (listing: Listing) => router.push(detail("listing", listing.id));
  const resetFilters = () => setFilters(NO_FILTERS);

  const changeCampus = (next: NonNullable<typeof campusId>) => {
    dispatch({ patch: { campusId: next }, type: "updateProfile" });
    // a real account keeps its campus on the server as well
    if (state.profile?.real) void auth.updateMyProfile({ campusId: next }).catch(() => undefined);
  };

  // typed words are searched on Explore; submitting nothing opens Explore ready to type
  const search = (query: string) => {
    router.navigate({ pathname: "/explore", params: query ? { q: query, qt: String(Date.now()) } : { focus: String(Date.now()) } } as Href);
  };

  const header = (
    <HomeHeader
      campusName={campusId ? getCampusName(campusId) : "Choose a campus"}
      filterCount={filterCount}
      greeting={`${greeting()}${state.profile ? `, ${firstName(state.profile.fullName)}` : ""}`}
      hasUnread={hasUnread}
      hints={HINTS}
      onBell={() => router.push("/home/notifications" as Href)}
      onCampus={() => setCampusOpen(true)}
      onFilters={() => setFiltersOpen(true)}
      onSearch={search}
    >
      <HomeHero onPress={(promo) => router.push(detail("promo", promo.id))} />
    </HomeHeader>
  );

  if (loading) {
    return (
      <Screen bleedTop testID="home-screen">
        {header}
        <ListingsSkeleton testID="home-skeleton" />
      </Screen>
    );
  }

  return (
    <Screen bleedTop testID="home-screen">
      {header}

      <Animated.View entering={FadeInDown.duration(380)} style={styles.section}>
        <SectionHeader onAction={() => router.navigate("/explore")} title="Categories" />
        <CategoryCards
          items={categoryItems}
          onSelect={(key) => setCategory((current) => (current === key ? "all" : key))}
          value={category}
        />
      </Animated.View>

      <View style={styles.section}>
        <SectionHeader onAction={() => router.navigate("/explore")} title="Popular Near You" />
        {popular.length === 0 ? (
          <EmptyState
            actionLabel={filterCount > 0 ? "Reset filters" : "Show everything"}
            icon="search"
            message={filterCount > 0 ? "Nothing matches these filters." : "Nothing popular in this category on your campus yet."}
            onAction={filterCount > 0 ? resetFilters : () => setCategory("all")}
            title="No listings yet"
          />
        ) : (
          <View style={styles.rowWrap}>
            <Animated.ScrollView
              contentContainerStyle={styles.popularRow}
              horizontal
              showsHorizontalScrollIndicator={false}
              testID="popular-row"
            >
              {popular.map((listing, index) => (
                <Animated.View entering={FadeInDown.delay(index * 50).duration(320)} key={listing.id} style={{ height: CARD_HEIGHT, width: CARD_WIDTH }}>
                  <ListingCard
                    favourite={state.favourites.includes(listing.id)}
                    height={CARD_HEIGHT}
                    listing={listing}
                    onPress={() => open(listing)}
                    onToggleFavourite={() => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
                  />
                </Animated.View>
              ))}
            </Animated.ScrollView>
          </View>
        )}
      </View>

      {hotDeals.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(160).duration(380)} style={styles.section}>
          <SectionHeader onAction={() => router.navigate("/explore")} title="Hot deals" />
          <FeaturedCarousel
            favourites={state.favourites}
            listings={hotDeals}
            onOpen={open}
            onToggleFavourite={(listing) => dispatch({ listingId: listing.id, type: "toggleFavourite" })}
            width={pageWidth}
          />
        </Animated.View>
      ) : null}

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

      <FiltersSheet
        filters={filters}
        listings={everything}
        onApply={setFilters}
        onClose={() => setFiltersOpen(false)}
        visible={filtersOpen}
      />
      <CampusPicker
        onClose={() => setCampusOpen(false)}
        onSelect={changeCampus}
        selected={campusId}
        visible={campusOpen}
      />
    </Screen>
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
  mini: { borderRadius: corner.md, gap: 4, width: 124 },
  miniImage: { height: 92, width: 124 },
  miniPressed: { opacity: 0.8 },
  miniPrice: { color: color.accent, fontSize: 12, fontWeight: "700" },
  miniRow: { gap: space.xs, paddingHorizontal: space.lg },
  miniTitle: { color: color.text, fontSize: 12, fontWeight: "600" },
  miniWrap: { marginHorizontal: -space.lg },
  popularRow: { gap: space.xs, paddingHorizontal: size.screenGutter },
  rowWrap: { marginHorizontal: -size.screenGutter, paddingTop: space.xs },
  section: { marginTop: space.lg },
});
