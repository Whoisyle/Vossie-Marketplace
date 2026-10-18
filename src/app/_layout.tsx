import { Stack } from "expo-router/stack";

import { ToastProvider } from "@/components";
import { DemoStoreProvider } from "@/state/DemoStore";
import { color } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <DemoStoreProvider>
      <ToastProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: color.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" options={{ autoHideHomeIndicator: true }} />
          <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
          <Stack.Screen name="verified" options={{ gestureEnabled: false, title: "Verified" }} />
          <Stack.Screen name="profile-setup" options={{ gestureEnabled: false, title: "Set up your profile" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack>
      </ToastProvider>
    </DemoStoreProvider>
  );
}
