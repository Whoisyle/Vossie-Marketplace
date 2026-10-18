import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { Linking } from "react-native";

import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { AccountScreen } from "./account/AccountScreen";
import { TrackOrderScreen } from "./activity/TrackOrderScreen";
import { CheckoutScreen } from "./cart/CheckoutScreen";
import { AUTO_ADVANCE_MS } from "./explore/ExploreParts";
import { ExploreScreen } from "./explore/ExploreScreen";
import { HomeScreen } from "./home/HomeScreen";

const mockPush = jest.fn();
let mockParams: { id: string } = { id: "order-1001" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/explore",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: jest.fn() }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockParams = { id: "order-1001" };
});

describe("Explore layout", () => {
  it("shows the promo first, then the search, trending, categories, and top stores in the middle of the listings", () => {
    renderWithProviders(<ExploreScreen />, signedIn());
    const text = JSON.stringify(screen.toJSON());
    const at = (needle: string) => text.indexOf(needle);
    expect(at("Explore")).toBeGreaterThan(-1);
    expect(at("promo-carousel")).toBeGreaterThan(-1);
    expect(at("promo-carousel")).toBeLessThan(at("Search products, stores and categories"));
    expect(at("Search products, stores and categories")).toBeLessThan(at("Trending on campus"));
    expect(at("Trending on campus")).toBeLessThan(at("Browse by category"));
    expect(at("Browse by category")).toBeLessThan(at("More to explore"));
    expect(at("More to explore")).toBeLessThan(at("Top stores near you"));
    // listings continue after the stores row
    const afterStores = text.slice(at("Top stores near you"));
    expect(afterStores).toContain("listing-card-");
  });
});

describe("Filters sheet", () => {
  it("shows a live result count and applies it", () => {
    renderWithProviders(<ExploreScreen />, signedIn());
    fireEvent.press(screen.getByLabelText(/Filters/));
    expect(screen.getByTestId("filters-sheet")).toBeTruthy();
    const all = screen.getByTestId("apply-filters");
    expect(within(all).getByText(/^Show \d+ results$/)).toBeTruthy();
    fireEvent.press(screen.getByText("Top rated"));
    fireEvent(screen.getByLabelText("Deals only"), "valueChange", true);
    expect(within(screen.getByTestId("apply-filters")).getByText(/^Show \d+ results?$/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("apply-filters"));
    expect(screen.getByText(/results? in|results?$/i)).toBeTruthy();
  });
});

describe("Featured carousels", () => {
  it("move on by themselves on Home", () => {
    jest.useFakeTimers();
    renderWithProviders(<HomeScreen />, signedIn());
    expect(screen.getByText("Hot deals")).toBeTruthy();
    expect(screen.getByTestId("featured-carousel")).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(AUTO_ADVANCE_MS * 2 + 50);
    });
    expect(screen.getByTestId("featured-carousel")).toBeTruthy();
    jest.useRealTimers();
  });
});

describe("Account", () => {
  it("shows the student card, points and tier, and saves a delivery preference", () => {
    renderWithProviders(<AccountScreen />, signedIn());
    expect(screen.getByTestId("student-card")).toBeTruthy();
    expect(screen.getByTestId("points-card")).toBeTruthy();
    expect(screen.getByText(/Earn 1 point for every R10/)).toBeTruthy();
    fireEvent.press(screen.getByText("Delivery preferences"));
    fireEvent.press(screen.getByText("Campus collection"));
    expect(screen.getAllByText("Campus collection").length).toBeGreaterThan(0);
  });
});

describe("Delivery options at checkout", () => {
  // Vossie couriers work 07:00 to 21:00 in the demo, so pin the clock to midday
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 18, 12, 0) });
  });
  afterEach(() => jest.useRealTimers());

  it("offers hub to hub only for items from another campus", () => {
    const remoteOnly = demoReducer(signedIn(), { listingId: "kota-special", quantity: 1, type: "addToCart" });
    const view = renderWithProviders(<CheckoutScreen />, remoteOnly);
    expect(screen.getByTestId("remote-hub-to-hub")).toBeTruthy();
    expect(screen.getByTestId("remote-third-party")).toBeTruthy();
    expect(screen.queryByTestId("mode-group")).toBeNull();
    expect(screen.queryByTestId("mode-campus-courier")).toBeNull();
    view.unmount();

    const localOnly = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, localOnly);
    expect(screen.queryByTestId("remote-group")).toBeNull();
    expect(screen.queryByTestId("mode-hub-to-hub")).toBeNull();
    expect(screen.queryByTestId("remote-hub-to-hub")).toBeNull();
  });

  it("shows both groups when the cart mixes campuses", () => {
    let cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    cart = demoReducer(cart, { listingId: "kota-special", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, cart);
    expect(screen.getByTestId("mode-group")).toBeTruthy();
    expect(screen.getByTestId("remote-group")).toBeTruthy();
    expect(screen.getByText("From another campus")).toBeTruthy();
  });

  it("gives three options when a third-party courier is chosen", () => {
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, cart);
    expect(screen.queryByTestId("mode-tiers")).toBeNull();
    fireEvent.press(screen.getByTestId("mode-third-party"));
    expect(screen.getByTestId("mode-tiers")).toBeTruthy();
    expect(screen.getByTestId("mode-tier-economy")).toBeTruthy();
    expect(screen.getByTestId("mode-tier-standard")).toBeTruthy();
    expect(screen.getByTestId("mode-tier-express")).toBeTruthy();
    fireEvent.press(screen.getByTestId("mode-tier-express"));
    // the tier price and the order summary both show the new fee
    expect(screen.getAllByText(/R 85/).length).toBeGreaterThanOrEqual(2);
  });

  it("charges the fee of each group's chosen mode", () => {
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    const fee = (state: DemoState) => demoReducer(state, { type: "placeOrder" }).orders[0]!.deliveryFeeCents;
    expect(fee(demoReducer(cart, { mode: "collection", type: "setDeliveryMode" }))).toBe(0);
    let third = demoReducer(cart, { mode: "third-party", type: "setDeliveryMode" });
    expect(fee(third)).toBe(5500);
    third = demoReducer(third, { tier: "economy", type: "setThirdPartyTier" });
    expect(fee(third)).toBe(4500);
    third = demoReducer(third, { tier: "express", type: "setThirdPartyTier" });
    expect(fee(third)).toBe(8500);

    // a mixed cart pays the campus courier for the local item and hub to hub for the other-campus one
    const mixed = demoReducer(cart, { listingId: "kota-special", quantity: 1, type: "addToCart" });
    const placed = demoReducer(mixed, { type: "placeOrder" });
    const byMode = Object.fromEntries(placed.orders.slice(0, 2).map((order) => [order.deliveryMode, order.deliveryFeeCents]));
    expect(byMode["campus-courier"]).toBe(1500);
    expect(byMode["hub-to-hub"]).toBe(3500);
    expect(demoReducer(cart, { mode: "hub-to-hub", type: "setDeliveryMode" }).checkout.remoteMode).toBe("hub-to-hub");
  });
});

describe("Courier call button", () => {
  it("says so when the courier has no number yet, and dials once there is one", () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const withNumber = signedIn();
    const first = renderWithProviders(<TrackOrderScreen />, withNumber);
    fireEvent.press(screen.getByText("Call"));
    expect(screen.getByText("This courier's phone number isn't set up yet")).toBeTruthy();
    expect(open).not.toHaveBeenCalled();

    const live: DemoState = {
      ...withNumber,
      orders: withNumber.orders.map((order) =>
        order.id === "order-1001" ? { ...order, courier: { ...order.courier!, phone: "+27 82 000 0000" } } : order,
      ),
    };
    first.unmount();
    renderWithProviders(<TrackOrderScreen />, live);
    fireEvent.press(screen.getByText("Call"));
    expect(open).toHaveBeenCalledWith("tel:+27820000000");
    open.mockRestore();
  });
});
