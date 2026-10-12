import { CameraView, useCameraPermissions } from "expo-camera";
import type { BarcodeScanningResult } from "expo-camera";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import Animated, { Easing, FadeInDown, FadeInUp, useReducedMotion } from "react-native-reanimated";
import {
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { IosPressable } from "@/components/IosPressable";
import { radius, spacing } from "@/theme";

const WORDMARK = require("../../../assets/branding/vossie-wordmark.png");
const TEAL = "#236579";
const NAVY = "#112B3E";
const CREAM = "#FCFAF5";

function leaveScanner() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/welcome");
}

export function QrSignInScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<BarcodeScanningResult | null>(null);
  const scanLock = useRef(false);
  const frameSize = Math.min(Math.max(width - spacing.xl * 2, 240), 330);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanResult(result);
  }, []);

  const resetScan = useCallback(() => {
    scanLock.current = false;
    setScanResult(null);
  }, []);

  const handlePermission = useCallback(async () => {
    setCameraError(null);
    const nextPermission = await requestPermission();
    if (!nextPermission.granted) {
      setCameraError("Camera access is still off. Enable it in iPhone Settings to scan your Eduvos QR code.");
    }
  }, [requestPermission]);

  if (!permission) {
    return <PermissionScreen onBack={leaveScanner} onRequest={handlePermission} />;
  }

  if (!permission.granted) {
    return (
      <PermissionScreen
        error={cameraError}
        onBack={leaveScanner}
        onOpenSettings={() => void Linking.openSettings()}
        onRequest={handlePermission}
        canOpenSettings={permission.canAskAgain === false}
      />
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar style="light" />
      <CameraView
        active={!scanResult}
        autofocus="on"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
        onMountError={(event) => setCameraError(event.message)}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.cameraTint} />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Image accessibilityLabel="Vossie Marketplace" contentFit="contain" source={WORDMARK} style={styles.wordmark} tintColor="#FFFFFF" />
        <IosPressable accessibilityLabel="Close QR scanner" accessibilityRole="button" onPress={leaveScanner} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </IosPressable>
      </View>

      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.duration(420).easing(Easing.out(Easing.cubic))}
        style={styles.headingBlock}
      >
        <Text style={styles.heading}>Scan to sign in</Text>
        <Text style={styles.description}>Use your Eduvos QR code to securely sign in to Vossie Marketplace.</Text>
      </Animated.View>

      <View style={styles.scannerArea}>
        <View style={[styles.scanFrame, { height: frameSize, width: frameSize }]}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <Text style={styles.scanHint}>{scanResult ? "QR code detected" : "Point your camera at the code"}</Text>
        </View>
      </View>

      <Animated.View
        entering={reducedMotion ? undefined : FadeInUp.duration(460).easing(Easing.out(Easing.cubic))}
        style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      >
        {scanResult ? (
          <>
            <Text style={styles.resultTitle}>QR code detected</Text>
            <Text style={styles.resultText}>
              The code is ready for Eduvos verification. Authentication will continue once the Eduvos connection is configured.
            </Text>
            <IosPressable accessibilityRole="button" onPress={resetScan} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Scan again</Text>
            </IosPressable>
          </>
        ) : (
          <>
            <Text style={styles.instruction}>Open your Eduvos QR code and point your camera at it.</Text>
            {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}
          </>
        )}
        <IosPressable accessibilityRole="button" onPress={leaveScanner} style={styles.backButton}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </IosPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

type PermissionScreenProps = {
  canOpenSettings?: boolean;
  error?: string | null;
  onBack: () => void;
  onOpenSettings?: () => void;
  onRequest?: () => void;
};

function PermissionScreen({ canOpenSettings = false, error, onBack, onOpenSettings, onRequest }: PermissionScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.permissionScreen}>
      <StatusBar style="dark" />
      <Image accessibilityLabel="Vossie Marketplace" contentFit="contain" source={WORDMARK} style={styles.permissionWordmark} tintColor={TEAL} />
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionDescription}>
          Vossie uses your camera only to scan the Eduvos QR code and start a secure sign-in.
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <IosPressable accessibilityRole="button" onPress={canOpenSettings ? onOpenSettings : onRequest} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{canOpenSettings ? "Open Settings" : "Allow camera access"}</Text>
        </IosPressable>
      </View>
      <IosPressable accessibilityRole="button" onPress={onBack} style={styles.permissionBack}>
        <Text style={styles.backChevron}>‹</Text>
        <Text style={styles.backText}>Back</Text>
      </IosPressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0B222A", flex: 1 },
  cameraTint: { backgroundColor: "rgba(4, 31, 39, 0.14)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, zIndex: 2 },
  wordmark: { aspectRatio: 3, height: 44, width: 132 },
  closeButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.86)", borderRadius: radius.full, height: 48, justifyContent: "center", width: 48 },
  closeText: { color: NAVY, fontSize: 36, fontWeight: "300", lineHeight: 40, marginTop: -4 },
  headingBlock: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xl, zIndex: 1 },
  heading: { color: "#FFFFFF", fontFamily: "serif", fontSize: 40, lineHeight: 46, textAlign: "center" },
  description: { color: "#E7F2F4", fontSize: 17, lineHeight: 24, marginTop: spacing.sm, maxWidth: 390, textAlign: "center" },
  scannerArea: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  scanFrame: { alignItems: "center", borderColor: "rgba(255,255,255,0.92)", borderRadius: 28, borderWidth: 3, justifyContent: "center" },
  corner: { borderColor: "#A7E0F8", height: 44, position: "absolute", width: 44 },
  cornerTopLeft: { borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16, borderLeftWidth: 8, borderTopWidth: 8, left: 24, top: 24 },
  cornerTopRight: { borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16, borderRightWidth: 8, borderTopWidth: 8, right: 24, top: 24 },
  cornerBottomLeft: { borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomWidth: 8, borderLeftWidth: 8, bottom: 24, left: 24 },
  cornerBottomRight: { borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16, borderBottomWidth: 8, borderRightWidth: 8, bottom: 24, right: 24 },
  scanHint: { backgroundColor: "rgba(0,0,0,0.32)", borderRadius: radius.sm, color: "#FFFFFF", fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  bottomPanel: { backgroundColor: CREAM, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  instruction: { color: NAVY, fontSize: 16, lineHeight: 22, textAlign: "center" },
  resultTitle: { color: NAVY, fontSize: 22, fontWeight: "700", textAlign: "center" },
  resultText: { color: "#536777", fontSize: 14, lineHeight: 20, marginTop: spacing.xs, textAlign: "center" },
  errorText: { color: "#B42318", fontSize: 13, lineHeight: 18, marginTop: spacing.sm, textAlign: "center" },
  primaryButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: TEAL, borderRadius: radius.full, justifyContent: "center", marginTop: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  backButton: { alignItems: "center", alignSelf: "center", flexDirection: "row", marginTop: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
  backChevron: { color: TEAL, fontSize: 28, lineHeight: 30, marginRight: spacing.xs },
  backText: { color: NAVY, fontSize: 14 },
  permissionScreen: { backgroundColor: CREAM, flex: 1, paddingHorizontal: spacing.lg },
  permissionWordmark: { alignSelf: "center", aspectRatio: 3, height: 54, marginTop: spacing.xl, width: 162 },
  permissionContent: { alignItems: "center", flex: 1, justifyContent: "center", maxWidth: 420, width: "100%", alignSelf: "center" },
  permissionTitle: { color: NAVY, fontFamily: "serif", fontSize: 32, textAlign: "center" },
  permissionDescription: { color: "#536777", fontSize: 16, lineHeight: 23, marginTop: spacing.sm, maxWidth: 360, textAlign: "center" },
  permissionBack: { alignItems: "center", alignSelf: "center", flexDirection: "row", minHeight: 48, paddingHorizontal: spacing.md },
});
