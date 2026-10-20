import { type Href, Redirect } from "expo-router";
import { Tabs } from "expo-router/tabs";

import { NotificationBanner, OfflineBanner, OrderSimulator, TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import { useDemoStore } from "@/state/DemoStore";

export default function TabsLayout() {
  const { state } = useDemoStore();
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.isNewUser) return <Redirect href="/profile-setup" />;
  // a student in seller mode uses the seller side of the app
  if (state.profile.role === "courier") return <Redirect href={(state.courier.status === "none" || state.courier.status === "setup" || state.courier.status === "rejected" ? "/courier-setup/details" : "/courier/home") as Href} />;
  if (state.profile.role === "seller") return <Redirect href={(state.seller.setupDone ? "/seller/home" : "/seller-setup/welcome") as Href} />;

  return (
    <TabChromeProvider>
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />
      <Tabs.Screen name="activity" options={{ title: "Activity" }} />
      <Tabs.Screen name="cart" options={{ title: "Cart" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
    <OfflineBanner />
    <OrderSimulator />
    <NotificationBanner />
    </TabChromeProvider>
  );
}
