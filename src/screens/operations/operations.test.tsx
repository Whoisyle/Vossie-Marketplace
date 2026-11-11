import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import { OperationsHubScreen, OperationsIncubationScreen, OperationsLogScreen, OperationsTransfersScreen } from "./OperationsScreens";

jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useFocusEffect: jest.fn(), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));

describe("Vossie Operations demo screens", () => {
  it("shows the Campus Hub items and lets staff hand one over", () => {
    renderWithProviders(<OperationsHubScreen />);
    expect(screen.getByText("Campus Hub")).toBeTruthy();
    expect(screen.getByTestId("hub-item-h2")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Hand over, code 7305"));
    expect(screen.queryByLabelText("Hand over, code 7305")).toBeNull();
  });

  it("filters transfers by stage", () => {
    renderWithProviders(<OperationsTransfersScreen />);
    expect(screen.getByTestId("transfer-t1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("transfer-issue"));
    expect(screen.getByTestId("transfer-t5")).toBeTruthy();
    expect(screen.queryByTestId("transfer-t1")).toBeNull();
  });

  it("lists the incubation businesses", () => {
    renderWithProviders(<OperationsIncubationScreen />);
    expect(screen.getByText("Kamo Threads")).toBeTruthy();
    expect(screen.getByText("Print and Go")).toBeTruthy();
  });

  it("filters the activity log by kind", () => {
    renderWithProviders(<OperationsLogScreen />);
    expect(screen.getByTestId("log-l1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("log-system"));
    expect(screen.getByTestId("log-l6")).toBeTruthy();
    expect(screen.queryByTestId("log-l1")).toBeNull();
  });
});
