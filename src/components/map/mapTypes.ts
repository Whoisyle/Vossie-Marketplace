import type { StyleProp, ViewStyle } from "react-native";

import type { LatLng } from "@/data/geo";

export type MapMarkerKind = "store" | "home" | "courier" | "pin";

export type MapMarker = { id: string; coordinate: LatLng; kind: MapMarkerKind; title?: string };

export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

export type VossieMapProps = {
  initialRegion: MapRegion;
  markers?: MapMarker[];
  /** The whole planned route, drawn dashed. */
  route?: LatLng[];
  /** The part already travelled, drawn solid over the route. */
  travelled?: LatLng[];
  /** Move the map to show this region (animated) whenever it changes. */
  focus?: MapRegion | null;
  /** Called with the centre when the user stops moving the map. */
  onCenterChange?: (center: LatLng) => void;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};
