import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import type { ComponentProps } from "react";

import { TabBar, TABS } from "../TabBar";
import { TabChromeProvider } from "./TabChrome";

function props(index: number, navigate = jest.fn()): ComponentProps<typeof TabBar> {
  return {
    insets: { bottom: 34, left: 0, right: 0, top: 0 },
    navigation: { emit: () => ({ defaultPrevented: false }), navigate },
    state: { index, routes: TABS.map((tab) => ({ key: tab.name, name: tab.name })) },
  } as never;
}

describe("floating tab bar", () => {
  it("shows all six destinations and marks the current one", () => {
    renderWithProviders(
      <TabChromeProvider>
        <TabBar {...props(2)} />
      </TabChromeProvider>,
    );
    for (const tab of TABS) expect(screen.getByTestId(`tab-${tab.name}`)).toBeTruthy();
    expect(screen.getByTestId("tab-reels").props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId("tab-home").props.accessibilityState.selected).toBe(false);
  });

  it("navigates when another tab is pressed", () => {
    const navigate = jest.fn();
    renderWithProviders(
      <TabChromeProvider>
        <TabBar {...props(0, navigate)} />
      </TabChromeProvider>,
    );
    fireEvent.press(screen.getByTestId("tab-explore"));
    expect(navigate).toHaveBeenCalledWith("explore", undefined);
  });
});
