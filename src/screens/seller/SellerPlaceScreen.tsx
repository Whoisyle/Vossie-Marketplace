import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { VossieMap } from "@/components/map/VossieMap";
import type { MapRegion } from "@/components/map/mapTypes";
import type { LatLng } from "@/data/geo";
import { CAMPUS_HUBS, locationFromPlace, placeAt, searchPlaces, START_POINT, type FoundPlace, type StoreLocation } from "@/seller/places";

import { useSellerDispatch } from "./actions";
import { useSeller } from "./hooks";
import { SELLER, SellerButton, SellerCard, Text, SellerWell } from "./ui";

const ZOOM = { latitudeDelta: 0.006, longitudeDelta: 0.006 };

/**
 * Where the store hands orders over. The seller starts from a real campus hub, searches for a real place (OpenStreetMap), or
 * moves the map under the pin; the name and address of whatever is under the pin are looked up, and saved with the store.
 * `after` is where to go on once it is saved (setup carries on to the next step, manage goes back).
 */
export function SellerPlaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useSellerDispatch();
  const view = useSeller();
  const saved = view.seller.profile.place;
  const start = useMemo(() => (saved ? { latitude: saved.latitude, longitude: saved.longitude } : START_POINT), [saved]);
  const initialRegion = useMemo<MapRegion>(() => ({ ...start, ...ZOOM }), [start]);
  const [focus, setFocus] = useState<MapRegion | null>(null);
  const [chosen, setChosen] = useState<FoundPlace>(() => (saved ? { address: saved.address, coordinate: start, id: "saved", name: saved.name } : CAMPUS_HUBS[0]!));
  const [source, setSource] = useState<StoreLocation["source"]>(saved?.source ?? "hub");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [looking, setLooking] = useState(false);
  const [note, setNote] = useState<string | undefined>();
  const abort = useRef<AbortController | null>(null);

  const go = (place: FoundPlace, from: StoreLocation["source"]) => {
    setChosen(place);
    setSource(from);
    setFocus({ ...place.coordinate, ...ZOOM });
    setResults([]);
    setQuery("");
    setNote(undefined);
  };

  // search a moment after the seller stops typing
  useEffect(() => {
    abort.current?.abort();
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    abort.current = controller;
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(query, controller.signal).then((found) => {
        if (controller.signal.aborted) return;
        setSearching(false);
        setResults(found);
        setNote(found.length === 0 ? "No places found. Try another name, or move the pin." : undefined);
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // the pin was moved by hand: find the nearest real place under it
  const moved = async (center: LatLng) => {
    if (Math.abs(center.latitude - chosen.coordinate.latitude) < 0.00003 && Math.abs(center.longitude - chosen.coordinate.longitude) < 0.00003) return;
    setLooking(true);
    const found = await placeAt(center);
    setLooking(false);
    setSource("pin");
    setChosen(found ?? { address: `${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)}`, coordinate: center, id: "pin", name: "Pinned spot" });
    setNote(found ? undefined : "That spot has no name on the map, so it is saved as a pin.");
  };

  const confirm = () => {
    const place = locationFromPlace(chosen, source);
    dispatch({ patch: { location: `${place.name}, ${place.address.split(",")[0]}`.trim(), place }, type: "sellerSaveStore" });
    router.back();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.screen} testID="seller-place">
      <VossieMap accessibilityLabel="Map. Move it to place the pin on your pickup spot." focus={focus} initialRegion={initialRegion} onCenterChange={(center) => void moved(center)} style={StyleSheet.absoluteFill} testID="place-map" />
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pin}>
          <Icon color="#FFFFFF" name="map-pin" size={20} />
        </View>
        <View style={styles.pinTip} />
      </View>

      <View style={styles.top}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.back}>
          <Icon color={SELLER.solid} name="arrow-left" size={20} />
        </Pressable>
        <SellerWell style={styles.search}>
          <Icon color={SELLER.inkSoft} name="search" size={18} />
          <TextInput accessibilityLabel="Search for a place" autoCorrect={false} onChangeText={setQuery} placeholder="Search for a real place" placeholderTextColor="#8A99A1" style={styles.input} testID="place-search" value={query} />
          {searching ? <ActivityIndicator color={SELLER.solid} size="small" /> : null}
        </SellerWell>
      </View>
      {results.length > 0 ? (
        <SellerCard style={styles.results} testID="place-results">
          {results.map((place) => (
            <Pressable accessibilityRole="button" key={place.id} onPress={() => go(place, "search")} style={styles.result} testID={`place-${place.id}`}>
              <Icon color={SELLER.solid} name="map-pin" size={16} />
              <View style={styles.flex}>
                <Text numberOfLines={1} style={styles.name}>
                  {place.name}
                </Text>
                <Text numberOfLines={1} style={styles.hint}>
                  {place.address}
                </Text>
              </View>
            </Pressable>
          ))}
        </SellerCard>
      ) : null}

      <SellerCard style={[styles.card, { bottom: 24 + insets.bottom }]} testID="place-card">
        <Text style={styles.hint}>{looking ? "Finding the place under the pin…" : source === "hub" ? "Campus hub" : source === "search" ? "Found on the map" : "Pinned by you"}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.title}>
          {chosen.name}
        </Text>
        <Text numberOfLines={2} style={styles.hint}>
          {chosen.address}
        </Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {CAMPUS_HUBS.map((hub) => (
            <Pressable accessibilityRole="button" key={hub.id} onPress={() => go(hub, "hub")} style={[styles.chip, chosen.id === hub.id && styles.chipOn]} testID={`hub-${hub.id}`}>
              <Text style={[styles.chipText, chosen.id === hub.id && styles.chipTextOn]}>{hub.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <SellerButton disabled={looking} icon="check" label="Use this place" onPress={confirm} size="lg" testID="place-confirm" variant="solid" />
      </SellerCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: "center", backgroundColor: "#E9EFF3", borderRadius: 22, boxShadow: "-4px -4px 9px rgba(255,255,255,0.95), 5px 5px 12px rgba(100,120,135,0.45)", height: 44, justifyContent: "center", width: 44 },
  card: { gap: 6, left: 16, position: "absolute", right: 16 },
  chip: { backgroundColor: "#E9EFF3", borderRadius: 18, boxShadow: "-3px -3px 7px rgba(255,255,255,0.95), 3px 3px 8px rgba(150,166,180,0.5)", minHeight: 36, justifyContent: "center", paddingHorizontal: 14 },
  chipOn: { backgroundColor: SELLER.solid },
  chipText: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "700" },
  chipTextOn: { color: "#FFFFFF" },
  chips: { gap: 10, paddingVertical: 6 },
  flex: { flex: 1, gap: 1 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  input: { color: SELLER.ink, flex: 1, fontSize: 15, paddingVertical: 8 },
  name: { color: SELLER.ink, fontSize: 14, fontWeight: "800" },
  note: { color: "#B0680F", fontSize: 13, fontWeight: "600" },
  pin: { alignItems: "center", backgroundColor: SELLER.solid, borderColor: "#FFFFFF", borderRadius: 22, borderWidth: 3, height: 44, justifyContent: "center", width: 44 },
  pinTip: { backgroundColor: SELLER.solid, height: 12, marginTop: -2, width: 3 },
  pinWrap: { alignItems: "center", bottom: "50%", left: 0, position: "absolute", right: 0 },
  result: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 44 },
  results: { gap: 4, left: 16, position: "absolute", right: 16, top: 112 },
  screen: { backgroundColor: "#E9EFF3", flex: 1 },
  search: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 14 },
  title: { color: SELLER.ink, fontSize: 20, fontWeight: "800" },
  top: { alignItems: "center", flexDirection: "row", gap: 10, left: 16, position: "absolute", right: 16, top: 52 },
});

/** The chosen place as a card: a small map with the pin, the name and address, and a button to change it. */
export function PlaceCard({ onChoose, place, testID = "place-card-summary" }: { place?: StoreLocation; onChoose?: () => void; testID?: string }) {
  const region = place ? { latitude: place.latitude, longitude: place.longitude, ...ZOOM } : null;
  return (
    <SellerCard style={cardStyles.card} testID={testID}>
      {region ? (
        <View style={cardStyles.map}>
          <VossieMap accessibilityLabel={`Map showing ${place!.name}`} initialRegion={region} interactive={false} markers={[{ coordinate: region, id: "store", kind: "store", title: place!.name }]} style={StyleSheet.absoluteFill} testID="place-mini-map" />
        </View>
      ) : (
        <View style={[cardStyles.map, cardStyles.empty]}>
          <Icon color={SELLER.solid} name="map-pin" size={26} />
        </View>
      )}
      <View style={cardStyles.row}>
        <View style={cardStyles.text}>
          <Text style={cardStyles.title}>{place ? place.name : "No pickup place yet"}</Text>
          <Text numberOfLines={2} style={cardStyles.hint}>
            {place ? place.address : "Choose a real place on the map where buyers collect."}
          </Text>
        </View>
        {onChoose ? <SellerButton label={place ? "Change" : "Choose"} onPress={onChoose} size="sm" testID="choose-place" variant="light" /> : null}
      </View>
    </SellerCard>
  );
}

const cardStyles = StyleSheet.create({
  card: { gap: 12, padding: 12 },
  empty: { alignItems: "center", backgroundColor: "#DCE6EA", justifyContent: "center" },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  map: { borderRadius: 16, height: 130, overflow: "hidden" },
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  text: { flex: 1, gap: 1 },
  title: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
});
