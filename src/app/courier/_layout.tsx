import { type Href, Redirect, usePathname } from "expo-router";
import { Tabs } from "expo-router/tabs";

import { OfflineBanner, TabBar } from "@/components";
import { TabChromeProvider } from "@/components/nav/TabChrome";
import { activeNow, visibleOffers } from "@/courier/selectors";
import { CourierPushBanner } from "@/screens/courier/CourierPush";
import { COURIER_TABS } from "@/screens/courier/ui";
import { SellerReviewGate } from "@/screens/seller/SellerReviewGate";
import { useDemoStore } from "@/state/DemoStore";

/** The courier app: five tabs in the seller's floating bar. Behind a review screen until Vossie Operations approves the courier. */
export default function CourierLayout() {
  const { dispatch, state } = useDemoStore();
  const path = usePathname();
  const courier = state.courier;
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.profile.role !== "courier") return <Redirect href="/home" />;
  if (courier.status === "none" || courier.status === "setup" || courier.status === "rejected") return <Redirect href={"/courier-setup/welcome" as Href} />;

  const gate = courier.status === "pending" ? "review" : courier.status === "approved" && !courier.approvalSeen ? "verified" : "none";
  const showGate = gate !== "none" && !(gate === "review" && path.startsWith("/courier/account/support"));
  const badges = { active: activeNow(courier).length, jobs: visibleOffers(courier).length };

  return (
    <TabChromeProvider>
      <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} badges={badges} fixed neo tabs={COURIER_TABS} />}>
        {COURIER_TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
        ))}
      </Tabs>
      <CourierPushBanner />
      <OfflineBanner />
      {showGate ? <SellerReviewGate kind="courier" onContinue={() => dispatch({ type: "courierApprovalSeen" })} phase={gate === "verified" ? "verified" : "review"} storeName={courier.profile.fullName.split(" ")[0] || "Courier"} supportHref="/courier/account/support" /> : null}
    </TabChromeProvider>
  );
}
