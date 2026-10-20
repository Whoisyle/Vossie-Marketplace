import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Button, Icon, Sheet } from "@/components";
import { shortDate } from "@/data/format";
import { docTitles } from "@/seller/state";
import type { SellerDocument } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import { SELLER, Text } from "./ui";

/**
 * A document the seller has sent in: the picture or the file name, and what is happening to it. Before it is sent in it can be
 * replaced or taken back. Once it is verified it can still be updated (a new ID or proof of address); the new file goes to Vossie
 * Operations and the store keeps trading while it is checked.
 */
export function DocPreview({ canChange, doc, onClose, onRemove, onReplace, onUpdate }: { doc: SellerDocument | null; canChange: boolean; onClose: () => void; onReplace: () => void; onRemove: () => void; onUpdate?: () => void }) {
  const image = doc?.uri && (doc.fileKind === "image" || (!doc.fileKind && /\.(jpe?g|png|heic|webp)$/i.test(doc.fileName ?? "")));
  const verified = doc?.status === "verified";
  const checking = doc?.status === "in-review";
  return (
    <Sheet onClose={onClose} title={doc ? docTitles[doc.kind] : "Document"} visible={Boolean(doc)}>
      {doc ? (
        <>
          <View style={styles.frame} testID="doc-preview">
            {image ? (
              <Image accessibilityLabel={`${docTitles[doc.kind]} preview`} contentFit="contain" source={{ uri: doc.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={styles.file}>
                <Icon color={SELLER.solid} name={verified && !doc.uri ? "shield" : doc.fileKind === "pdf" ? "file-text" : "file"} size={44} />
                <Text style={styles.name}>{doc.fileName ?? "Uploaded file"}</Text>
              </View>
            )}
          </View>
          {verified ? (
            <View style={styles.badge} testID="doc-verified">
              <Icon color="#1E7A4A" name="check-circle" size={16} />
              <Text style={styles.badgeText}>
                Verified by Vossie Operations{doc.verifiedAt ? ` on ${shortDate(doc.verifiedAt)}` : ""}
              </Text>
            </View>
          ) : null}
          {checking ? (
            <View style={[styles.badge, styles.badgeWait]} testID="doc-checking">
              <Icon color="#8A5A0B" name="clock" size={16} />
              <Text style={[styles.badgeText, styles.badgeWaitText]}>Vossie Operations is checking this. Your store keeps trading.</Text>
            </View>
          ) : null}
          <Text style={text.caption}>{doc.fileName ?? "Uploaded file"}</Text>
          {verified && onUpdate ? (
            <>
              <Button fullWidth icon="refresh-cw" label="Update this document" onPress={onUpdate} testID="doc-update" variant="soft" />
              <Text style={text.caption}>Use this if it has changed, like a new ID or a new address. It is checked again, and the old one stays verified until then.</Text>
            </>
          ) : null}
          {canChange && !verified && !checking ? (
            <View style={styles.actions}>
              <Button label="Replace" onPress={onReplace} size="md" testID="doc-replace" variant="soft" />
              <Button label="Remove" onPress={onRemove} size="md" testID="doc-remove" variant="outline" />
            </View>
          ) : null}
          {!canChange && !verified && !checking ? <Text style={text.caption}>It is with Vossie Operations now, so it cannot be changed.</Text> : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: space.sm },
  badge: { alignItems: "center", backgroundColor: "#DDF2E5", borderRadius: 12, flexDirection: "row", gap: 8, padding: space.sm },
  badgeText: { color: "#1E7A4A", flex: 1, fontSize: 13, fontWeight: "700" },
  badgeWait: { backgroundColor: "#FCE9D0" },
  badgeWaitText: { color: "#8A5A0B" },
  file: { alignItems: "center", gap: 8 },
  frame: { alignItems: "center", backgroundColor: "#E9EFF3", borderRadius: 16, height: 220, justifyContent: "center", marginVertical: space.sm, overflow: "hidden" },
  name: { color: SELLER.ink, fontSize: 14, fontWeight: "700" },
});
