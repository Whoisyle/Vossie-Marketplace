import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Button, Sheet } from "@/components";
import { haptic } from "@/lib/haptics";
import { scanMatchesCourierCode } from "@/seller/state";
import { color, space, text } from "@/theme/tokens";
import { Text } from "./ui";

/**
 * Points the camera at the courier's QR code. A code that is not this order's four digits is refused with a message
 * and the camera keeps looking, so a wrong parcel is never handed over by accident.
 */
export function ScanSheet({ code, onClose, onMatch, visible }: { visible: boolean; code: string; onClose: () => void; onMatch: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | undefined>();
  const busy = useRef(false);
  const supported = Platform.OS !== "web";

  const onScan = ({ data }: { data: string }) => {
    if (busy.current) return;
    if (scanMatchesCourierCode(data, code)) {
      busy.current = true;
      haptic.success();
      setMessage(undefined);
      onMatch();
      onClose();
      return;
    }
    haptic.error();
    setMessage("That code is not for this order. Check the courier's screen.");
  };

  return (
    <Sheet onClose={onClose} title="Scan the courier code" visible={visible}>
      {!supported ? (
        <Text style={text.body}>Scanning needs a phone camera. Open the app on your phone, or read the four digits to the courier instead.</Text>
      ) : !permission?.granted ? (
        <>
          <Text style={text.body}>Vossie needs your camera to read the courier&apos;s QR code.</Text>
          <Button fullWidth label="Allow camera" onPress={() => void requestPermission()} testID="allow-camera" />
        </>
      ) : (
        <View style={styles.frame} testID="scanner">
          <CameraView barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScan} style={StyleSheet.absoluteFill} />
        </View>
      )}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {message}
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  error: { color: color.danger, fontSize: 14, fontWeight: "600" },
  frame: { backgroundColor: "#000000", borderRadius: 20, height: 280, marginVertical: space.sm, overflow: "hidden" },
});
