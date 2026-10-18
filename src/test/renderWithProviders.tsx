import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/Toast";
import { DemoStoreProvider } from "@/state/DemoStore";
import type { DemoState } from "@/state/demoReducer";

const metrics = {
  frame: { height: 852, width: 393, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 59 },
};

export function renderWithProviders(ui: ReactElement, initialState?: DemoState) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <DemoStoreProvider initialState={initialState}>
        <ToastProvider>{ui}</ToastProvider>
      </DemoStoreProvider>
    </SafeAreaProvider>,
  );
}
