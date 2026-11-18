import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, Sheet, type IconName } from "@/components";
import { color } from "@/theme/tokens";

import { CloseEarlySheet } from "./CloseEarly";
import { useSeller } from "./hooks";
import { ShareStoreSheet } from "./ShareStore";

type Action = { key: string; label: string; hint: string; icon: IconName; tint: string; run: () => void };

/**
 * What the round "+" in the middle of the seller's bar opens: the things a seller does most, one tap each. Each has its own
 * colour. Share and Close early open their own sheets after this one has closed.
 */
export function SellerQuickActions({ onClose, visible }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const view = useSeller();
  const [sharing, setSharing] = useState(false);
  const [closing, setClosing] = useState(false);
  const go = (path: string) => {
    onClose();
    router.push(path as Href);
  };
  // a phone cannot open a second sheet while the first is still closing
  const later = (open: () => void) => {
    onClose();
    setTimeout(open, Platform.OS === "web" ? 0 : 450);
  };
  const early = view.status.reason === "early";
  const actions: Action[] = [
    { hint: "Photos, price and stock", icon: "package", key: "product", label: "Add a product", run: () => go("/seller/products/new"), tint: "#2F7DD1" },
    { hint: "Show a product in a short video", icon: "film", key: "reel", label: "Post a reel", run: () => go("/seller/products/reel/new"), tint: "#7B5BD6" },
    { hint: "A discount or a free delivery offer", icon: "tag", key: "promotion", label: "New promotion", run: () => go("/seller/account/promotion/new"), tint: "#E58A2B" },
    { hint: "Link, QR code and share sheet", icon: "share-2", key: "share", label: "Share your store", run: () => later(() => setSharing(true)), tint: "#2E9E6B" },
    { hint: early ? "Reopen for today" : "Stop taking orders for today", icon: "moon", key: "early", label: early ? "Open again" : "Close early today", run: () => later(() => setClosing(true)), tint: "#586879" },
    { hint: "Move your earnings to your bank", icon: "credit-card", key: "withdraw", label: "Withdraw money", run: () => go("/seller/payouts"), tint: color.accent },
  ];
  return (
    <>
      <Sheet onClose={onClose} title="Quick actions" visible={visible}>
        <View style={styles.list} testID="quick-actions">
          {actions.map((action) => (
            <Pressable accessibilityLabel={action.label} accessibilityRole="button" key={action.key} onPress={action.run} style={({ pressed }) => [styles.row, pressed && styles.pressed]} testID={`quick-${action.key}`}>
              <View style={[styles.tile, { backgroundColor: action.tint }]}>
                <Icon color="#FFFFFF" name={action.icon} size={20} />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{action.label}</Text>
                <Text style={styles.hint}>{action.hint}</Text>
              </View>
              <Icon color={color.steelGrey} name="chevron-right" size={18} />
            </Pressable>
          ))}
        </View>
      </Sheet>
      <ShareStoreSheet onClose={() => setSharing(false)} place={view.seller.profile.place?.name} storeId={view.seller.profile.storeId || "campusbites"} storeName={view.storeName} visible={sharing} />
      <CloseEarlySheet onClose={() => setClosing(false)} visible={closing} />
    </>
  );
}

const styles = StyleSheet.create({
  hint: { color: "#5F6E76", fontSize: 13 },
  list: { gap: 6, paddingBottom: 8 },
  pressed: { backgroundColor: color.cloudGrey },
  row: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 14, minHeight: 64, paddingHorizontal: 8, paddingVertical: 8 },
  text: { flex: 1, gap: 1 },
  tile: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  title: { color: "#1E2B33", fontSize: 16, fontWeight: "800" },
});
