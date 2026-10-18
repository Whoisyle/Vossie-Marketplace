import { Image, type ImageSource } from "expo-image";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

import { introTimeline, rangeProgress } from "./VossieIntroTransition";
import { useIntroRevealAccessibility } from "./useIntroRevealAccessibility";

// Tile frames follow the 2026-10-18 Welcome reference. Slots 1, 4 and 7
// (teal stones, teal cans, teal cupcakes in the reference) still use the
// earlier photos until the owner supplies the full-resolution originals.
const tiles: readonly {
  height: number;
  source: ImageSource;
  width: number;
  x: number;
  y: number;
}[] = [
  { height: 272, source: require("./assets/gallery-1.jpg"), width: 181, x: 37, y: 78 },
  { height: 272, source: require("./assets/gallery-2.jpg"), width: 220, x: 236, y: 78 },
  { height: 272, source: require("./assets/gallery-3.jpg"), width: 341, x: 474, y: 78 },
  { height: 261, source: require("./assets/gallery-4.jpg"), width: 168, x: 37, y: 385 },
  { height: 261, source: require("./assets/gallery-5.jpg"), width: 201, x: 223, y: 385 },
  { height: 261, source: require("./assets/gallery-6.jpg"), width: 163, x: 442, y: 385 },
  { height: 261, source: require("./assets/gallery-7.jpg"), width: 192, x: 623, y: 385 },
] as const;

type AnimatedPhotoGalleryProps = {
  clock: SharedValue<number>;
  reducedMotion: boolean;
  scale: number;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();

function AnimatedTile({
  clock,
  index,
  reducedMotion,
  scale,
  tile,
}: {
  clock: SharedValue<number>;
  index: number;
  reducedMotion: boolean;
  scale: number;
  tile: (typeof tiles)[number];
}) {
  const revealRange =
    introTimeline.gallery[index] ?? introTimeline.gallery[0]!;
  const accessibilityRevealed = useIntroRevealAccessibility(
    clock,
    revealRange,
    reducedMotion,
  );
  const animatedStyle = useAnimatedStyle(() => {
    const linear = reducedMotion
      ? rangeProgress(clock.get(), [0, introTimeline.totalDurationMs])
      : rangeProgress(clock.get(), revealRange);
    const reveal = EASE_OUT(linear);
    return {
      opacity: reveal,
      transform: [
        { translateY: reducedMotion ? 0 : (1 - reveal) * 18 * scale },
        { scale: reducedMotion ? 1 : 0.96 + reveal * 0.04 },
      ],
    };
  });

  return (
    <Animated.View
      accessibilityLabel={`Marketplace gallery photo ${index + 1} of 7`}
      accessible
      accessibilityElementsHidden={!accessibilityRevealed}
      importantForAccessibility={
        accessibilityRevealed ? "auto" : "no-hide-descendants"
      }
      style={[
        styles.tile,
        {
          borderRadius: 24 * scale,
          height: tile.height * scale,
          left: tile.x * scale,
          top: tile.y * scale,
          width: tile.width * scale,
        },
        animatedStyle,
      ]}
    >
      <Image accessibilityElementsHidden contentFit="cover" source={tile.source} style={styles.fill} />
    </Animated.View>
  );
}

export function AnimatedPhotoGallery({
  clock,
  reducedMotion,
  scale,
}: AnimatedPhotoGalleryProps) {
  return tiles.map((tile, index) => (
    <AnimatedTile
      clock={clock}
      index={index}
      key={`${tile.x}-${tile.y}`}
      reducedMotion={reducedMotion}
      scale={scale}
      tile={tile}
    />
  ));
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tile: { overflow: "hidden", position: "absolute" },
});
