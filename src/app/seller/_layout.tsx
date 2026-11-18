import { type Href, Redirect, usePathname } from "expo-router";
import { useState } from "react";
import { Tabs } from "expo-router/tabs";

import { OfflineBanner, TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import type { TabConfig } from "@/components/TabBar";
import { orderCounts } from "@/seller/selectors";
import { SellerPushBanner } from "@/screens/seller/SellerPush";
import { SellerQuickActions } from "@/screens/seller/SellerQuickActions";
import { SellerContractSheet } from "@/screens/seller/SellerContractSheet";
import { SellerReviewGate } from "@/screens/seller/SellerReviewGate";
import { AGREEMENT_VERSION } from "@/seller/agreement";
import { useDemoStore } from "@/state/DemoStore";

/**
 * The seller's bottom bar: Home, Products, a round "+" in the middle for quick actions, Orders and Account. Payouts is
 * still a page (Home and Account link to it) but no longer a tab.
 */
const SELLER_TABS: TabConfig[] = [
  { icon: "home", label: "Home", name: "home" },
  { icon: "package", label: "Products", name: "products" },
  { center: true, icon: "plus", label: "Quick actions", name: "create" },
  { icon: "clipboard", label: "Orders", name: "orders" },
  { icon: "user", label: "Account", name: "account" },
];

export default function SellerLayout() {
  const { dispatch, state } = useDemoStore();
  const path = usePathname();
  const [quick, setQuick] = useState(false);
  // submitted: the review screen. Approved and not yet seen: the verified screen, until the seller slides on to the dashboard.
  const gate = state.seller.status === "pending" ? "review" : state.seller.status === "approved" && !state.seller.approvalSeen ? "verified" : "none";
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.profile.role !== "seller") return <Redirect href="/home" />;
  if (!state.seller.setupDone) return <Redirect href={"/seller-setup/welcome" as Href} />;
  // approved, has seen the verified screen, and has not signed the current agreement: the contract slides up and has to be signed
  const contractDue = state.seller.status === "approved" && Boolean(state.seller.approvalSeen) && state.seller.agreement?.version !== AGREEMENT_VERSION;
  const showGate = gate !== "none" && !(gate === "review" && path.startsWith("/seller/account/support"));
  const counts = orderCounts(state.seller.orders);
  const badges = { orders: state.seller.status === "approved" ? counts.new : 0 };

  return (
    <TabChromeProvider>
      <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} badges={badges} fixed neo onCenterPress={() => setQuick(true)} tabs={SELLER_TABS} />}>
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="products" options={{ title: "Products" }} />
        <Tabs.Screen name="create" options={{ title: "Quick actions" }} />
        <Tabs.Screen name="orders" options={{ title: "Orders" }} />
        <Tabs.Screen name="payouts" options={{ title: "Payouts" }} />
        <Tabs.Screen name="account" options={{ title: "Account" }} />
      </Tabs>
      <SellerQuickActions onClose={() => setQuick(false)} visible={quick} />
      <SellerPushBanner />
      <OfflineBanner />
      <SellerContractSheet due={contractDue && gate === "none"} />
      {showGate ? <SellerReviewGate onContinue={() => dispatch({ type: "sellerApprovalSeen" })} phase={gate === "verified" ? "verified" : "review"} storeName={state.seller.profile.storeName || "Your shop"} /> : null}
    </TabChromeProvider>
  );
}
