import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { DEMO_RIDE_MS, rideFraction, TrackOrderScreen } from "./activity/TrackOrderScreen";
import { AddressPickerScreen } from "./cart/AddressPickerScreen";
import { StorefrontScreen } from "./store/StorefrontScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { id: string } = { id: "order-1001" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/activity",
  useRouter: () => ({ back: mockBack, canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: jest.fn() }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockParams = { id: "order-1001" };
});

describe("rideFraction", () => {
  it("runs from 0 to 1 and stops there", () => {
    expect(rideFraction(0)).toBe(0);
    expect(rideFraction(DEMO_RIDE_MS / 2)).toBe(0.5);
    expect(rideFraction(DEMO_RIDE_MS * 3)).toBe(1);
  });
});

describe("Track order", () => {
  it("shows the map, the courier, the minutes left and the demo note for an order on the way", () => {
    renderWithProviders(<TrackOrderScreen />, signedIn());
    expect(screen.getByTestId("track-map")).toBeTruthy();
    expect(screen.getByText(/min away/)).toBeTruthy();
    expect(screen.getByText("Linda M.")).toBeTruthy();
    expect(screen.getByText(/courier position is simulated/)).toBeTruthy();
  });

  it("opens a chat with the courier", () => {
    renderWithProviders(<TrackOrderScreen />, signedIn());
    fireEvent.press(screen.getByText("Chat"));
    expect(mockPush).toHaveBeenCalledWith("/account/inbox/courier-order-1001");
  });

  it("says the courier has arrived once the ride is over", () => {
    jest.useFakeTimers();
    renderWithProviders(<TrackOrderScreen />, signedIn());
    act(() => {
      jest.advanceTimersByTime(DEMO_RIDE_MS + 2_000);
    });
    expect(screen.getByText("Your courier has arrived")).toBeTruthy();
    jest.useRealTimers();
  });

  it("handles an order that does not exist", () => {
    mockParams = { id: "nope" };
    renderWithProviders(<TrackOrderScreen />, signedIn());
    expect(screen.getByText("Order not found")).toBeTruthy();
  });
});

describe("Address picker", () => {
  it("names the pin, lets a campus spot be chosen and saves the address with its point", () => {
    renderWithProviders(<AddressPickerScreen />, signedIn());
    expect(screen.getByTestId("address-map")).toBeTruthy();
    fireEvent.press(screen.getByText("Library"));
    expect(screen.getAllByText("Library").length).toBeGreaterThan(1);
    fireEvent.changeText(screen.getByLabelText("Room, building or notes (optional)"), "Desk 4");
    fireEvent.press(screen.getByTestId("confirm-address"));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe("Store location", () => {
  it("shows where to find the store", () => {
    mockParams = { id: "campusbites" };
    renderWithProviders(<StorefrontScreen />, signedIn());
    expect(screen.getByTestId("store-map")).toBeTruthy();
    expect(screen.getByText(/Find us:/)).toBeTruthy();
  });
});
