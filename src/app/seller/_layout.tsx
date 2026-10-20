import { type Href, Redirect } from "expo-router";
import { Tabs } from "expo-router/tabs";

import { OfflineBanner, TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import type { IconName } from "@/components";
import { orderCounts } from "@/seller/selectors";
import { useDemoStore } from "@/state/DemoStore";

/** The seller's bottom bar: Home, Products, Orders, Payouts and Account. */
const SELLER_TABS: { name: string; label: string; icon: IconName }[] = [
  { icon: "home", label: "Home", name: "home" },
  { icon: "package", label: "Products", name: "products" },
  { icon: "clipboard", label: "Orders", name: "orders" },
  { icon: "credit-card", label: "Payouts", name: "payouts" },
  { icon: "user", label: "Account", name: "account" },
];

export default function SellerLayout() {
  const { state } = useDemoStore();
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.profile.role !== "seller") return <Redirect href="/home" />;
  if (!state.seller.setupDone) return <Redirect href={"/seller-setup/welcome" as Href} />;
  const counts = orderCounts(state.seller.orders);
  const badges = { orders: state.seller.status === "approved" ? counts.new : 0 };

  return (
    <TabChromeProvider>
      <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} badges={badges} fixed neo tabs={SELLER_TABS} />}>
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="products" options={{ title: "Products" }} />
        <Tabs.Screen name="orders" options={{ title: "Orders" }} />
        <Tabs.Screen name="payouts" options={{ title: "Payouts" }} />
        <Tabs.Screen name="account" options={{ title: "Account" }} />
      </Tabs>
      <OfflineBanner />
    </TabChromeProvider>
  );
}
