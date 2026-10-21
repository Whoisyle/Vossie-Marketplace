import { useMemo, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";

import { TileMap, zoomFor } from "./TileMap";
import type { VossieMapProps } from "./mapTypes";

/**
 * The browser build of the map: the native map does not run there, so it draws a still map from OpenStreetMap tiles with the
 * same markers, route and travelled line. It cannot be dragged.
 */
export function VossieMap({ accessibilityLabel = "Map", initialRegion, markers = [], route, style, testID, travelled }: VossieMapProps) {
  const [box, setBox] = useState({ height: 0, width: 0 });
  const zoom = useMemo(() => (box.width > 0 ? zoomFor(initialRegion, box.width, box.height) : 15), [box.height, box.width, initialRegion]);
  const onLayout = (event: LayoutChangeEvent) => setBox({ height: event.nativeEvent.layout.height, width: event.nativeEvent.layout.width });
  return (
    <View onLayout={onLayout} style={[styles.fill, style]}>
      <TileMap accessibilityLabel={accessibilityLabel} center={{ latitude: initialRegion.latitude, longitude: initialRegion.longitude }} markers={markers} route={route} style={StyleSheet.absoluteFill} testID={testID} travelled={travelled} zoom={zoom} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: "hidden" },
});
