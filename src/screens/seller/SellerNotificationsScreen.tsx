import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text as RawText, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { relativeTime } from "@/data/format";
import { NOTIFY_KINDS, type NotifyKind, type NotifyPrefs, type SellerAlert } from "@/seller/types";

import { actionsFor, inQuietHours, SAMPLE_PUSH } from "@/seller/push";

import { useSeller } from "./hooks";
import { PushCard } from "./SellerPush";
import { Chips, TimeStepper } from "./parts";
import { SELLER, SellerButton, SellerCard, SellerIconButton, SellerScreen, SellerTopBar, Text } from "./ui";

const ICONS: Record<SellerAlert["kind"], IconName> = { account: "shield", message: "message-circle", money: "dollar-sign", order: "package", promo: "tag", review: "star", stock: "alert-triangle" };

type Filter = "all" | "orders" | "money" | "account";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "orders", label: "Orders" },
  { key: "money", label: "Money" },
  { key: "account", label: "Account" },
];

const GROUP: Record<SellerAlert["kind"], Filter> = { account: "account", message: "orders", money: "money", order: "orders", promo: "account", review: "account", stock: "orders" };

function startOfDay(at: number): number {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** What has happened to the shop, grouped into Today and Earlier. Swipe a notification right to mark it read, or tap it to open it. */
export function SellerNotificationsScreen() {
  const router = useRouter();
  const view = useSeller();
  const [filter, setFilter] = useState<Filter>("all");
  const [now] = useState(() => Date.now());
  const shown = view.seller.alerts.filter((item) => filter === "all" || GROUP[item.kind] === filter);
  const today = shown.filter((item) => new Date(item.createdAt).getTime() >= startOfDay(now));
  const earlier = shown.filter((item) => new Date(item.createdAt).getTime() < startOfDay(now));

  const row = (item: SellerAlert, index: number) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(340)} key={item.id}>
      <ReanimatedSwipeable
        friction={2}
        leftThreshold={60}
        onSwipeableOpen={() => view.dispatch({ id: item.id, type: "sellerMarkAlertRead" })}
        renderLeftActions={() => (
          <View style={styles.swipe}>
            <Icon color="#FFFFFF" name="check" size={20} />
            <RawText style={styles.swipeText}>Read</RawText>
          </View>
        )}
      >
        <SellerCard
          onPress={() => {
            view.dispatch({ id: item.id, type: "sellerMarkAlertRead" });
            if (item.href) router.push(item.href as Href);
          }}
          style={styles.row}
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
          {!item.read ? <View style={styles.dot} testID={`unread-${item.id}`} /> : null}
        </SellerCard>
      </ReanimatedSwipeable>
    </Animated.View>
  );

  return (
    <SellerScreen tone="white" testID="seller-notifications">
      <SellerTopBar
        right={
          <SellerIconButton icon="settings" label="Notification settings" onPress={() => router.push("/seller/account/notifications" as Href)} testID="alerts-settings" />
        }
        title="Notifications"
      />
      <Chips items={FILTERS} onChange={setFilter} value={filter} />
      {view.unreadAlerts > 0 ? <SellerButton label={`Mark ${view.unreadAlerts} as read`} onPress={() => view.dispatch({ type: "sellerMarkAlertsRead" })} size="sm" style={styles.readAll} testID="alerts-read-all" variant="light" /> : null}
      {shown.length === 0 ? (
        <SellerCard style={styles.empty} testID="alerts-empty">
          <Icon color={SELLER.solid} name="bell" size={28} />
          <Text style={styles.title}>You are all caught up</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {today.length > 0 ? <Text style={styles.group}>Today</Text> : null}
          {today.map(row)}
          {earlier.length > 0 ? <Text style={styles.group}>Earlier</Text> : null}
          {earlier.map((item, index) => row(item, index + today.length))}
        </View>
      )}
    </SellerScreen>
  );
}

const LABELS: Record<NotifyKind, { label: string; hint: string; icon: IconName }> = {
  messages: { hint: "When a buyer writes to you", icon: "message-circle", label: "Messages" },
  money: { hint: "Sales paid out, payouts and refunds", icon: "dollar-sign", label: "Payouts and refunds" },
  orders: { hint: "New orders and order changes", icon: "package", label: "Orders" },
  promotions: { hint: "Offers that start or end, and tips", icon: "tag", label: "Promotions" },
  reviews: { hint: "A new review from a buyer", icon: "star", label: "Reviews" },
  stock: { hint: "When a product is running low", icon: "alert-triangle", label: "Stock alerts" },
};

/** Which notifications reach the seller, and how: push or email for each kind, quiet hours and sound. */
export function SellerNotifySettingsScreen() {
  const view = useSeller();
  const prefs = view.seller.notify;
  const save = (next: NotifyPrefs) => view.dispatch({ notify: next, type: "sellerSetNotify" });
  const toggle = (kind: NotifyKind, channel: "push" | "email", value: boolean) => save({ ...prefs, channels: { ...prefs.channels, [kind]: { ...prefs.channels[kind], [channel]: value } } });

  return (
    <SellerScreen tone="white" testID="seller-notify-settings">
      <SellerTopBar title="Notification settings" />
      <Text style={styles.sub}>Choose what reaches you and how. Push is sent to this phone, email to your student address.</Text>

      <Text style={styles.group}>How they look</Text>
      <ScrollView contentContainerStyle={styles.gallery} horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll} testID="push-gallery">
        {NOTIFY_KINDS.map((kind) => {
          const sample = SAMPLE_PUSH[kind];
          return (
            <View key={kind} style={styles.sample} testID={`sample-${kind}`}>
              <PushCard actions={actionsFor(sample)} alert={sample} quiet={inQuietHours(prefs.quiet, new Date()) || !prefs.channels[kind].push} />
              <SellerButton label="Send me this one" onPress={() => view.dispatch({ kind, type: "sellerPing" })} size="sm" testID={`ping-${kind}`} variant="light" />
            </View>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>Cards slide in over the app. A card on the lock screen looks the same, with the buttons under it.</Text>
      <View style={styles.list}>
        {NOTIFY_KINDS.map((kind) => (
          <SellerCard key={kind} style={styles.pref} testID={`pref-${kind}`}>
            <View style={styles.prefTop}>
              <View style={styles.icon}>
                <Icon color={SELLER.solid} name={LABELS[kind].icon} size={18} />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{LABELS[kind].label}</Text>
                <Text style={styles.body}>{LABELS[kind].hint}</Text>
              </View>
            </View>
            <View style={styles.channels}>
              <Channel label="Push" onChange={(value) => toggle(kind, "push", value)} testID={`push-${kind}`} value={prefs.channels[kind].push} />
              <Channel label="Email" onChange={(value) => toggle(kind, "email", value)} testID={`email-${kind}`} value={prefs.channels[kind].email} />
            </View>
          </SellerCard>
        ))}
        <SellerCard style={styles.pref} testID="pref-quiet">
          <View style={styles.between}>
            <View style={styles.text}>
              <Text style={styles.title}>Quiet hours</Text>
              <Text style={styles.body}>No sound or buzz at night. Orders still wait for you.</Text>
            </View>
            <Switch accessibilityLabel="Quiet hours" onValueChange={(value) => save({ ...prefs, quiet: { ...prefs.quiet, on: value } })} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={prefs.quiet.on} />
          </View>
          {prefs.quiet.on ? (
            <View style={styles.channels}>
              <TimeStepper label="From" onChange={(value) => save({ ...prefs, quiet: { ...prefs.quiet, from: value } })} testID="quiet-from" value={prefs.quiet.from} />
              <TimeStepper label="To" onChange={(value) => save({ ...prefs, quiet: { ...prefs.quiet, to: value } })} testID="quiet-to" value={prefs.quiet.to} />
            </View>
          ) : null}
        </SellerCard>
        <SellerCard style={styles.pref}>
          <View style={styles.between}>
            <View style={styles.text}>
              <Text style={styles.title}>Sound for new orders</Text>
              <Text style={styles.body}>A short chime when an order arrives.</Text>
            </View>
            <Switch accessibilityLabel="Sound for new orders" onValueChange={(value) => save({ ...prefs, sound: value })} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={prefs.sound} />
          </View>
        </SellerCard>
      </View>
      <Text style={styles.note}>Push and email are saved here. Sending them for real arrives with the live backend.</Text>
    </SellerScreen>
  );
}

function Channel({ label, onChange, testID, value }: { label: string; value: boolean; onChange: (value: boolean) => void; testID: string }) {
  return (
    <View style={styles.channel}>
      <Text style={styles.body}>{label}</Text>
      <Switch accessibilityLabel={label} onValueChange={onChange} testID={testID} thumbColor="#FFFFFF" trackColor={{ false: "#C3CED3", true: SELLER.solid }} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  body: { color: SELLER.inkSoft, fontSize: 13 },
  bold: { fontWeight: "900" },
  channel: { alignItems: "center", flexDirection: "row", gap: 8 },
  channels: { flexDirection: "row", gap: 24 },
  dot: { backgroundColor: SELLER.solid, borderRadius: 5, height: 10, width: 10 },
  empty: { alignItems: "center", gap: 6, marginTop: 20, paddingVertical: 28 },
  group: { color: SELLER.inkSoft, fontSize: 13, fontWeight: "800", letterSpacing: 1, marginTop: 6, textTransform: "uppercase" },
  icon: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  iconOn: { backgroundColor: SELLER.solid },
  gallery: { gap: 14, paddingHorizontal: 20, paddingVertical: 8 },
  galleryScroll: { marginHorizontal: -20 },
  hint: { color: SELLER.inkSoft, fontSize: 12, marginTop: 4 },
  list: { gap: 12, marginTop: 12 },
  sample: { gap: 8, width: 300 },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  pref: { gap: 12 },
  prefTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  readAll: { alignSelf: "flex-start" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  sub: { color: SELLER.inkSoft, fontSize: 14, marginTop: 8 },
  swipe: { alignItems: "center", backgroundColor: SELLER.solid, borderRadius: 24, flexDirection: "row", gap: 6, justifyContent: "center", marginRight: 8, paddingHorizontal: 20 },
  swipeText: { color: "#FFFFFF", fontWeight: "800" },
  text: { flex: 1, gap: 1 },
  title: { color: SELLER.ink, fontSize: 15, fontWeight: "700" },
  when: { color: SELLER.inkSoft, fontSize: 12 },
});
