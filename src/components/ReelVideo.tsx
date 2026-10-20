import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

/** A looping, muted clip that fills its parent and plays only while `playing` is true. */
export function ReelVideo({ playing, source }: { source: string | number; playing: boolean }) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);
  return <VideoView contentFit="cover" nativeControls={false} player={player} pointerEvents="none" style={styles.fill} />;
}

// a web <video> keeps its own size unless it is given one, so the clip says so outright
const styles = StyleSheet.create({ fill: { ...StyleSheet.absoluteFill, height: "100%", width: "100%" } });
