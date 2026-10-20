import * as Clipboard from "expo-clipboard";
import { Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Button, Sheet, useToast } from "@/components";
import { space, text } from "@/theme/tokens";

import { SELLER, Text } from "./ui";

/** "Vumisa's Thrift" to "vumisas-thrift". */
export function storeSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "my-store";
}

/** The link a buyer taps. It is a demo address until the web store pages exist. */
export function storeLink(name: string): string {
  return `https://vossie.app/s/${storeSlug(name)}`;
}

/** The link the QR code holds: it opens the store inside the Vossie app. */
export function storeDeepLink(storeId: string): string {
  return `vossie://home/store/${storeId}`;
}

/** The message that goes with a share: the store, where to collect, and the link. */
export function storeMessage(name: string, place: string | undefined, link: string): string {
  return `Shop ${name} on Vossie Marketplace${place ? `. Collect at ${place}` : ""}.\n${link}`;
}

/** Share store: the store link, a QR code that opens the store in the app, the phone's share sheet and a copy button. */
export function ShareStoreSheet({ onClose, place, storeId, storeName, visible }: { visible: boolean; onClose: () => void; storeName: string; storeId: string; place?: string }) {
  const toast = useToast();
  const link = storeLink(storeName);
  const message = storeMessage(storeName, place, link);
  return (
    <Sheet onClose={onClose} title="Share your store" visible={visible}>
      <View style={styles.qr} testID="store-qr">
        <QRCode backgroundColor="#FFFFFF" color={SELLER.solid} size={168} value={storeDeepLink(storeId)} />
      </View>
      <Text style={styles.caption}>Scan this in the Vossie app to open {storeName}.</Text>
      <View style={styles.linkBox} testID="store-link">
        <Text numberOfLines={1} style={styles.link}>
          {link}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          fullWidth
          icon="share-2"
          label="Share"
          onPress={() => {
            // the share sheet is not on every device; copy instead so nothing is lost
            Share.share({ message, title: storeName }).catch(async () => {
              await Clipboard.setStringAsync(message);
              toast.show("Copied. Paste it where you want to share it.");
            });
          }}
          testID="share-native"
        />
        <Button
          fullWidth
          icon="copy"
          label="Copy link"
          onPress={async () => {
            await Clipboard.setStringAsync(link);
            toast.show("Link copied");
          }}
          testID="share-copy"
          variant="soft"
        />
      </View>
      <Text style={text.caption}>The web address is a demo until the store pages go online. The QR code already opens the store in the app.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.xs },
  caption: { ...text.caption, textAlign: "center" },
  link: { color: SELLER.ink, fontSize: 14, fontWeight: "700" },
  linkBox: { alignItems: "center", backgroundColor: "#E9EFF3", borderRadius: 12, padding: space.sm },
  qr: { alignItems: "center", alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 16, marginVertical: space.sm, padding: space.sm },
});
