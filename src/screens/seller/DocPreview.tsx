import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button, Icon, Sheet } from "@/components";
import { docTitles } from "@/seller/state";
import type { SellerDocument } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import { SELLER, Text } from "./ui";

/** A document the seller has uploaded: the picture or the file name, and, until it is sent in, ways to replace or take it back. */
export function DocPreview({ canChange, doc, onClose, onRemove, onReplace }: { doc: SellerDocument | null; canChange: boolean; onClose: () => void; onReplace: () => void; onRemove: () => void }) {
  const image = doc?.uri && (doc.fileKind === "image" || (!doc.fileKind && /\.(jpe?g|png|heic|webp)$/i.test(doc.fileName ?? "")));
  return (
    <Sheet onClose={onClose} title={doc ? docTitles[doc.kind] : "Document"} visible={Boolean(doc)}>
      {doc ? (
        <>
          <View style={styles.frame} testID="doc-preview">
            {image ? (
              <Image accessibilityLabel={`${docTitles[doc.kind]} preview`} contentFit="contain" source={{ uri: doc.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={styles.file}>
                <Icon color={SELLER.solid} name={doc.fileKind === "pdf" ? "file-text" : "file"} size={44} />
                <Text style={styles.name}>{doc.fileName ?? "Uploaded file"}</Text>
              </View>
            )}
          </View>
          <Text style={text.caption}>{doc.fileName ?? "Uploaded file"}</Text>
          {canChange ? (
            <View style={styles.actions}>
              <Button label="Replace" onPress={onReplace} size="md" testID="doc-replace" variant="soft" />
              <Button label="Remove" onPress={onRemove} size="md" testID="doc-remove" variant="outline" />
            </View>
          ) : (
            <Text style={text.caption}>It is with Vossie Operations now, so it cannot be changed.</Text>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.sm },
  file: { alignItems: "center", gap: 8 },
  frame: { alignItems: "center", backgroundColor: "#E9EFF3", borderRadius: 16, height: 240, justifyContent: "center", marginVertical: space.sm, overflow: "hidden" },
  name: { color: SELLER.ink, fontSize: 14, fontWeight: "700" },
});
