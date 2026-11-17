import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { haptic } from "@/lib/haptics";
import { color } from "@/theme/tokens";

import type { Picked } from "./attach";

export type ScanKind = "id" | "address";

/** Each page of the scan: what to put in front of the camera and the shape of the frame. */
type Page = { key: string; title: string; hint: string; ratio: number; file: string };

const PAGES: Record<ScanKind, Page[]> = {
  address: [{ file: "proof-of-address", hint: "Lay the page flat in good light. The whole page, with your name and address, must be inside the frame.", key: "page", ratio: 1 / 1.414, title: "Proof of residence" }],
  id: [
    { file: "id-front", hint: "Hold the front of your ID inside the frame. Keep the photo and your name sharp, with no glare.", key: "front", ratio: 1.586, title: "Front of your ID" },
    { file: "id-back", hint: "Now turn the ID over and place the back inside the frame.", key: "back", ratio: 1.586, title: "Back of your ID" },
  ],
};

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");

/** What the scan hands back: the first picture, and the back of the ID when it was an ID. */
export type ScanResult = { front: Picked; back?: Picked };

/**
 * A full-screen guided scan. An ID is photographed twice, front then back; a proof of residence once, as a whole page. Each
 * shot is shown for a check (retake or keep) before the next one, and everything is shown together at the end.
 */
export function DocScanner({ kind, onClose, onDone, visible }: { visible: boolean; kind: ScanKind; onClose: () => void; onDone: (result: ScanResult) => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen" visible={visible}>
      {/* mounted fresh each time it opens, so every scan starts at the first page */}
      {visible ? <ScannerBody kind={kind} onClose={onClose} onDone={onDone} /> : null}
    </Modal>
  );
}

function ScannerBody({ kind, onClose, onDone }: { kind: ScanKind; onClose: () => void; onDone: (result: ScanResult) => void }) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const pages = PAGES[kind];
  const [at, setAt] = useState(0);
  const [shots, setShots] = useState<(string | undefined)[]>([]);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const page = pages[Math.min(at, pages.length - 1)]!;
  const reviewing = at >= pages.length;
  const frameWidth = Math.min(width * (page.ratio < 1 ? 0.74 : 0.88), (height * 0.5) * page.ratio);
  const frameHeight = frameWidth / page.ratio;

  const take = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (!picture?.uri) throw new Error("no_picture");
      haptic.success();
      setShots((current) => {
        const next = [...current];
        next[at] = picture.uri;
        return next;
      });
      setChecking(true);
    } catch {
      setProblem("The camera could not take that photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // after a photo is kept, go to the first page still missing a photo, or to the review when none is
  const keep = () => {
    setChecking(false);
    const missing = pages.findIndex((_, index) => !shots[index]);
    setAt(missing === -1 ? pages.length : missing);
  };
  const needsMore = pages.some((_, index) => index !== at && !shots[index]);
  const retake = () => {
    setShots((current) => current.map((item, index) => (index === at ? undefined : item)));
    setChecking(false);
  };
  const finish = () => {
    const files = pages.map((item, index): Picked => ({ kind: "image", mime: "image/jpeg", name: `${item.file}-${stamp()}.jpg`, uri: shots[index]! }));
    onDone({ back: files[1], front: files[0]! });
  };

  const shot = shots[Math.min(at, pages.length - 1)];

  return (
    <>
      <View style={[styles.page, { paddingBottom: Math.max(insets.bottom, 16), paddingTop: Math.max(insets.top, 12) }]} testID="doc-scanner">
        <View style={styles.top}>
          <Pressable accessibilityLabel="Close the scanner" accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.close} testID="scan-close">
            <Icon color="#FFFFFF" name="x" size={20} />
          </Pressable>
          <Text style={styles.step}>{reviewing ? "Check your scan" : pages.length > 1 ? `Step ${at + 1} of ${pages.length}` : "Scan"}</Text>
          <View style={styles.close} />
        </View>

        {reviewing ? (
          <View style={styles.reviewBody}>
            <Text accessibilityRole="header" style={styles.title}>
              {kind === "id" ? "Your ID, front and back" : "Your proof of residence"}
            </Text>
            <Text style={styles.hint}>Make sure every word is readable. You can retake any photo.</Text>
            <View style={styles.thumbs}>
              {pages.map((item, index) => (
                <View key={item.key} style={styles.thumbWrap}>
                  <View style={[styles.thumb, { aspectRatio: item.ratio, width: item.ratio < 1 ? 140 : 160 }]}>{shots[index] ? <Image contentFit="cover" source={{ uri: shots[index] }} style={StyleSheet.absoluteFill} /> : null}</View>
                  <Text style={styles.thumbLabel}>{item.key === "front" ? "Front" : item.key === "back" ? "Back" : "Page"}</Text>
                  <Pressable accessibilityLabel={`Retake ${item.title}`} accessibilityRole="button" hitSlop={8} onPress={() => setAt(index)}>
                    <Text style={styles.link}>Retake</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={finish} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} testID="scan-done">
              <Text style={styles.primaryText}>Add to my documents</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {page.title}
            </Text>
            <Text style={styles.hint}>{page.hint}</Text>

            <View style={styles.stage}>
              {checking && shot ? (
                <View style={[styles.frame, { height: frameHeight, width: frameWidth }]} testID="scan-check">
                  <Image contentFit="cover" source={{ uri: shot }} style={StyleSheet.absoluteFill} />
                </View>
              ) : !permission?.granted ? (
                <View style={styles.ask}>
                  <Icon color={color.sage} name="camera" size={34} />
                  <Text style={styles.hint}>{permission && !permission.canAskAgain ? "Camera access is off. Turn it on in Settings, then come back." : "Vossie needs your camera to scan your document."}</Text>
                  {permission?.canAskAgain !== false ? (
                    <Pressable accessibilityRole="button" onPress={() => void requestPermission()} style={styles.primary} testID="scan-allow">
                      <Text style={styles.primaryText}>Allow camera</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.frame, { height: frameHeight, width: frameWidth }]}>
                  <CameraView facing="back" ref={camera} style={StyleSheet.absoluteFill} />
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <View style={[styles.corner, styles.tl]} />
                    <View style={[styles.corner, styles.tr]} />
                    <View style={[styles.corner, styles.bl]} />
                    <View style={[styles.corner, styles.br]} />
                  </View>
                </View>
              )}
            </View>
            {problem ? (
              <Text accessibilityLiveRegion="polite" style={styles.problem}>
                {problem}
              </Text>
            ) : null}

            <View style={styles.bottom}>
              {checking ? (
                <>
                  <Pressable accessibilityRole="button" onPress={retake} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} testID="scan-retake">
                    <Text style={styles.secondaryText}>Retake</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={keep} style={({ pressed }) => [styles.primary, styles.grow, pressed && styles.pressed]} testID="scan-keep">
                    <Text style={styles.primaryText}>{needsMore ? `Looks good, now the ${pages.find((_, index) => index !== at && !shots[index])!.key}` : "Looks good"}</Text>
                  </Pressable>
                </>
              ) : permission?.granted ? (
                <Pressable accessibilityLabel={`Take a photo of the ${page.title.toLowerCase()}`} accessibilityRole="button" disabled={busy} onPress={() => void take()} style={({ pressed }) => [styles.shutter, pressed && styles.pressed]} testID="scan-shutter">
                  <View style={styles.shutterInner} />
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>
    </>
  );
}

const CORNER = 26;
const styles = StyleSheet.create({
  ask: { alignItems: "center", gap: 14, paddingHorizontal: 30 },
  bl: { borderBottomWidth: 4, borderLeftWidth: 4, bottom: 8, left: 8 },
  bottom: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "center", minHeight: 84, paddingHorizontal: 24 },
  br: { borderBottomWidth: 4, borderRightWidth: 4, bottom: 8, right: 8 },
  close: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  corner: { borderColor: color.sage, borderRadius: 6, height: CORNER, position: "absolute", width: CORNER },
  frame: { backgroundColor: "#000000", borderRadius: 16, overflow: "hidden" },
  grow: { flex: 1 },
  hint: { color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 21, paddingHorizontal: 28, textAlign: "center" },
  link: { color: color.sage, fontSize: 14, fontWeight: "700", marginTop: 2 },
  page: { backgroundColor: "#14292F", flex: 1 },
  pressed: { opacity: 0.85 },
  primary: { alignItems: "center", backgroundColor: "#F4F5F2", borderRadius: 28, height: 54, justifyContent: "center", paddingHorizontal: 22 },
  primaryText: { color: color.charcoal, fontSize: 16, fontWeight: "800" },
  problem: { color: "#FFD8D2", fontSize: 14, fontWeight: "600", textAlign: "center" },
  reviewBody: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", paddingHorizontal: 24 },
  secondary: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 28, height: 54, justifyContent: "center", paddingHorizontal: 22 },
  secondaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  shutter: { alignItems: "center", borderColor: "#FFFFFF", borderRadius: 40, borderWidth: 4, height: 76, justifyContent: "center", width: 76 },
  shutterInner: { backgroundColor: "#FFFFFF", borderRadius: 30, height: 58, width: 58 },
  stage: { alignItems: "center", flex: 1, justifyContent: "center", marginVertical: 12 },
  step: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  thumb: { backgroundColor: "#0B1A1F", borderRadius: 10, overflow: "hidden" },
  thumbLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginTop: 6 },
  thumbWrap: { alignItems: "center" },
  thumbs: { alignItems: "flex-end", flexDirection: "row", gap: 18, justifyContent: "center", marginVertical: 10 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 14, textAlign: "center" },
  tl: { borderLeftWidth: 4, borderTopWidth: 4, left: 8, top: 8 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 },
  tr: { borderRightWidth: 4, borderTopWidth: 4, right: 8, top: 8 },
});
