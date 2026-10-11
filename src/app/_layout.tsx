import { Stack } from "expo-router/stack";

import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ title: "Vossie Marketplace" }} />
      <Stack.Screen name="foundation" options={{ title: "Foundation" }} />
    </Stack>
  );
}
