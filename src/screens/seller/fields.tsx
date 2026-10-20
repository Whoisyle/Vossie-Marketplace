import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, TextInput, View, type KeyboardTypeOptions } from "react-native";

import { Icon, type IconName } from "@/components";

import { SELLER, Text, useTone } from "./ui";

/** A text field in the seller look: a light box with a white edge, an icon, and the label above it. */
export function SellerField({
  error,
  icon,
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  icon?: IconName;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const look = useTone();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, { backgroundColor: look.well, boxShadow: look.pressed }, multiline && styles.boxTall, focused && { borderColor: SELLER.solid }, Boolean(error) && styles.boxError]}>
        {icon ? <Icon color={SELLER.inkSoft} name={icon} size={20} /> : null}
        <TextInput
          accessibilityLabel={label}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor="#8A99A1"
          style={[styles.input, multiline && styles.inputTall]}
          testID={testID}
          value={value}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: look.tone === "white" ? "#B4544A" : "#FFD8D2" }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Opens the photo library for a document or a logo and gives back the picture's address and file name. */
export function usePickImage() {
  return useCallback(async (square = false): Promise<{ uri: string; name: string } | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: square, aspect: square ? [1, 1] : undefined, mediaTypes: ["images"], quality: 0.7 });
      if (result.canceled) return null;
      const asset = result.assets[0];
      if (!asset) return null;
      return { name: asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg", uri: asset.uri };
    } catch {
      Alert.alert("Photo unavailable", "Vossie couldn't open your photos. Check photo access in Settings.");
      return null;
    }
  }, []);
}

const styles = StyleSheet.create({
  box: { alignItems: "center", borderColor: "transparent", borderRadius: 16, borderWidth: 1.5, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 14 },
  boxError: { borderColor: "#FFB3A8" },
  boxFocused: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  boxTall: { alignItems: "flex-start", paddingVertical: 12 },
  error: { color: "#FFD8D2", fontSize: 13, fontWeight: "600" },
  input: { color: SELLER.ink, flex: 1, fontSize: 16, paddingVertical: 8 },
  inputTall: { minHeight: 60, textAlignVertical: "top" },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  wrap: { gap: 6 },
});
