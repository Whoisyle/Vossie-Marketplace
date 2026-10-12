import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Stack } from "expo-router/stack";
import { router } from "expo-router";

import { colors } from "@/theme";

export default function RootLayout() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const wasBackgrounded = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appState.current;
      appState.current = nextState;

      if (nextState === "background") {
        wasBackgrounded.current = true;
        return;
      }

      if (nextState === "active" && wasBackgrounded.current && previousState === "background") {
        wasBackgrounded.current = false;
        router.replace("/");
      }
    });

    return () => subscription.remove();
  }, []);

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
    </Stack>
  );
}
