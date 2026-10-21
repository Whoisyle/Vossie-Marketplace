import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";

import { useDemoStore } from "@/state/DemoStore";

/** The stack inside each courier tab, so a detail page opens over its list inside the white sheet. */
export function CourierStack() {
  return <Stack screenOptions={{ animation: "slide_from_right", contentStyle: { backgroundColor: "#FFFFFF" }, headerShown: false }} />;
}

/** The stack for the setup pages. Needs a signed-in student. */
export function CourierSetupStack() {
  const { state } = useDemoStore();
  if (!state.profile) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ animation: "slide_from_right", contentStyle: { backgroundColor: "#FFFFFF" }, gestureEnabled: true, headerShown: false }} />;
}
