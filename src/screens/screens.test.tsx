import { fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { AccountScreen } from "./account/AccountScreen";
import { HelpScreen } from "./account/HelpScreen";
import { InboxScreen } from "./account/InboxScreen";
import { SecurityScreen } from "./account/SecurityScreen";
import { WalletScreen } from "./account/WalletScreen";
import { ActivityScreen } from "./activity/ActivityScreen";
import { MyOrdersScreen } from "./activity/MyOrdersScreen";
import { CartScreen } from "./cart/CartScreen";
import { CheckoutScreen } from "./cart/CheckoutScreen";
import { ConfirmationScreen } from "./cart/ConfirmationScreen";
import { ExploreScreen } from "./explore/ExploreScreen";
import { HomeScreen } from "./home/HomeScreen";
import { ListingDetailScreen } from "./listing/ListingDetailScreen";
import { ReelsScreen } from "./reels/ReelsScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  usePathname: () => "/home",
  useLocalSearchParams: () => ({ id: "burger-chips" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => true,
    navigate: jest.fn(),
    push: mockPush,
    replace: mockReplace,
  }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

function withCart(): DemoState {
  return demoReducer(signedIn(), { listingId: "burger-chips", optionId: "large", quantity: 2, type: "addToCart" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe("tab screens render for a signed-in user", () => {
  const cases: [string, React.ReactElement][] = [
    ["Home", <HomeScreen key="home" />],
    ["Explore", <ExploreScreen key="explore" />],
    ["Activity", <ActivityScreen key="activity" />],
    ["My Orders", <MyOrdersScreen key="orders" />],
    ["Cart", <CartScreen key="cart" />],
    ["Account", <AccountScreen key="account" />],
    ["Wallet", <WalletScreen key="wallet" />],
    ["Inbox", <InboxScreen key="inbox" />],
    ["Security", <SecurityScreen key="security" />],
    ["Help", <HelpScreen key="help" />],
    ["Reels", <ReelsScreen key="reels" />],
  ];

  it.each(cases)("%s", (_name, element) => {
    renderWithProviders(element, signedIn());
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe("shopping flow", () => {
  it("opens a listing from Home", () => {
    renderWithProviders(<HomeScreen />, signedIn());
    fireEvent.press(screen.getAllByTestId("listing-card-burger-chips")[0]!);
    expect(mockPush).toHaveBeenCalledWith("/home/listing/burger-chips");
  });

  it("adds the chosen option and quantity to the cart", () => {
    renderWithProviders(<ListingDetailScreen />, signedIn());
    fireEvent.press(screen.getByLabelText("Increase quantity"));
    fireEvent.press(screen.getByTestId("add-to-cart"));
    expect(screen.getByText(/2 × Burger & Chips added to cart/)).toBeTruthy();
  });

  it("shows the empty cart and the cart total", () => {
    renderWithProviders(<CartScreen />, signedIn());
    expect(screen.getByText("Your cart is empty")).toBeTruthy();
    renderWithProviders(<CartScreen />, withCart());
    expect(screen.getByText("Burger & Chips")).toBeTruthy();
    expect(screen.getByText(/Checkout · R 120/)).toBeTruthy();
  });

  it("validates a voucher and then places the order", () => {
    renderWithProviders(<CheckoutScreen />, withCart());
    fireEvent.changeText(screen.getByLabelText("Voucher code"), "nope");
    fireEvent.press(screen.getByText("Apply"));
    expect(screen.getByText("That code isn't valid.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Voucher code"), "welcome20");
    fireEvent.press(screen.getByText("Apply"));
    expect(screen.getByText(/WELCOME20/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("pay-now"));
    expect(mockReplace).toHaveBeenCalledWith("/cart/confirmation");
  });

  it("shows the receipt after an order is placed", () => {
    const placed = demoReducer(withCart(), { type: "placeOrder" });
    renderWithProviders(<ConfirmationScreen />, placed);
    expect(screen.getByText(/Thank you/)).toBeTruthy();
    expect(screen.getByText("Order details")).toBeTruthy();
  });
});
