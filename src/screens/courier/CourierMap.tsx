import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { VossieMap } from "@/components/map/VossieMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { pointAlong, regionFor, routeBetween, travelled, type LatLng } from "@/data/geo";
import type { CourierJob } from "@/courier/types";

import { COURIER } from "./ui";

export type MapPhase = "preview" | "to-pickup" | "to-buyer" | "returning";

/** Where the courier is shown while heading to the seller: a little way off, so the line to the pickup has length. */
function startPoint(job: CourierJob): LatLng {
  return { latitude: job.pickup.latitude - 0.0032, longitude: job.pickup.longitude - 0.0024 };
}

/** The point the courier is at, for the phase of the job. In the demo it is simulated; a real one comes from the courier's phone. */
export function courierPoint(job: CourierJob, phase: MapPhase): LatLng {
  const pickup = { latitude: job.pickup.latitude, longitude: job.pickup.longitude };
  const drop = { latitude: job.dropoff.latitude, longitude: job.dropoff.longitude };
  if (phase === "to-buyer") return pointAlong(routeBetween(pickup, drop), job.progress);
  if (phase === "returning") return pointAlong(routeBetween(drop, pickup), job.progress);
  if (phase === "to-pickup") return startPoint(job);
  return pickup;
}

/** The delivery on a real map: the seller, the buyer, the route and, once moving, the courier. The map is the same one the buyer sees. */
export function CourierMap({ height = 170, job, phase }: { job: CourierJob; phase: MapPhase; height?: number }) {
  const pickup = useMemo<LatLng>(() => ({ latitude: job.pickup.latitude, longitude: job.pickup.longitude }), [job.pickup.latitude, job.pickup.longitude]);
  const drop = useMemo<LatLng>(() => ({ latitude: job.dropoff.latitude, longitude: job.dropoff.longitude }), [job.dropoff.latitude, job.dropoff.longitude]);
  const from = phase === "returning" ? drop : phase === "to-pickup" ? startPoint(job) : pickup;
  const to = phase === "returning" ? pickup : phase === "to-pickup" ? pickup : drop;
  const route = useMemo(() => routeBetween(from, to), [from, to]);
  const fraction = phase === "to-buyer" || phase === "returning" ? job.progress : 0;
  const markers: MapMarker[] = [
    { coordinate: pickup, id: "store", kind: "store", title: job.storeName },
    ...(phase === "to-pickup" ? [] : [{ coordinate: drop, id: "home", kind: "home" as const, title: job.dropoff.name }]),
    ...(phase === "preview" ? [] : [{ coordinate: courierPoint(job, phase), id: "courier", kind: "courier" as const, title: "You" }]),
  ];
  const region = regionFor(phase === "to-pickup" ? [from, pickup] : [pickup, drop]);
  return (
    <View style={[styles.map, { height }]}>
      <VossieMap accessibilityLabel={`Map: ${job.pickup.name} to ${job.dropoff.name}`} initialRegion={region} interactive={false} key={`${job.id}-${phase}`} markers={markers} route={route} style={StyleSheet.absoluteFill} testID="courier-map" travelled={fraction > 0 ? travelled(route, fraction) : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: COURIER.card, borderRadius: 20, overflow: "hidden" },
});
