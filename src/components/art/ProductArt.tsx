import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { PRODUCT_PHOTOS } from "./photos";
import { burgerChips, chickenWrap, croissant, flatWhite, icedLatte, kota, matchaAvo, pokeBowl, strawberries, vegBowl, zingerMeal } from "./food";
import { type Fill, makeKit } from "./kit";
import { calculator, deskPlanner, econBook, engMaths, greenFolders, highlighters, plannerNotebooks, progBook } from "./study";
import { headphones, mintLaptop, tablet, usbHub } from "./tech";
import { bomberJacket, denimJacket, hoodie, toteBag } from "./wear";
import { laptopRepair, mathsTutoring, printing, statsTutoring, studyRoom } from "./service";

/** Every product that has its own drawing, with the pair of colours its tile and banner are tinted in. */
const ART: Record<string, { draw: (f: Fill) => ReactNode; tint: readonly [string, string] }> = {
  "almond-croissant": { draw: croissant, tint: ["#FFE9C9", "#E8B66B"] },
  "bomber-jacket": { draw: bomberJacket, tint: ["#E1EBD3", "#9CB57A"] },
  "burger-chips": { draw: burgerChips, tint: ["#FFE3C2", "#F7B77A"] },
  "campus-hoodie": { draw: hoodie, tint: ["#E0EEDC", "#9DBB9A"] },
  "casio-calculator": { draw: calculator, tint: ["#DCE4EA", "#8DA0AE"] },
  "chicken-wrap": { draw: chickenWrap, tint: ["#F8E6C4", "#D9B173"] },
  "choc-strawberries": { draw: strawberries, tint: ["#FFD9DD", "#F59AA6"] },
  "denim-jacket": { draw: denimJacket, tint: ["#D9E5F5", "#7FA3D8"] },
  "desk-planner": { draw: deskPlanner, tint: ["#FFD9D2", "#FF8A7A"] },
  "eng-maths": { draw: engMaths, tint: ["#D6E2F5", "#7FA3D8"] },
  "flat-white": { draw: flatWhite, tint: ["#EADFD2", "#C8A27A"] },
  "green-folders": { draw: greenFolders, tint: ["#D8EEDF", "#8FC7A2"] },
  headphones: { draw: headphones, tint: ["#E3EEF0", "#9FC1C9"] },
  highlighters: { draw: highlighters, tint: ["#FFE3EE", "#FFB6D0"] },
  "iced-latte": { draw: icedLatte, tint: ["#EDE0D0", "#C9A27C"] },
  "kota-special": { draw: kota, tint: ["#FFE8C4", "#E9B25E"] },
  "laptop-repair": { draw: laptopRepair, tint: ["#DDE6EA", "#8FA6B4"] },
  "maths-tutoring": { draw: mathsTutoring, tint: ["#D9E6F6", "#7FA3D8"] },
  "matcha-avo": { draw: matchaAvo, tint: ["#DFF0D2", "#A9D08C"] },
  "mint-laptop": { draw: mintLaptop, tint: ["#D7F1E4", "#8FD9B8"] },
  "planner-notebooks": { draw: plannerNotebooks, tint: ["#E5DEF8", "#B79CE8"] },
  "poke-bowl": { draw: pokeBowl, tint: ["#D7ECF2", "#7FB8C8"] },
  printing: { draw: printing, tint: ["#E3E9EE", "#9FB0BA"] },
  "stats-tutoring": { draw: statsTutoring, tint: ["#DDF1E8", "#8FD9B8"] },
  "study-room": { draw: studyRoom, tint: ["#F4E4CC", "#D9A86A"] },
  "tablet-desk": { draw: tablet, tint: ["#D6E8F2", "#7FB0C8"] },
  "textbook-econ": { draw: econBook, tint: ["#FFE2C4", "#F2A14A"] },
  "textbook-prog": { draw: progBook, tint: ["#D6DEE5", "#7F95A8"] },
  "tote-bag": { draw: toteBag, tint: ["#F6EBD2", "#D8BD84"] },
  "usb-hub": { draw: usbHub, tint: ["#E1E8EC", "#A9B8C2"] },
  "veg-bowl": { draw: vegBowl, tint: ["#F6E6C8", "#D9A53A"] },
  "zinger-meal": { draw: zingerMeal, tint: ["#FFE0B8", "#F2A14A"] },
};

/** The prefix a listing image uses when it is one of our drawings: `art:burger-chips`. */
export const ART_PREFIX = "art:";

export function hasArt(id: string): boolean {
  return id in ART;
}

/** The two colours a product is tinted in, for its tile and its banner. */
export function artTint(id: string): readonly [string, string] {
  return ART[id]?.tint ?? ["#E1E9EB", "#B7C4CC"];
}

/** The ids of every drawing, used by the gallery and the tests. */
export const ART_IDS = Object.keys(ART);

/** One product drawn as vector art, square, with a soft ground shadow. Transparent background so it can sit on anything. */
export function ProductArt({ id, size = 160, style }: { id: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const entry = ART[id];
  if (!entry) return null;
  const photo = PRODUCT_PHOTOS[id];
  if (photo) return <Image accessibilityElementsHidden contentFit="cover" source={photo} style={[{ borderRadius: size * 0.12, height: size, width: size }, style as object]} />;
  const { defs, fill } = makeKit();
  const body = entry.draw(fill);
  return (
    <View accessibilityElementsHidden style={[{ height: size, width: size }, style]}>
      <Svg height={size} viewBox="0 0 200 200" width={size}>
        {defs()}
        {body}
      </Svg>
    </View>
  );
}

/** A listing picture: the product drawing on a tinted tile with a soft ring behind it. Fills its parent. */
export function ArtTile({ id, inset = 0.1 }: { id: string; inset?: number }) {
  const photo = PRODUCT_PHOTOS[id];
  if (photo) return <Image accessibilityElementsHidden contentFit="cover" source={photo} style={StyleSheet.absoluteFill} transition={150} />;
  const [from, to] = artTint(id);
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[from, to]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" width="100%">
        <Circle cx={50} cy={46} fill="rgba(255,255,255,0.28)" r={36} />
        <Circle cx={50} cy={46} fill="none" opacity={0.55} r={42} stroke="#FFFFFF" strokeDasharray="1.5 4" strokeWidth={0.9} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { padding: `${inset * 100}%` as unknown as number }]}>
        <ResizableArt id={id} />
      </View>
    </View>
  );
}

/** The drawing scaled to whatever room it has. */
function ResizableArt({ id }: { id: string }) {
  const entry = ART[id];
  if (!entry) return null;
  const { defs, fill } = makeKit();
  const body = entry.draw(fill);
  return (
    <Svg height="100%" viewBox="0 0 200 200" width="100%">
      {defs()}
      {body}
    </Svg>
  );
}
