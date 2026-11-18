import { useEffect, useState } from "react";
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

import { color } from "@/theme/tokens";

/** Signatures are saved on a 300 x 120 grid, whatever size the pad was drawn at, so they look the same everywhere. */
export const SIGNATURE_BOX = { height: 120, width: 300 } as const;
const MIN_LENGTH = 40;
const MAX_LENGTH = 18_000;

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * A box to sign in with a finger: draw, and the line follows. `onChange` gets the signature as SVG path data (on a 300 x 120 grid)
 * once there is enough of it to be a signature, and null when it is cleared or too short. Clear starts again.
 */
export function SignaturePad({ height = 150, onChange }: { height?: number; onChange: (path: string | null) => void }) {
  const [path, setPath] = useState("");
  // the pad's size and the last point drawn, kept where the gesture can read them
  const padSize = useSharedValue({ height, width: 300 });
  const lastPoint = useSharedValue({ x: -1000, y: -1000 });

  // whoever uses the pad hears about the signature whenever it changes
  useEffect(() => {
    onChange(path.length >= MIN_LENGTH ? path.trim() : null);
  }, [onChange, path]);

  const grid = (x: number, y: number) => `${round((x / padSize.get().width) * SIGNATURE_BOX.width)} ${round((y / padSize.get().height) * SIGNATURE_BOX.height)}`;

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      lastPoint.set({ x: event.x, y: event.y });
      // a tiny line, so a single tap still leaves a dot
      setPath((current) => (current.length > MAX_LENGTH ? current : `${current}M${grid(event.x, event.y)} L${grid(event.x + 0.4, event.y + 0.4)} `));
    })
    .onUpdate((event) => {
      const last = lastPoint.get();
      if (Math.hypot(event.x - last.x, event.y - last.y) < 2) return;
      lastPoint.set({ x: event.x, y: event.y });
      setPath((current) => (current.length > MAX_LENGTH ? current : `${current}L${grid(event.x, event.y)} `));
    })
    .runOnJS(true);

  const clear = () => {
    lastPoint.set({ x: -1000, y: -1000 });
    setPath("");
  };

  const onLayout = (event: LayoutChangeEvent) => {
    padSize.set({ height: event.nativeEvent.layout.height, width: event.nativeEvent.layout.width });
  };

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View accessibilityHint="Draw your signature with your finger" accessibilityLabel="Signature box" onLayout={onLayout} style={[styles.pad, { height }]} testID="signature-pad">
          <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`} width="100%">
            <Line stroke="#C8D0D4" strokeDasharray="4 4" strokeWidth={1} x1={14} x2={SIGNATURE_BOX.width - 14} y1={SIGNATURE_BOX.height - 26} y2={SIGNATURE_BOX.height - 26} />
            <Path d={path} fill="none" stroke={color.charcoal} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
          </Svg>
          {path ? null : (
            <View pointerEvents="none" style={styles.hint}>
              <Text style={styles.hintText}>Sign here with your finger</Text>
            </View>
          )}
        </View>
      </GestureDetector>
      <Pressable accessibilityLabel="Clear the signature" accessibilityRole="button" hitSlop={10} onPress={clear} style={styles.clear} testID="signature-clear">
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
}

/** A saved signature, drawn small and still, for showing what was signed. */
export function SignatureView({ height = 70, path }: { path: string; height?: number }) {
  return (
    <Svg height={height} viewBox={`0 0 ${SIGNATURE_BOX.width} ${SIGNATURE_BOX.height}`} width={(height * SIGNATURE_BOX.width) / SIGNATURE_BOX.height}>
      <Path d={path} fill="none" stroke={color.charcoal} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  clear: { alignSelf: "flex-end", marginTop: 6, paddingHorizontal: 4 },
  clearText: { color: color.slate, fontSize: 14, fontWeight: "700" },
  hint: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  hintText: { color: color.steelGrey, fontSize: 15 },
  pad: { backgroundColor: "#FFFFFF", borderColor: "#D6DDE0", borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
});
