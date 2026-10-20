import * as ImagePicker from "expo-image-picker";
import { useCallback, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { Icon, Sheet, useToast, type IconName } from "@/components";
import { color, space, text } from "@/theme/tokens";

import { SELLER, Text } from "./ui";

type DocumentPickerModule = {
  getDocumentAsync: (options: { copyToCacheDirectory: boolean; type: string[] }) => Promise<{ canceled: boolean; assets?: { name: string; mimeType?: string; uri: string }[] }>;
};

/**
 * The file picker is a separate package. When it is installed the Files option works; when it is not, the option is left out
 * instead of the app failing to start (Metro allows a require inside try for an optional package).
 */
let DocumentPicker: DocumentPickerModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DocumentPicker = require("expo-document-picker") as DocumentPickerModule;
} catch {
  DocumentPicker = null;
}

export const filesAvailable = true;

/** On the web, the browser's own file chooser. It stands in for the file picker package, which is only needed on a phone. */
function chooseFileOnWeb(): Promise<Picked | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { kind: kindOf(file.name, file.type), mime: file.type, name: file.name, uri: URL.createObjectURL(file) } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type AttachSource = "library" | "camera" | "files";

/** A file the seller chose: where it is, what it is called and what kind it is. */
export type Picked = { uri: string; name: string; kind: "image" | "pdf" | "file"; mime?: string };

/** What a picked file looks like to the rest of the app, from its name or type. */
export function kindOf(name: string, mime?: string): Picked["kind"] {
  if (mime?.startsWith("image/") || /\.(jpe?g|png|heic|webp|gif)$/i.test(name)) return "image";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  return "file";
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");

/** The four ways to bring a file in. Each answers with the file, or null when the seller backed out or was refused. */
export function useAttach() {
  const toast = useToast();
  return useCallback(
    async (source: AttachSource): Promise<Picked | null> => {
      try {
        if (source === "library") {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
          const asset = result.canceled ? undefined : result.assets[0];
          return asset ? { kind: "image", mime: asset.mimeType, name: asset.fileName ?? `photo-${stamp()}.jpg`, uri: asset.uri } : null;
        }
        if (source === "camera") {
          const allowed = await ImagePicker.requestCameraPermissionsAsync();
          if (!allowed.granted) {
            toast.show("Allow the camera in Settings to take a photo.");
            return null;
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
          const asset = result.canceled ? undefined : result.assets[0];
          return asset ? { kind: "image", mime: asset.mimeType, name: `photo-${stamp()}.jpg`, uri: asset.uri } : null;
        }
        if (!DocumentPicker) {
          if (Platform.OS === "web") return await chooseFileOnWeb();
          toast.show("Files needs the file picker added to the app. Use the photo library or the camera for now.");
          return null;
        }
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ["application/pdf", "image/*"] });
        const asset = result.canceled ? undefined : result.assets?.[0];
        return asset ? { kind: kindOf(asset.name, asset.mimeType), mime: asset.mimeType, name: asset.name, uri: asset.uri } : null;
      } catch {
        toast.show("Vossie could not open that. Check access in Settings and try again.");
        return null;
      }
    },
    [toast],
  );
}

const OPTIONS: { source: AttachSource; icon: IconName; title: string; hint: string }[] = [
  { hint: "Choose a picture you already have", icon: "image", source: "library", title: "Photo library" },
  { hint: "Take a new photo now", icon: "camera", source: "camera", title: "Take a photo" },
  { hint: "A PDF or picture from your files or cloud drives", icon: "folder", source: "files", title: "Files" },
];

/**
 * A sheet that asks where the file comes from. `sources` narrows it (a product photo needs no PDF), and `onPicked`
 * gets the file once the seller has chosen one.
 */
export function AttachSheet({ onClose, onPicked, sources = ["library", "camera", "files"], title = "Add a file", visible }: { visible: boolean; onClose: () => void; onPicked: (file: Picked) => void; sources?: AttachSource[]; title?: string }) {
  const attach = useAttach();
  const [busy, setBusy] = useState<AttachSource | null>(null);
  const choose = async (source: AttachSource) => {
    if (busy) return;
    setBusy(source);
    onClose();
    // a phone cannot open its picker while the sheet is still closing, so wait for it to finish
    if (Platform.OS !== "web") await wait(600);
    const file = await attach(source);
    setBusy(null);
    if (file) onPicked(file);
  };
  return (
    <Sheet onClose={onClose} title={title} visible={visible}>
      <View style={styles.list}>
        {OPTIONS.filter((item) => sources.includes(item.source) && (item.source !== "files" || filesAvailable)).map((item) => (
          <Pressable accessibilityLabel={item.title} accessibilityRole="button" key={item.source} onPress={() => void choose(item.source)} style={styles.row} testID={`attach-${item.source}`}>
            <View style={styles.icon}>
              <Icon color={SELLER.solid} name={item.icon} size={20} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.hint}>{item.hint}</Text>
            </View>
            <Icon color={color.textMuted} name="chevron-right" size={16} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

/** The small picture or file icon that stands for a chosen file. */
export function FileThumb({ file, size = 44, children }: { file: Pick<Picked, "kind" | "uri">; size?: number; children?: ReactNode }) {
  return (
    <View style={[styles.thumb, { height: size, width: size }]}>
      {file.kind === "image" ? null : <Icon color={SELLER.solid} name={file.kind === "pdf" ? "file-text" : "file"} size={size * 0.5} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  icon: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  list: { gap: space.xs, marginTop: space.xs },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm, paddingVertical: space.xs },
  text: { flex: 1, gap: 1 },
  thumb: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 12, justifyContent: "center", overflow: "hidden" },
  title: { ...text.cardTitle, color: SELLER.ink },
});
