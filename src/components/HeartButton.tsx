import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

const LIKED = "#E2564B";

export function HeartButton({
  active,
  idleColor = "#FFFFFF",
  label = "Save",
  onPress,
  size = 22,
  testID,
}: {
  active: boolean;
  onPress: () => void;
  idleColor?: string;
  size?: number;
  label?: string;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={active ? `Remove from ${label === "Save" ? "saved" : label}` : label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={active ? LIKED : idleColor}
        importantForAccessibility="no"
        name={active ? "heart" : "heart-outline"}
        size={size}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  pressed: { transform: [{ scale: 0.9 }] },
});
