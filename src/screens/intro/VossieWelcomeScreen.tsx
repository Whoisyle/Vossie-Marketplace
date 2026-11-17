import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { AnimatedPhotoGallery } from "./AnimatedPhotoGallery";
import { AnimatedWelcomeContent } from "./AnimatedWelcomeContent";
import type { FrameMetrics } from "./VossieIntroTransition";

type VossieWelcomeScreenProps = {
  clock: SharedValue<number>;
  frame: FrameMetrics;
  interactive: boolean;
  reducedMotion: boolean;
};

export function VossieWelcomeScreen({
  clock,
  frame,
  interactive,
  reducedMotion,
}: VossieWelcomeScreenProps) {
  return (
    <View
      style={[
        styles.frame,
        {
          height: frame.height,
          left: frame.left,
          top: frame.top,
          width: frame.width,
        },
      ]}
    >
      <AnimatedPhotoGallery
        clock={clock}
        reducedMotion={reducedMotion}
        scale={frame.scale}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.8)", "#FFFFFF"]}
        locations={[0, 0.55, 1]}
        pointerEvents="none"
        style={[styles.fade, { height: 450 * frame.scale, top: 720 * frame.scale }]}
      />
      <AnimatedWelcomeContent
        clock={clock}
        interactive={interactive}
        reducedMotion={reducedMotion}
        scale={frame.scale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { left: 0, position: "absolute", right: 0 },
  frame: { position: "absolute" },
});
