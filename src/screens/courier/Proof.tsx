import { useState } from "react";
import { PanResponder, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { COURIER } from "./ui";

/**
 * Four boxes for a four digit code, with one real input laid over them so the number pad opens and the digits go in the order
 * they are typed. `state` colours the boxes: green when the code is right, red when it is not.
 */
export function CodeBoxes({ length = 4, onChange, state = "idle", testID, value }: { value: string; onChange: (value: string) => void; length?: number; state?: "idle" | "ok" | "bad"; testID: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.row} testID={`${testID}-boxes`}>
      {Array.from({ length }, (_, index) => {
        const char = value[index] ?? "";
        const active = focused && index === Math.min(value.length, length - 1);
        return (
          <View key={index} style={[styles.box, active && styles.boxActive, state === "ok" && styles.boxOk, state === "bad" && styles.boxBad]}>
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        accessibilityLabel="Four digit code"
        caretHidden
        inputMode="numeric"
        keyboardType="number-pad"
        maxLength={length}
        onBlur={() => setFocused(false)}
        onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}

type Point = { x: number; y: number };

/** A box to sign in with a finger. It reports whether a signature has been drawn; Clear starts again. Nothing is saved but the fact that one was made. */
export function SignaturePad({ onChange }: { onChange: (signed: boolean) => void }) {
  const [paths, setPaths] = useState<Point[][]>([]);
  const [responder] = useState(() => {
    let moves = 0;
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => setPaths((list) => [...list, [{ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }]]),
      onPanResponderMove: (event) => {
        moves += 1;
        const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
        setPaths((list) => [...list.slice(0, -1), [...(list[list.length - 1] ?? []), point]]);
      },
      onPanResponderRelease: () => onChange(moves > 6),
      onStartShouldSetPanResponder: () => true,
    });
  });
  const d = (points: Point[]) => points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return (
    <View testID="signature-pad">
      <View {...responder.panHandlers} style={styles.pad}>
        <Svg height="100%" pointerEvents="none" width="100%">
          {paths.map((points, index) => (points.length > 1 ? <Path d={d(points)} fill="none" key={index} stroke={COURIER.ink} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /> : null))}
        </Svg>
        {paths.length === 0 ? <Text pointerEvents="none" style={styles.hint}>Buyer signs here</Text> : null}
      </View>
      <Text
        accessibilityRole="button"
        onPress={() => {
          setPaths([]);
          onChange(false);
        }}
        style={styles.clear}
        testID="signature-clear"
      >
        Clear
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", backgroundColor: COURIER.card, borderColor: "transparent", borderRadius: 14, borderWidth: 2, flex: 1, height: 58, justifyContent: "center" },
  boxActive: { borderColor: COURIER.solid },
  boxBad: { backgroundColor: COURIER.redSoft, borderColor: COURIER.red },
  boxOk: { backgroundColor: COURIER.greenSoft, borderColor: COURIER.green },
  clear: { alignSelf: "flex-end", color: COURIER.solid, fontSize: 13, fontWeight: "700", marginTop: 6, padding: 4 },
  digit: { color: COURIER.ink, fontSize: 26, fontWeight: "800" },
  hint: { color: COURIER.muted, fontSize: 14, left: 0, position: "absolute", right: 0, textAlign: "center", top: "42%" },
  input: { ...StyleSheet.absoluteFill, color: "transparent", opacity: 0.02 },
  pad: { backgroundColor: "#FFFFFF", borderColor: COURIER.border, borderRadius: 18, borderStyle: "dashed", borderWidth: 1.5, height: 150, overflow: "hidden" },
  row: { flexDirection: "row", gap: 12 },
});
