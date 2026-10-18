import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

/** Opens the photo library and returns a square-cropped local image URI. */
export function usePickPhoto() {
  return useCallback(async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (result.canceled) return null;
      return result.assets[0]?.uri ?? null;
    } catch {
      Alert.alert("Photo unavailable", "Vossie couldn't open your photos. Check photo access in Settings.");
      return null;
    }
  }, []);
}
