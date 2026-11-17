import { Image, type ImageSource } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { introTimeline, rangeProgress } from "./VossieIntroTransition";
import { useIntroRevealAccessibility } from "./useIntroRevealAccessibility";

// Tile frames follow the 2026-10-18 Welcome reference; the photos are the
// 2026-10-23 owner set. Each row is one loop of tiles (x measured from the
// row start) that scrolls forever: top row left to right, bottom row right to
// left.
type Tile = {
  height: number;
  index: number;
  source: ImageSource;
  width: number;
  x: number;
};

const ROW_GAP = 44;
const CANVAS_WIDTH = 852;
const COPIES = [-1, 0, 1] as const;
// Seconds for one full loop. Slow on purpose.
const LOOP_SECONDS = 48;

const TILE_W = 440;
const TILE_STEP = 484; // tile plus gap
const topRow = {
  direction: 1,
  tiles: [0, 1, 2].map((i) => ({
    height: 520,
    index: i,
    source: [require("./assets/gallery-1.jpg"), require("./assets/gallery-2.jpg"), require("./assets/gallery-3.jpg")][i],
    width: TILE_W,
    x: 212 + i * TILE_STEP,
  })),
  y: -40,
} as const;

const bottomRow = {
  direction: -1,
  tiles: [0, 1, 2, 3].map((i) => ({
    height: 640,
    index: i + 3,
    source: [require("./assets/gallery-4.jpg"), require("./assets/gallery-5.jpg"), require("./assets/gallery-6.jpg"), require("./assets/gallery-7.jpg")][i],
    width: TILE_W,
    x: 212 + i * TILE_STEP,
  })),
  y: 516,
} as const;

type Row = { direction: 1 | -1; tiles: readonly Tile[]; y: number };

type AnimatedPhotoGalleryProps = {
  clock: SharedValue<number>;
  reducedMotion: boolean;
  scale: number;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1).factory();

function rowPeriod(row: Row) {
  const first = row.tiles[0]!;
  const last = row.tiles[row.tiles.length - 1]!;
  return last.x + last.width - first.x + ROW_GAP;
}

function AnimatedTile({
  clock,
  copy,
  period,
  reducedMotion,
  scale,
  tile,
}: {
  clock: SharedValue<number>;
  copy: number;
  period: number;
  reducedMotion: boolean;
  scale: number;
  tile: Tile;
}) {
  const revealRange =
    introTimeline.gallery[tile.index] ?? introTimeline.gallery[0]!;
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
  // Only the middle copy is announced; the others exist to fill the loop.
  const announced = copy === 0 && accessibilityRevealed;

  return (
    <Animated.View
      accessibilityLabel={`Marketplace gallery photo ${tile.index + 1} of 7`}
      accessible={copy === 0}
      accessibilityElementsHidden={!announced}
      importantForAccessibility={announced ? "auto" : "no-hide-descendants"}
      style={[
        styles.tile,
        {
          borderRadius: 46 * scale,
          height: tile.height * scale,
          left: (tile.x + copy * period) * scale,
          top: 0,
          width: tile.width * scale,
        },
        animatedStyle,
      ]}
    >
      <Image accessibilityElementsHidden contentFit="cover" source={tile.source} style={styles.fill} />
    </Animated.View>
  );
}

function MarqueeRow({
  clock,
  reducedMotion,
  row,
  scale,
}: {
  clock: SharedValue<number>;
  reducedMotion: boolean;
  row: Row;
  scale: number;
}) {
  const period = rowPeriod(row);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(offset);
      offset.set(0);
      return;
    }
    offset.set(0);
    offset.set(
      withRepeat(
        withTiming(row.direction * period * scale, {
          duration: LOOP_SECONDS * 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(offset);
  }, [offset, period, reducedMotion, row.direction, scale]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }));
  const rowHeight = (row.tiles[0]?.height ?? 0) * scale;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.clip,
        { height: rowHeight + 24 * scale, top: row.y * scale - 12 * scale, width: CANVAS_WIDTH * scale },
      ]}
    >
      <Animated.View style={[styles.track, { top: 12 * scale }, trackStyle]}>
        {COPIES.flatMap((copy) =>
          row.tiles.map((tile) => (
            <AnimatedTile
              clock={clock}
              copy={copy}
              key={`${copy}-${tile.index}`}
              period={period}
              reducedMotion={reducedMotion}
              scale={scale}
              tile={tile}
            />
          )),
        )}
      </Animated.View>
    </View>
  );
}

export function AnimatedPhotoGallery({
  clock,
  reducedMotion,
  scale,
}: AnimatedPhotoGalleryProps) {
  return (
    <>
      <MarqueeRow clock={clock} reducedMotion={reducedMotion} row={topRow} scale={scale} />
      <MarqueeRow clock={clock} reducedMotion={reducedMotion} row={bottomRow} scale={scale} />
    </>
  );
}

const styles = StyleSheet.create({
  clip: { left: 0, overflow: "hidden", position: "absolute" },
  fill: { flex: 1 },
  tile: { overflow: "hidden", position: "absolute" },
  track: { left: 0, position: "absolute" },
});
