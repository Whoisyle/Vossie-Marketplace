import { EFT_AUTHORISE_MS, EFT_DONE_MS, EFT_REDIRECT_MS } from "./cart/EftPay";
import { TAP_DONE_MS, TAP_HOLD_MS, TAP_VERIFY_MS } from "./cart/TapToPay";
import { act, fireEvent, screen } from "@testing-library/react-native";

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
import { arrivalText, ConfirmationScreen, receiptText } from "./cart/ConfirmationScreen";
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
    expect(screen.getByText(/Checkout · R 96/)).toBeTruthy();
  });

  it("validates a voucher and then places the order", () => {
    renderWithProviders(<CheckoutScreen />, withCart());
    fireEvent.changeText(screen.getByLabelText("Voucher code"), "nope");
    fireEvent.press(screen.getByText("Apply"));
    expect(screen.getByText("That code isn't valid.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Voucher code"), "welcome20");
    fireEvent.press(screen.getByText("Apply"));
    expect(screen.getByText(/WELCOME20/)).toBeTruthy();
    jest.useFakeTimers();
    fireEvent.press(screen.getByTestId("pay-now"));
    // Apple Pay is the default method: its sheet opens, the side button is double-clicked, the phone is held to the reader
    expect(screen.getByTestId("apple-pay-sheet")).toBeTruthy();
    fireEvent.press(screen.getByTestId("apple-confirm"));
    expect(screen.getByTestId("apple-pay-faceid")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(TAP_VERIFY_MS + 50); });
    expect(screen.getByText("Hold Here to Pay")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(TAP_HOLD_MS + 50); });
    expect(screen.getByText("Done")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(TAP_DONE_MS + 50); });
    expect(screen.getByText("Processing payment…")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1400); });
    expect(screen.getByText("Payment successful")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(mockReplace).toHaveBeenCalledWith("/cart/confirmation");
    jest.useRealTimers();
  });

  it("pays by instant EFT: the bank signs the student in, they approve, and the order goes through", () => {
    const eft = demoReducer(demoReducer(withCart(), { payment: "eft", type: "setPayment" }), { bank: "Nedbank", payment: "eft", type: "setPayment" });
    renderWithProviders(<CheckoutScreen />, eft);
    jest.useFakeTimers();
    fireEvent.press(screen.getByTestId("pay-now"));
    expect(screen.getByTestId("eft-redirect")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(EFT_REDIRECT_MS + 50); });
    expect(screen.getByTestId("eft-login")).toBeTruthy();
    fireEvent.press(screen.getByTestId("eft-signin"));
    expect(screen.getByTestId("eft-approve")).toBeTruthy();
    expect(screen.getByTestId("eft-reference").props.children).toMatch(/^VOS\d{8}$/);
    fireEvent.press(screen.getByTestId("eft-approve-button"));
    expect(screen.getByTestId("eft-authorising")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(EFT_AUTHORISE_MS + 50); });
    expect(screen.getByTestId("eft-done")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(EFT_DONE_MS + 50); });
    expect(screen.getByText("Processing payment…")).toBeTruthy();
    act(() => { jest.advanceTimersByTime(1400); });
    expect(screen.getByText("Payment successful")).toBeTruthy();
    jest.useRealTimers();
  });

  it("stops an instant EFT the student declines at their bank", () => {
    const eft = demoReducer(withCart(), { bank: "Capitec", payment: "eft", type: "setPayment" });
    renderWithProviders(<CheckoutScreen />, eft);
    jest.useFakeTimers();
    fireEvent.press(screen.getByTestId("pay-now"));
    act(() => { jest.advanceTimersByTime(EFT_REDIRECT_MS + 50); });
    fireEvent.press(screen.getByTestId("eft-signin"));
    fireEvent.press(screen.getByTestId("eft-decline"));
    expect(screen.getByText(/declined the payment at Capitec/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("fails the payment, with a reason, when the wallet cannot cover the total", () => {
    const poor = { ...withCart(), wallet: { balanceCents: 100, transactions: [] } };
    renderWithProviders(<CheckoutScreen />, demoReducer(poor, { payment: "wallet", type: "setPayment" }));
    jest.useFakeTimers();
    fireEvent.press(screen.getByTestId("pay-now"));
    act(() => { jest.advanceTimersByTime(1400); });
    expect(screen.getByText("Payment failed, tap to retry")).toBeTruthy();
    expect(screen.getByText(/wallet balance is too low/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("shows the receipt after an order is placed", () => {
    const placed = demoReducer(withCart(), { type: "placeOrder" });
    renderWithProviders(<ConfirmationScreen />, placed);
    expect(screen.getByText(/Thank you/)).toBeTruthy();
    expect(screen.getByTestId("receipt-paper")).toBeTruthy();
    expect(screen.getByText("Payment received")).toBeTruthy();
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText("Burger & Chips", { exact: false })).toBeTruthy();
    expect(screen.getByText(/You'll earn \d+ Vossie points? when your order is delivered/)).toBeTruthy();
    expect(screen.getByTestId("track-order-cta")).toBeTruthy();
  });

  it("builds a plain-text receipt for sharing", () => {
    const placed = demoReducer(withCart(), { type: "placeOrder" });
    const orders = placed.orders.filter((order) => placed.lastReceipt!.orderIds.includes(order.id));
    const text = receiptText({ number: placed.lastReceipt!.number, orders, paidWith: "Apple Pay", placedAt: placed.lastReceipt!.placedAt, totalCents: placed.lastReceipt!.totalCents });
    expect(text).toContain(`Vossie receipt ${placed.lastReceipt!.number}`);
    expect(text).toContain("Burger & Chips");
    expect(text).toContain("paid with Apple Pay");
    expect(arrivalText({ deliveryMode: "hub-to-hub", fulfilment: "collection" })).toMatch(/1 to 2 days/);
    expect(arrivalText({ deliveryMode: "campus-courier", etaMinutes: 60, fulfilment: "delivery" })).toBe("About 60 min");
  });
});
