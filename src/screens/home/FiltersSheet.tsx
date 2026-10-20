import { type ReactNode, useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { AnimatedSwitch, Button, Chip, Icon, Sheet, type IconName } from "@/components";
import type { Listing } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, space, text } from "@/theme/tokens";

import {
  activeFilterCount,
  applyFilters,
  NO_FILTERS,
  PRICE_MAX_CENTS,
  PRICE_STEP_CENTS,
  priceLabel,
  SORT_LABELS,
  type Filters,
  type SortKey,
} from "./filters";

const STEPS = PRICE_MAX_CENTS / PRICE_STEP_CENTS;
const THUMB = 28;

/**
 * The filters sheet, opened from the button beside the search bar. Sort, price, rating, open now and deals,
 * with a live count on the button so you can see what you will get before you apply.
 */
export function FiltersSheet({
  filters,
  listings,
  onApply,
  onClose,
  visible,
}: {
  visible: boolean;
  filters: Filters;
  /** The listings these filters would apply to; used for the live result count. */
  listings: Listing[];
  onApply: (next: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  // start from the applied filters each time the sheet opens (adjusting state while rendering)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(filters);
  }
  const count = useMemo(() => applyFilters(listings, draft).length, [draft, listings]);
  const changed = activeFilterCount(draft);

  return (
    <Sheet onClose={onClose} title="Filters" visible={visible}>
      <View style={styles.body} testID="filters-sheet">
        <Section icon="sliders" title="Sort by">
          <View style={styles.chips}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <Chip
                key={key}
                label={SORT_LABELS[key]}
                onPress={() => {
                  haptic.select();
                  setDraft((current) => ({ ...current, sort: key }));
                }}
                selected={draft.sort === key}
              />
            ))}
          </View>
        </Section>

        <Section icon="tag" title="Price" value={priceLabel(draft.maxPriceCents)}>
          <PriceSlider
            onChange={(maxPriceCents) => setDraft((current) => ({ ...current, maxPriceCents }))}
            value={draft.maxPriceCents}
          />
        </Section>

        <Section icon="star" title="Rating">
          <View style={styles.chips}>
            {([0, 4, 4.5] as const).map((rating) => (
              <Chip
                key={rating}
                label={rating === 0 ? "Any" : `${rating}+ stars`}
                onPress={() => {
                  haptic.select();
                  setDraft((current) => ({ ...current, minRating: rating }));
                }}
                selected={draft.minRating === rating}
              />
            ))}
          </View>
        </Section>

        <ToggleRow
          caption="Only stores that are open right now"
          icon="clock"
          label="Open now"
          onChange={(openNow) => setDraft((current) => ({ ...current, openNow }))}
          value={draft.openNow}
        />
        <ToggleRow
          caption="Only items with a discount on"
          icon="percent"
          label="Deals only"
          onChange={(dealsOnly) => setDraft((current) => ({ ...current, dealsOnly }))}
          value={draft.dealsOnly}
        />

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button disabled={changed === 0} fullWidth label="Reset" onPress={() => setDraft(NO_FILTERS)} variant="outline" />
          </View>
          <View style={styles.apply}>
            <Button
              disabled={count === 0}
              fullWidth
              label={count === 0 ? "No results" : `Show ${count} ${count === 1 ? "result" : "results"}`}
              onPress={() => {
                haptic.press();
                onApply(draft);
                onClose();
              }}
              testID="apply-filters"
            />
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function Section({ children, icon, title, value }: { title: string; icon: IconName; value?: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <Icon color={color.heading} name={icon} size={14} />
          </View>
          <Text style={text.cardTitle}>{title}</Text>
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({
  caption,
  icon,
  label,
  onChange,
  value,
}: {
  label: string;
  caption: string;
  icon: IconName;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={[styles.block, styles.row]}>
      <View style={styles.titleRow}>
        <View style={styles.iconBubble}>
          <Icon color={color.heading} name={icon} size={14} />
        </View>
        <View style={styles.flex}>
          <Text style={text.cardTitle}>{label}</Text>
          <Text style={text.caption}>{caption}</Text>
        </View>
      </View>
      <AnimatedSwitch
        accessibilityLabel={label}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        value={value}
      />
    </View>
  );
}

/** A simple single-handle slider: drag the thumb, or release at the far right for "any price". */
function PriceSlider({ onChange, value }: { value: number | null; onChange: (next: number | null) => void }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const step = value === null ? STEPS : Math.round(value / PRICE_STEP_CENTS);
  const x = useSharedValue(0);
  const travel = Math.max(1, trackWidth - THUMB);

  const set = (locationX: number) => {
    const clamped = Math.min(Math.max(locationX - THUMB / 2, 0), travel);
    const next = Math.round((clamped / travel) * STEPS);
    x.set(withSpring((next / STEPS) * travel, spring.snappy));
    onChange(next >= STEPS ? null : Math.max(next, 1) * PRICE_STEP_CENTS);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => set(event.nativeEvent.locationX),
        onPanResponderMove: (event) => set(event.nativeEvent.locationX),
        onStartShouldSetPanResponder: () => true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [travel],
  );

  // keep the thumb in step with the value when the width becomes known or Reset is pressed
  const target = (step / STEPS) * travel;
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: trackWidth ? target : x.get() }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: (trackWidth ? target : x.get()) + THUMB / 2 }));

  return (
    <View {...responder.panHandlers} accessibilityLabel="Maximum price" accessibilityRole="adjustable" onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)} style={styles.sliderHit}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  apply: { flex: 1.6 },
  block: { gap: space.xs },
  body: { gap: space.md, paddingBottom: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  fill: { backgroundColor: color.accent, borderRadius: 3, height: 6 },
  flex: { flex: 1 },
  iconBubble: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 14, height: 28, justifyContent: "center", width: 28 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sliderHit: { height: 44, justifyContent: "center" },
  thumb: {
    backgroundColor: color.onPrimary,
    borderColor: color.accent,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    boxShadow: "0 3px 8px rgba(30, 42, 56, 0.25)",
    height: THUMB,
    position: "absolute",
    width: THUMB,
  },
  titleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: space.xs },
  track: { backgroundColor: color.mist, borderRadius: 3, height: 6, overflow: "hidden" },
  value: { color: color.accent, fontSize: 14, fontWeight: "700" },
});
