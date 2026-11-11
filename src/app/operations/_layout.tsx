import { Tabs } from "expo-router/tabs";

import { OfflineBanner, TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import { OPERATIONS_TABS } from "@/screens/operations/OperationsScreens";

/** Vossie Operations, the staff side: Campus Hub, Transfers, Incubation and the activity log. A demo until staff accounts exist. */
export default function OperationsLayout() {
  return (
    <TabChromeProvider>
      <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} fixed neo tabs={OPERATIONS_TABS} />}>
        {OPERATIONS_TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
        ))}
      </Tabs>
      <OfflineBanner />
    </TabChromeProvider>
  );
}
