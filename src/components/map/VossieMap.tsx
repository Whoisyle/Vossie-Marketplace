import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { color } from "@/theme/tokens";

import { Icon, type IconName } from "../Icon";
import type { MapMarkerKind, VossieMapProps } from "./mapTypes";

const markerLook: Record<MapMarkerKind, { icon: IconName; fill: string }> = {
  courier: { fill: color.primary, icon: "navigation" },
  home: { fill: color.ink, icon: "home" },
  pin: { fill: color.primary, icon: "map-pin" },
  store: { fill: color.accent, icon: "shopping-bag" },
};

/**
 * The one map used across the app (order tracking, address picker, store location). Apple Maps on iPhone in
 * Expo Go. The web build uses a placeholder (VossieMap.web.tsx) because the native map does not run there.
 */
export function VossieMap({
  accessibilityLabel = "Map",
  focus,
  initialRegion,
  interactive = true,
  markers = [],
  onCenterChange,
  route,
  style,
  testID,
  travelled,
}: VossieMapProps) {
  const map = useRef<MapView>(null);

  useEffect(() => {
    if (focus) map.current?.animateToRegion(focus, 450);
  }, [focus]);

  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.fill, style]} testID={testID}>
      <MapView
        initialRegion={initialRegion}
        onRegionChangeComplete={(region) => onCenterChange?.({ latitude: region.latitude, longitude: region.longitude })}
        pitchEnabled={false}
        ref={map}
        rotateEnabled={false}
        scrollEnabled={interactive}
        showsCompass={false}
        showsPointsOfInterests={false}
        style={StyleSheet.absoluteFill}
        zoomEnabled={interactive}
      >
        {route ? <Polyline coordinates={route} lineCap="round" lineDashPattern={[2, 10]} strokeColor={color.accent} strokeWidth={4} /> : null}
        {travelled && travelled.length > 1 ? (
          <Polyline coordinates={travelled} lineCap="round" strokeColor={color.primary} strokeWidth={5} />
        ) : null}
        {markers.map((marker) => (
          <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={marker.coordinate} key={marker.id} title={marker.title} tracksViewChanges={false}>
            <View style={[styles.marker, { backgroundColor: markerLook[marker.kind].fill }]}>
              <Icon color={color.onPrimary} name={markerLook[marker.kind].icon} size={16} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: color.surfaceSoft, overflow: "hidden" },
  marker: {
    alignItems: "center",
    borderColor: color.onPrimary,
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
