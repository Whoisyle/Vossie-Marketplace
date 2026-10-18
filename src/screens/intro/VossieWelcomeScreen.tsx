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
  frame: { position: "absolute" },
});
