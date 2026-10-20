import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { initials } from "@/data/format";

import { useSeller } from "./hooks";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerScreen } from "./ui";

/** Seller Account: the store as buyers see it, the documents and the bank account behind it, and the way back to buying. */
export function SellerAccountScreen() {
  const router = useRouter();
  const view = useSeller();
  const profile = view.seller.profile;
  const go = (path: string) => router.push(path as Href);
  return (
    <SellerScreen testID="seller-account">
      <SellerHeader />
      <Text accessibilityRole="header" style={styles.title}>
        Account
      </Text>

      <Animated.View entering={FadeInDown.duration(380)}>
        <SellerCard style={styles.store} testID="store-card">
          <View style={styles.logo}>
            {profile.logoUri ? <Image accessibilityLabel="Store logo" contentFit="cover" source={{ uri: profile.logoUri }} style={StyleSheet.absoluteFill} /> : <Text style={styles.logoText}>{initials(profile.storeName || "Store")}</Text>}
          </View>
          <View style={styles.storeText}>
            <Text style={styles.name}>{view.storeName}</Text>
            <Text style={styles.hint}>{profile.location || "Add a collection location"}</Text>
            <Pill label={view.canTrade ? "Verified seller" : "In review"} tone={view.canTrade ? "success" : "warn"} />
          </View>
        </SellerCard>
      </Animated.View>

      <SellerHeading>Your shop</SellerHeading>
      <View style={styles.list}>
        <Row delay={80} hint={`${profile.days.length} days a week · ${profile.opens} to ${profile.closes}`} icon="shopping-bag" label="Store profile" onPress={() => go("/seller/account/store")} testID="row-store" />
        <Row delay={140} hint={view.canTrade ? "All documents verified" : "Waiting for review"} icon="shield" label="Documents and verification" onPress={() => go("/seller/account/documents")} testID="row-documents" />
        <Row delay={200} hint={profile.bank ? `${profile.bank.bankName} · ending ${profile.bank.last4}` : "Added when you first withdraw"} icon="credit-card" label="Bank account" onPress={() => go("/seller/earnings")} testID="row-bank" />
        <Row delay={260} hint={view.unreadMessages ? `${view.unreadMessages} unread` : "All read"} icon="message-circle" label="Messages" onPress={() => go("/seller/home/messages")} testID="row-messages" />
      </View>

      <Animated.View entering={FadeInDown.delay(320).duration(380)} style={styles.switch}>
        <SellerButton
          icon="repeat"
          label="Switch to buying"
          onPress={() => {
            view.dispatch({ role: "buyer", type: "switchRole" });
            router.replace("/home" as Href);
          }}
          size="lg"
          testID="switch-to-buyer"
          variant="glass"
        />
      </Animated.View>
    </SellerScreen>
  );
}

function Row({ delay, hint, icon, label, onPress, testID }: { icon: IconName; label: string; hint: string; onPress: () => void; delay: number; testID: string }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(340)}>
      <SellerCard onPress={onPress} style={styles.row} testID={testID}>
        <View style={styles.rowIcon}>
          <Icon color={SELLER.solid} name={icon} size={20} />
        </View>
        <View style={styles.storeText}>
          <Text style={styles.rowTitle}>{label}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
        <Icon color={SELLER.inkSoft} name="chevron-right" size={18} />
      </SellerCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  list: { gap: 10 },
  logo: { alignItems: "center", backgroundColor: "#D5DDE1", borderRadius: 36, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  logoText: { color: "#5F6E76", fontSize: 24, fontWeight: "700" },
  name: { color: SELLER.ink, fontSize: 20, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  rowIcon: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  store: { alignItems: "center", flexDirection: "row", gap: 14 },
  storeText: { flex: 1, gap: 3 },
  switch: { marginTop: 24 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12, marginTop: 18 },
});
