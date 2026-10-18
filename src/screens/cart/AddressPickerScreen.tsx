import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Icon, TextField } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import type { MapRegion } from "@/components/map/mapTypes";
import { BottomEdgeReveal } from "@/components/nav/BottomEdgeReveal";
import { campusCenter, campusPlaces, describePin, type LatLng } from "@/data/geo";
import { getCampusName } from "@/data/repository";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

const ZOOM = { latitudeDelta: 0.006, longitudeDelta: 0.006 };

/**
 * Delivery address picker: move the map under a fixed pin, or tap a campus spot. The pin position and a
 * readable name are saved to checkout. Street addresses need a geocoding service, which is not connected yet.
 */
export function AddressPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch, state } = useDemoStore();
  const campusId = state.profile?.campusId ?? "potchefstroom";
  const places = campusPlaces(campusId);
  const start = state.checkout.addressPoint ?? campusCenter[campusId];
  const [center, setCenter] = useState<LatLng>(start);
  const [focus, setFocus] = useState<MapRegion | null>(null);
  const [details, setDetails] = useState("");
  const initialRegion = useMemo<MapRegion>(() => ({ ...start, ...ZOOM }), [start]);
  const pin = describePin(center, campusId);

  const choose = (coordinate: LatLng) => {
    haptic.select();
    setCenter(coordinate);
    setFocus({ ...coordinate, ...ZOOM });
  };

  const confirm = () => {
    const extra = details.trim();
    const address = `${extra ? `${extra}, ` : ""}${pin.title}, ${getCampusName(campusId)}`;
    dispatch({ address, point: center, type: "setAddress" });
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <VossieMap
        accessibilityLabel="Map. Move it to place the pin on your delivery spot."
        focus={focus}
        initialRegion={initialRegion}
        onCenterChange={setCenter}
        style={StyleSheet.absoluteFill}
        testID="address-map"
      />
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pin}>
          <Icon color={color.onPrimary} name="map-pin" size={20} />
        </View>
        <View style={styles.pinTip} />
      </View>

      <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.back}>
        <Icon name="chevron-left" size={22} />
      </Pressable>

      <View style={[styles.card, { bottom: 36 + insets.bottom }]}>
        <Text style={text.caption}>Deliver to</Text>
        <Text accessibilityLiveRegion="polite" style={styles.title}>
          {pin.title}
        </Text>
        <Text style={text.bodySmall}>{pin.detail}</Text>

        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {places.map((place) => (
            <Pressable
              accessibilityRole="button"
              key={place.id}
              onPress={() => choose(place.coordinate)}
              style={[styles.chip, pin.place.id === place.id && pin.title === place.name && styles.chipOn]}
            >
              <Text style={[styles.chipText, pin.place.id === place.id && pin.title === place.name && styles.chipTextOn]}>{place.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextField label="Room, building or notes (optional)" onChangeText={setDetails} placeholder="e.g. Block C, room 12" value={details} />
        <Button fullWidth label="Confirm address" onPress={confirm} testID="confirm-address" />
      </View>

      <BottomEdgeReveal dark />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderRadius: 22,
    boxShadow: "0 4px 12px rgba(30, 42, 56, 0.2)",
    height: 44,
    justifyContent: "center",
    left: space.md,
    position: "absolute",
    top: 52,
    width: 44,
  },
  card: {
    backgroundColor: color.surface,
    borderCurve: "continuous",
    borderRadius: corner.xl,
    boxShadow: "0 8px 24px rgba(30, 42, 56, 0.25)",
    gap: space.xs,
    left: space.md,
    padding: space.md,
    position: "absolute",
    right: space.md,
  },
  chip: { borderColor: color.borderStrong, borderRadius: corner.pill, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: space.sm },
  chipOn: { backgroundColor: color.primary, borderColor: color.primary },
  chipText: { color: color.heading, fontSize: 13, fontWeight: "600" },
  chipTextOn: { color: color.onPrimary },
  chips: { gap: space.xs, paddingVertical: space.xs },
  pin: { alignItems: "center", backgroundColor: color.primary, borderColor: color.onPrimary, borderRadius: 22, borderWidth: 3, height: 44, justifyContent: "center", width: 44 },
  pinTip: { backgroundColor: color.primary, height: 12, marginTop: -2, width: 3 },
  pinWrap: { alignItems: "center", bottom: "50%", left: 0, position: "absolute", right: 0 },
  screen: { backgroundColor: color.surfaceSoft, flex: 1 },
  title: { color: color.heading, fontSize: 20, fontWeight: "700" },
});
