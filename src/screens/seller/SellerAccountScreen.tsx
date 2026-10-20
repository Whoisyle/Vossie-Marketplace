import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { uprightWidth } from "@/components/StudentCard";
import { formatRand, initials } from "@/data/format";
import { getCampusName } from "@/data/repository";
import { StudentCardFlip } from "@/screens/account/CardBacks";
import { walletCardWidth } from "@/screens/account/WalletCards";
import { liveReelCount } from "@/seller/selectors";
import { useDemoStore } from "@/state/DemoStore";
import { FEE_PERCENT, PLAN_NAMES } from "@/seller/plan";
import { storeStatus } from "@/seller/schedule";

import { useSeller } from "./hooks";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerScreen, Text } from "./ui";

/** Seller Account: the store as buyers see it, the documents and the bank account behind it, and the way back to buying. */
export function SellerAccountScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state } = useDemoStore();
  const view = useSeller();
  const profile = view.seller.profile;
  const go = (path: string) => router.push(path as Href);
  const [now] = useState(() => Date.now());
  return (
    <SellerScreen tone="white" testID="seller-account">
      <SellerHeader />
      <Text accessibilityRole="header" style={styles.title}>
        Account
      </Text>

      <Animated.View entering={FadeInDown.duration(380)} style={styles.cardGap} testID="seller-student-card">
        <StudentCardFlip
          campusName={getCampusName(state.profile?.campusId ?? "potchefstroom")}
          name={state.profile?.fullName ?? ""}
          studentNumber={state.profile?.studentNumber ?? ""}
          verified={state.profile?.isVerifiedStudent ?? false}
          width={uprightWidth(walletCardWidth(width))}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(380)}>
        <SellerCard style={styles.storeCol} testID="store-card">
          {profile.bannerUri ? <Image accessibilityLabel="Store banner" contentFit="cover" source={{ uri: profile.bannerUri }} style={styles.cardBanner} /> : null}
          <View style={styles.store}>
            <View style={styles.logo}>
              {profile.logoUri ? <Image accessibilityLabel="Store logo" contentFit="cover" source={{ uri: profile.logoUri }} style={StyleSheet.absoluteFill} /> : <Text style={styles.logoText}>{initials(profile.storeName || "Store")}</Text>}
            </View>
            <View style={styles.storeText}>
              <Text style={styles.name}>{view.storeName}</Text>
              <Text style={styles.hint}>{profile.location || "Add a collection location"}</Text>
              <Pill label={view.canTrade ? "Verified seller" : "In review"} tone={view.canTrade ? "success" : "warn"} />
            </View>
          </View>
        </SellerCard>
      </Animated.View>

      <SellerHeading>Your shop</SellerHeading>
      <View style={styles.list}>
        <Row delay={80} hint={view.storeName} icon="shopping-bag" label="Store profile" onPress={() => go("/seller/account/store")} testID="row-store" />
        <Row delay={110} hint={storeStatus(view.seller.schedule, new Date(now)).label} icon="clock" label="Operating times" onPress={() => go("/seller/account/hours")} testID="row-hours" />
        <Row delay={120} hint={view.seller.settings.autoAccept.on ? "Auto-accept is on" : "Auto-accept and more"} icon="sliders" label="Order rules" onPress={() => go("/seller/account/rules")} testID="row-rules" />
        <Row delay={125} hint={view.seller.goals.weeklyRevenueCents ? `Target ${formatRand(view.seller.goals.weeklyRevenueCents)} a week` : "Set a weekly target"} icon="target" label="Weekly goal" onPress={() => go("/seller/account/goals")} testID="row-goals" />
        <Row delay={140} hint={view.canTrade ? "All documents verified" : "Waiting for review"} icon="shield" label="Documents and verification" onPress={() => go("/seller/account/documents")} testID="row-documents" />
        <Row delay={170} hint="Earnings, cards and payouts" icon="credit-card" label="Wallet" onPress={() => go("/seller/account/wallet")} testID="row-wallet" />
        <Row delay={200} hint={profile.bank ? `${profile.bank.bankName} · ending ${profile.bank.last4}` : "Added when you first request a payout"} icon="credit-card" label="Bank account" onPress={() => go("/seller/payouts")} testID="row-bank" />
        <Row delay={260} hint={view.unreadMessages ? `${view.unreadMessages} unread` : "All read"} icon="message-circle" label="Messages" onPress={() => go("/seller/home/messages")} testID="row-messages" />
      </View>

      <SellerHeading>Grow your shop</SellerHeading>
      <View style={styles.list}>
        <Row delay={300} hint="How buyers see you" icon="eye" label="Store preview" onPress={() => go("/seller/account/store-preview")} testID="row-preview" />
        <Row delay={310} hint={`${view.seller.reels.length} reels · ${liveReelCount(view.seller.reels)} live`} icon="film" label="Reels" onPress={() => go("/seller/account/reels")} testID="row-reels" />
        <Row delay={320} hint={`${view.seller.reviewCounts.reduce((a, b) => a + b, 0)} buyer reviews`} icon="star" label="Reviews" onPress={() => go("/seller/account/reviews")} testID="row-reviews" />
        <Row delay={340} hint={`${view.seller.promotions.filter((item) => item.active).length} active`} icon="tag" label="Promotions" onPress={() => go("/seller/account/promotions")} testID="row-promotions" />
        <Row delay={360} hint={`${view.seller.cases.filter((item) => item.status === "open").length} open cases`} icon="alert-circle" label="Returns and disputes" onPress={() => go("/seller/account/cases")} testID="row-cases" />
        <Row delay={380} hint="Sales trends and performance" icon="bar-chart-2" label="Analytics" onPress={() => go("/seller/account/analytics")} testID="row-analytics" />
        <Row delay={390} hint={`${PLAN_NAMES[view.plan]} · ${FEE_PERCENT[view.plan]}% fee`} icon="award" label="Plans" onPress={() => go("/seller/account/plans")} testID="row-plans" />
        <Row delay={400} hint={`${view.seller.team.length} people`} icon="users" label="Team members" onPress={() => go("/seller/account/team")} testID="row-team" />
      </View>

      <SellerHeading>Settings</SellerHeading>
      <View style={styles.list}>
        <Row delay={410} hint="Push, email and quiet hours" icon="bell" label="Notifications" onPress={() => go("/seller/account/notifications")} testID="row-notifications" />
        <Row delay={420} hint="Sign-in, Face ID and devices" icon="lock" label="Security" onPress={() => go("/seller/account/security")} testID="row-security" />
        <Row delay={425} hint={`${view.seller.tickets.filter((item) => item.status !== "resolved").length} open requests`} icon="life-buoy" label="Help and support" onPress={() => go("/seller/account/support")} testID="row-support" />
        <Row delay={430} hint="Business, privacy and your data" icon="settings" label="Settings" onPress={() => go("/seller/account/settings")} testID="row-settings" />
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
        <SellerButton
          icon="log-out"
          label="Log out"
          onPress={() => {
            view.dispatch({ type: "signOut" });
            router.replace("/sign-in" as Href);
          }}
          size="lg"
          style={styles.logout}
          testID="seller-logout"
          variant="outline"
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
  cardGap: { alignItems: "center", marginTop: 4 },
  cardBanner: { borderRadius: 16, height: 70, marginBottom: 6, width: "100%" },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  list: { gap: 10 },
  logo: { alignItems: "center", backgroundColor: "#D5DDE1", borderRadius: 36, height: 72, justifyContent: "center", overflow: "hidden", width: 72 },
  logoText: { color: "#5F6E76", fontSize: 24, fontWeight: "700" },
  name: { color: SELLER.ink, fontSize: 20, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  rowIcon: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  store: { alignItems: "center", flexDirection: "row", gap: 14 },
  storeCol: { gap: 8 },
  storeText: { flex: 1, gap: 3 },
  logout: { marginTop: 12 },
  switch: { marginTop: 24 },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginBottom: 12, marginTop: 18 },
});
