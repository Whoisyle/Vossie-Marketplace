import { useMemo, useState } from "react";
import { PanResponder, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Button, Chip, Sheet } from "@/components";
import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, space, text } from "@/theme/tokens";

import { NO_FILTERS, PRICE_MAX_CENTS, PRICE_STEP_CENTS, priceLabel, type Filters } from "./filters";

const STEPS = PRICE_MAX_CENTS / PRICE_STEP_CENTS;
const THUMB = 28;

/** Price, rating and open-now filters, opened from the button beside the search bar. */
export function FiltersSheet({
  filters,
  onApply,
  onClose,
  visible,
}: {
  visible: boolean;
  filters: Filters;
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

  return (
    <Sheet onClose={onClose} title="Filters" visible={visible}>
      <View style={styles.body}>
        <View style={styles.block}>
          <View style={styles.row}>
            <Text style={text.cardTitle}>Price</Text>
            <Text style={styles.value}>{priceLabel(draft.maxPriceCents)}</Text>
          </View>
          <PriceSlider
            onChange={(maxPriceCents) => setDraft((current) => ({ ...current, maxPriceCents }))}
            value={draft.maxPriceCents}
          />
        </View>

        <View style={styles.block}>
          <Text style={text.cardTitle}>Rating</Text>
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
        </View>

        <View style={[styles.block, styles.row]}>
          <View style={styles.flex}>
            <Text style={text.cardTitle}>Open now</Text>
            <Text style={text.caption}>Only stores that are open right now</Text>
          </View>
          <Switch
            accessibilityLabel="Open now"
            onValueChange={(openNow) => {
              haptic.select();
              setDraft((current) => ({ ...current, openNow }));
            }}
            thumbColor={color.onPrimary}
            trackColor={{ false: color.borderStrong, true: color.primary }}
            value={draft.openNow}
          />
        </View>

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button fullWidth label="Reset" onPress={() => setDraft(NO_FILTERS)} variant="outline" />
          </View>
          <View style={styles.flex}>
            <Button
              fullWidth
              label="Show results"
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
  block: { gap: space.xs },
  body: { gap: space.lg, paddingBottom: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  fill: { backgroundColor: color.accent, borderRadius: 3, height: 6 },
  flex: { flex: 1 },
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
  track: { backgroundColor: color.mist, borderRadius: 3, height: 6, overflow: "hidden" },
  value: { color: color.accent, fontSize: 14, fontWeight: "700" },
});
