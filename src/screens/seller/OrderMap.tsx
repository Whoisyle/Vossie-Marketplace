import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { VossieMap } from "@/components/map/VossieMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { distanceKm, routeBetween, type LatLng } from "@/data/geo";
import { geocode, START_POINT } from "@/seller/places";
import type { SellerOrder } from "@/seller/types";

import { useSeller } from "./hooks";
import { SELLER, SellerCard, Text } from "./ui";

/** About how many minutes to cover a distance by bike or on foot on campus, at 12 km an hour. */
export function minutesFor(km: number): number {
  return Math.max(1, Math.round((km / 12) * 60));
}

/** A point `metres` from another, towards the north east: where the demo courier is shown while they are on the way. */
export function offsetPoint(from: LatLng, metres: number): LatLng {
  return { latitude: from.latitude + metres / 111_320 / 1.4, longitude: from.longitude + metres / (111_320 * Math.cos((from.latitude * Math.PI) / 180)) / 1.4 };
}

/**
 * The order on a map: the store's pickup place, and for a delivery the buyer's drop-off, found on the map from the address
 * (OpenStreetMap), with the distance and time. For a collection it shows the pickup place alone.
 */
export function OrderMap({ order }: { order: SellerOrder }) {
  const view = useSeller();
  const place = view.seller.profile.place;
  const store = useMemo<LatLng>(() => (place ? { latitude: place.latitude, longitude: place.longitude } : START_POINT), [place]);
  const delivery = order.fulfilment === "delivery";
  const [drop, setDrop] = useState<LatLng | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!delivery || !order.place) return;
    let cancelled = false;
    geocode(order.place).then((found) => {
      if (cancelled) return;
      setDrop(found);
      setSearched(true);
    });
    return () => {
      cancelled = true;
    };
  }, [delivery, order.place]);

  const markers: MapMarker[] = [{ coordinate: store, id: "store", kind: "store", title: place?.name ?? "Pickup" }];
  if (drop) markers.push({ coordinate: drop, id: "drop", kind: "home", title: order.place });
  const km = drop ? distanceKm(store, drop) : 0;
  const region = drop
    ? { latitude: (store.latitude + drop.latitude) / 2, latitudeDelta: Math.max(0.006, Math.abs(store.latitude - drop.latitude) * 2.4), longitude: (store.longitude + drop.longitude) / 2, longitudeDelta: Math.max(0.006, Math.abs(store.longitude - drop.longitude) * 2.4) }
    : { ...store, latitudeDelta: 0.006, longitudeDelta: 0.006 };

  return (
    <SellerCard style={styles.card} testID="order-map">
      <View style={styles.map}>
        <VossieMap accessibilityLabel={delivery ? "Map from the pickup place to the buyer" : "Map of the pickup place"} initialRegion={region} interactive={false} key={drop ? "two" : "one"} markers={markers} route={drop ? routeBetween(store, drop) : undefined} style={StyleSheet.absoluteFill} testID="order-map-view" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{delivery ? (drop ? `${km.toFixed(1)} km · about ${minutesFor(km)} min` : searched ? "Drop-off not found on the map" : "Finding the drop-off…") : "Collect here"}</Text>
        <Text numberOfLines={2} style={styles.hint}>
          {place ? `${place.name}, ${place.address.split(",")[0]}` : "Set your pickup place in Store profile to see it here."}
        </Text>
      </View>
    </SellerCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, marginTop: 14, padding: 12 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  map: { borderRadius: 16, height: 150, overflow: "hidden" },
  text: { gap: 1 },
  title: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
});
