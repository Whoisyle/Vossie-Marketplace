import { Lora_600SemiBold } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { type Href, Redirect, usePathname } from "expo-router";
import { Tabs } from "expo-router/tabs";

import { OfflineBanner } from "@/components";
import { activeNow, offeredJobs } from "@/courier/selectors";
import { SellerReviewGate } from "@/screens/seller/SellerReviewGate";
import { CourierChromeProvider, CourierFrame, CourierTabBar, TABS } from "@/screens/courier/ui";
import { useDemoStore } from "@/state/DemoStore";

/** The courier app: a teal frame, a white sheet and five tabs. Behind a review screen until Vossie Operations approves the courier. */
export default function CourierLayout() {
  useFonts({ Lora_600SemiBold });
  const { dispatch, state } = useDemoStore();
  const path = usePathname();
  const courier = state.courier;
  if (!state.profile) return <Redirect href="/sign-in" />;
  if (state.profile.role !== "courier") return <Redirect href="/home" />;
  if (courier.status === "none" || courier.status === "setup" || courier.status === "rejected") return <Redirect href={"/courier-setup/details" as Href} />;

  const gate = courier.status === "pending" ? "review" : courier.status === "approved" && !courier.approvalSeen ? "verified" : "none";
  const showGate = gate !== "none" && !(gate === "review" && path.startsWith("/courier/account/support"));
  const badges = { active: activeNow(courier).length, jobs: courier.online ? offeredJobs(courier).length : 0 };

  return (
    <CourierChromeProvider>
      {(hidden) => (
        <>
          <CourierFrame>
            <Tabs
              backBehavior="history"
              screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#FFFFFF" } }}
              tabBar={(props) => <CourierTabBar activeIndex={props.state.index} badges={badges} hidden={hidden} onGo={(name) => props.navigation.navigate(name)} />}
            >
              {TABS.map((tab) => (
                <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
              ))}
            </Tabs>
          </CourierFrame>
          <OfflineBanner />
          {showGate ? <SellerReviewGate kind="courier" onContinue={() => dispatch({ type: "courierApprovalSeen" })} phase={gate === "verified" ? "verified" : "review"} storeName={courier.profile.fullName.split(" ")[0] || "Courier"} supportHref="/courier/account/support" /> : null}
        </>
      )}
    </CourierChromeProvider>
  );
}
