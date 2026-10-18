import { Redirect } from "expo-router";
import { Tabs } from "expo-router/tabs";

import { TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import { useDemoStore } from "@/state/DemoStore";

export default function TabsLayout() {
  const { state } = useDemoStore();
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.isNewUser) return <Redirect href="/profile-setup" />;

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
    </TabChromeProvider>
  );
}
