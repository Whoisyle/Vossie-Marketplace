import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { relativeTime } from "@/data/format";
import type { SellerAlert } from "@/seller/types";

import { useSeller } from "./hooks";
import { SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar } from "./ui";

const ICONS: Record<SellerAlert["kind"], IconName> = { account: "shield", message: "message-circle", money: "dollar-sign", order: "package", stock: "alert-triangle" };

/** What has happened to the shop: new orders, low stock, messages, approvals and withdrawals, newest first. */
export function SellerNotificationsScreen() {
  const router = useRouter();
  const view = useSeller();
  return (
    <SellerScreen testID="seller-notifications">
      <SellerTopBar
        right={view.unreadAlerts > 0 ? <SellerButton label="Read all" onPress={() => view.dispatch({ type: "sellerMarkAlertsRead" })} size="sm" testID="alerts-read-all" variant="glass" /> : undefined}
        title="Notifications"
      />
      {view.seller.alerts.length === 0 ? (
        <SellerCard style={styles.empty}>
          <Icon color={SELLER.solid} name="bell" size={28} />
          <Text style={styles.title}>You are all caught up</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {view.seller.alerts.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(340)} key={item.id}>
              <SellerCard
                onPress={() => {
                  view.dispatch({ type: "sellerMarkAlertsRead" });
                  if (item.href) router.push(item.href as Href);
                }}
                style={[styles.row, !item.read && styles.unread]}
                testID={`alert-${item.id}`}
              >
                <View style={[styles.icon, !item.read && styles.iconOn]}>
                  <Icon color={item.read ? SELLER.solid : "#FFFFFF"} name={ICONS[item.kind]} size={18} />
                </View>
                <View style={styles.text}>
                  <Text style={[styles.title, !item.read && styles.bold]}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.body}>
                    {item.body}
                  </Text>
                  <Text style={styles.when}>{relativeTime(item.createdAt)}</Text>
                </View>
                {!item.read ? <View style={styles.dot} /> : null}
              </SellerCard>
            </Animated.View>
          ))}
        </View>
      )}
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  body: { color: SELLER.inkSoft, fontSize: 13 },
  bold: { fontWeight: "900" },
  dot: { backgroundColor: SELLER.solid, borderRadius: 5, height: 10, width: 10 },
  empty: { alignItems: "center", gap: 6, marginTop: 20, paddingVertical: 28 },
  icon: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  iconOn: { backgroundColor: SELLER.solid },
  list: { gap: 10, marginTop: 16 },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  text: { flex: 1, gap: 1 },
  title: { color: SELLER.ink, fontSize: 15, fontWeight: "700" },
  unread: { borderColor: "#FFE14A", borderWidth: 1.5 },
  when: { color: SELLER.inkSoft, fontSize: 12 },
});
