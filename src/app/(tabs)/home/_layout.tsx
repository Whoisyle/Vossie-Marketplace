import { Stack } from "expo-router/stack";

import { color } from "@/theme/tokens";

export default function TabStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: color.background },
        headerShown: false,
      }}
    />
  );
}
