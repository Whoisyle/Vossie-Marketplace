import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";

import { useDemoStore } from "@/state/DemoStore";

import { SELLER } from "./ui";

/** The stack inside each seller tab, so a detail page opens over its list and the tab bar stays. Backed by the seller background colour. */
export function SellerStack() {
  return <Stack screenOptions={{ animation: "slide_from_right", contentStyle: { backgroundColor: SELLER.bgBottom }, headerShown: false }} />;
}

/** The stack for the setup pages (welcome and the three steps). Needs a signed-in student. */
export function SellerSetupStack() {
  const { state } = useDemoStore();
  if (!state.profile) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ animation: "slide_from_right", contentStyle: { backgroundColor: SELLER.bgBottom }, gestureEnabled: true, headerShown: false }} />;
}
