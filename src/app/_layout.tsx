import { Stack } from "expo-router/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ToastProvider } from "@/components";
import { liveBackend } from "@/backend/mode";
import { SellerDemoEffects } from "@/screens/seller/SellerDemoEffects";
import { SellerLiveSync } from "@/screens/seller/SellerLiveSync";
import { DemoStoreProvider } from "@/state/DemoStore";
import { color } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <DemoStoreProvider>
      <ToastProvider>
        <SellerDemoEffects enabled={!liveBackend} />
        <SellerLiveSync />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: color.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" options={{ autoHideHomeIndicator: true }} />
          <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
          <Stack.Screen name="verified" options={{ gestureEnabled: false, title: "Verified" }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, title: "Make Vossie yours" }} />
          <Stack.Screen name="profile-setup" options={{ gestureEnabled: false, title: "Set up your profile" }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="seller-setup" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="seller" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack>
      </ToastProvider>
    </DemoStoreProvider>
    </GestureHandlerRootView>
  );
}
