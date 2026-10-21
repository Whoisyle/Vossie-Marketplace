import { Image } from "expo-image";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { type LayoutChangeEvent, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import type { LatLng } from "@/data/geo";
import { color } from "@/theme/tokens";

import { Icon, type IconName } from "../Icon";
import type { MapMarker, MapMarkerKind, MapRegion } from "./mapTypes";

const TILE = 256;

/** Where a point is on the whole world's map at a zoom level, in pixels (Web Mercator, as OpenStreetMap tiles use). */
export function worldPixel(point: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin((point.latitude * Math.PI) / 180);
  return { x: ((point.longitude + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale };
}

/** The zoom level at which a region's width and height both fit in a box, as a whole number between 3 and 18. */
export function zoomFor(region: Pick<MapRegion, "latitude" | "latitudeDelta" | "longitudeDelta">, width: number, height: number): number {
  const byWidth = Math.log2((360 * width) / (TILE * Math.max(region.longitudeDelta, 0.0001)));
  const north = worldPixel({ latitude: region.latitude + region.latitudeDelta / 2, longitude: 0 }, 0).y;
  const south = worldPixel({ latitude: region.latitude - region.latitudeDelta / 2, longitude: 0 }, 0).y;
  const byHeight = Math.log2(height / Math.max(Math.abs(south - north), 0.0001));
  return Math.max(3, Math.min(18, Math.floor(Math.min(byWidth, byHeight))));
}

const markerLook: Record<MapMarkerKind, { icon: IconName; fill: string }> = {
  courier: { fill: color.primary, icon: "navigation" },
  home: { fill: color.ink, icon: "home" },
  pin: { fill: color.primary, icon: "map-pin" },
  store: { fill: color.accent, icon: "shopping-bag" },
};

export type Projector = (point: LatLng) => { x: number; y: number };

/**
 * A map made of OpenStreetMap tiles, drawn with plain images, so it looks the same in the browser and on a phone and needs no
 * key. It is not draggable. Markers, the planned route and the part already travelled are drawn on top, and `children` can
 * draw more with the `project` function it is given (the welcome screen animates a pin with it).
 */
export function TileMap({
  accessibilityLabel = "Map",
  center,
  children,
  height,
  markers = [],
  route,
  style,
  testID,
  tint = true,
  travelled,
  width,
  zoom,
}: {
  center: LatLng;
  zoom: number;
  /** Fixed size; when left out the map fills its parent. */
  width?: number;
  height?: number;
  markers?: MapMarker[];
  route?: LatLng[];
  travelled?: LatLng[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  /** A soft teal wash so the colours of the map sit with the app. */
  tint?: boolean;
  children?: (project: Projector, size: { width: number; height: number }) => ReactNode;
}) {
  // until the real size is measured, draw at a typical phone size so the map is never blank
  const [box, setBox] = useState({ height: height ?? 300, width: width ?? 360 });
  const onLayout = useCallback((event: LayoutChangeEvent) => setBox({ height: event.nativeEvent.layout.height, width: event.nativeEvent.layout.width }), []);
  const w = width ?? box.width;
  const h = height ?? box.height;
  const origin = useMemo(() => worldPixel(center, zoom), [center, zoom]);
  const project = useCallback<Projector>(
    (point) => {
      const pixel = worldPixel(point, zoom);
      return { x: pixel.x - origin.x + w / 2, y: pixel.y - origin.y + h / 2 };
    },
    [h, origin.x, origin.y, w, zoom],
  );
  const tiles = useMemo(() => {
    if (w === 0 || h === 0) return [];
    const left = origin.x - w / 2;
    const top = origin.y - h / 2;
    const count = 2 ** zoom;
    const out: { key: string; uri: string; x: number; y: number }[] = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx += 1) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h) / TILE); ty += 1) {
        if (ty < 0 || ty >= count) continue;
        const wrapped = ((tx % count) + count) % count;
        out.push({ key: `${zoom}/${tx}/${ty}`, uri: `https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`, x: tx * TILE - left, y: ty * TILE - top });
      }
    }
    return out;
  }, [h, origin.x, origin.y, w, zoom]);
  const points = (list?: LatLng[]) => (list ? list.map((point) => { const p = project(point); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ") : "");

  return (
    <View accessibilityLabel={accessibilityLabel} onLayout={onLayout} style={[styles.box, width !== undefined && { height, width }, style]} testID={testID}>
      {tiles.map((tile) => (
        <Image cachePolicy="memory-disk" contentFit="cover" key={tile.key} source={{ uri: tile.uri }} style={{ height: TILE, left: tile.x, position: "absolute", top: tile.y, width: TILE }} />
      ))}
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} /> : null}
      {w > 0 && h > 0 ? (
        <Svg height={h} pointerEvents="none" style={StyleSheet.absoluteFill} width={w}>
          {route && route.length > 1 ? <Polyline fill="none" points={points(route)} stroke={color.accent} strokeDasharray="2 9" strokeLinecap="round" strokeWidth={4} /> : null}
          {travelled && travelled.length > 1 ? <Polyline fill="none" points={points(travelled)} stroke={color.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} /> : null}
        </Svg>
      ) : null}
      {w > 0 && h > 0
        ? markers.map((marker) => {
            const p = project(marker.coordinate);
            const look = markerLook[marker.kind];
            return (
              <View key={marker.id} pointerEvents="none" style={[styles.marker, { backgroundColor: look.fill, left: p.x - 18, top: p.y - 18 }]}>
                <Icon color={color.onPrimary} name={look.icon} size={16} />
              </View>
            );
          })
        : null}
      {w > 0 && h > 0 ? children?.(project, { height: h, width: w }) : null}
      <Text pointerEvents="none" style={styles.credit}>
        © OpenStreetMap
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#DDE6EA", overflow: "hidden" },
  credit: { backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 4, bottom: 4, color: "#4B5B64", fontSize: 9, paddingHorizontal: 4, position: "absolute", right: 6 },
  marker: { alignItems: "center", borderColor: color.onPrimary, borderRadius: 18, borderWidth: 2, height: 36, justifyContent: "center", position: "absolute", width: 36 },
  tint: { backgroundColor: "rgba(56,96,111,0.08)" },
});
