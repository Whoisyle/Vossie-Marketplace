import { act, fireEvent, renderHook, screen } from "@testing-library/react-native";

import { OfflineBanner } from "@/components";
import { resetFirstLoads, useFirstLoad } from "@/components/Skeleton";
import { pointsBalance } from "@/data/points";
import { hideBlocked, referralCodeFor } from "@/data/phase4";
import { getListings } from "@/data/repository";
import { confirmWithBiometrics } from "@/lib/biometric";
import { playSound, setSoundsEnabled, soundsEnabled } from "@/lib/sounds";
import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { PointsScreen } from "./account/PointsScreen";
import { ReferralScreen } from "./account/ReferralScreen";
import { VouchersScreen } from "./account/VouchersScreen";
import { TrackOrderScreen, DEMO_RIDE_MS, trackingLink } from "./activity/TrackOrderScreen";
import { arrivalText } from "./cart/ConfirmationScreen";
import { CheckoutScreen, slotLabel } from "./cart/CheckoutScreen";
import { ListingDetailScreen } from "./listing/ListingDetailScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { id: string } = { id: "order-1001" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/home",
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

describe("Vossie Points", () => {
  it("redeems points into wallet credit and keeps a history", () => {
    const state = signedIn();
    const balance = pointsBalance(state.orders, state.pointsLedger);
    const after = demoReducer(state, { points: 100, type: "redeemPoints" });
    expect(pointsBalance(after.orders, after.pointsLedger)).toBe(balance - 100);
    expect(after.wallet.balanceCents).toBe(state.wallet.balanceCents + 1000);
    expect(after.pointsLedger[0]).toMatchObject({ points: -100 });
    // not enough points, or not a valid step: nothing happens
    expect(demoReducer(state, { points: balance + 1, type: "redeemPoints" })).toBe(state);
    expect(demoReducer(state, { points: 50, type: "redeemPoints" })).toBe(state);
  });

  it("shows the ring, redeem options and history", () => {
    renderWithProviders(<PointsScreen />, signedIn());
    expect(screen.getByTestId("points-screen")).toBeTruthy();
    expect(screen.getByText("points")).toBeTruthy();
    expect(screen.getByText("Redeem for wallet credit")).toBeTruthy();
    expect(screen.getAllByText(/Order #\d+ delivered/).length).toBeGreaterThan(0);
    expect(screen.getByText("Welcome bonus (demo)")).toBeTruthy();
  });

  it("redeems from the screen when the balance allows", async () => {
    const rich = signedIn();
    renderWithProviders(<PointsScreen />, rich);
    const balance = pointsBalance(rich.orders, rich.pointsLedger);
    expect(balance).toBeGreaterThanOrEqual(100);
    await act(async () => {
      fireEvent.press(screen.getByTestId("redeem-100"));
    });
    expect(screen.getByText("R 10 added to your wallet")).toBeTruthy();
  });
});

describe("Delivery, courier rating and tips", () => {
  it("awards points when an order is delivered, once", () => {
    const state = signedIn();
    const before = pointsBalance(state.orders);
    const delivered = demoReducer(state, { orderId: "order-1001", type: "deliverOrder" });
    expect(delivered.orders.find((order) => order.id === "order-1001")!.status).toBe("delivered");
    expect(pointsBalance(delivered.orders)).toBeGreaterThan(before);
    expect(demoReducer(delivered, { orderId: "order-1001", type: "deliverOrder" })).toBe(delivered);
  });

  it("records a rating and tip once, and takes a wallet tip from the wallet", () => {
    let state = demoReducer(signedIn(), { orderId: "order-1001", type: "deliverOrder" });
    state = { ...state, orders: state.orders.map((order) => (order.id === "order-1001" ? { ...order, paymentMethod: "wallet" as const } : order)) };
    const rated = demoReducer(state, { orderId: "order-1001", rating: 5, tipCents: 1000, type: "rateCourier" });
    const order = rated.orders.find((item) => item.id === "order-1001")!;
    expect(order).toMatchObject({ courierRating: 5, tipCents: 1000 });
    expect(rated.wallet.balanceCents).toBe(state.wallet.balanceCents - 1000);
    expect(demoReducer(rated, { orderId: "order-1001", rating: 1, tipCents: 0, type: "rateCourier" })).toBe(rated);
    // an order that has not been delivered cannot be rated
    expect(demoReducer(signedIn(), { orderId: "order-1001", rating: 5, tipCents: 0, type: "rateCourier" }).orders.find((item) => item.id === "order-1001")!.courierRating).toBeUndefined();
  });

  it("lets the student mark it delivered, then rate and tip from the tracking screen", () => {
    jest.useFakeTimers();
    renderWithProviders(<TrackOrderScreen />, signedIn());
    act(() => {
      jest.advanceTimersByTime(DEMO_RIDE_MS + 1_000);
    });
    fireEvent.press(screen.getByTestId("mark-delivered"));
    fireEvent.press(screen.getByTestId("tip-1000"));
    expect(screen.getByText(/Send rating and R 10 tip/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("send-rating"));
    expect(screen.getByText("Tap a star to rate your courier.")).toBeTruthy();
    jest.useRealTimers();
  });

  it("builds a tracking link for the app", () => {
    expect(trackingLink("order-1001")).toBe("vossie://track/order-1001");
  });
});

describe("Referrals", () => {
  it("pays 200 points once, when the first order after a friend's code is delivered", () => {
    let state = demoReducer(signedIn(), { code: "kamo-1234", type: "applyReferral" });
    expect(state.referral.referredBy).toBe("KAMO-1234");
    state = demoReducer(state, { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    const placed = demoReducer(state, { type: "placeOrder" });
    expect(placed.referral.firstOrderId).toBe(placed.orders[0]!.id);
    expect(placed.referral.rewardPaid).toBe(false);
    const before = pointsBalance(placed.orders, placed.pointsLedger);
    const delivered = demoReducer(placed, { orderId: placed.orders[0]!.id, type: "deliverOrder" });
    expect(delivered.referral.rewardPaid).toBe(true);
    expect(pointsBalance(delivered.orders, delivered.pointsLedger)).toBeGreaterThanOrEqual(before + 200);
    expect(delivered.pointsLedger[0]!.label).toMatch(/Referral reward/);
    // a second order does not pay again
    const again = demoReducer(demoReducer(delivered, { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" }), { type: "placeOrder" });
    const second = demoReducer(again, { orderId: again.orders[0]!.id, type: "deliverOrder" });
    expect(second.pointsLedger.filter((entry) => /Referral reward/.test(entry.label))).toHaveLength(1);
  });

  it("ignores your own code and a second code", () => {
    const state = signedIn();
    const own = referralCodeFor(state.profile!.fullName, state.profile!.studentNumber);
    expect(demoReducer(state, { code: own, type: "applyReferral" }).referral.referredBy).toBeNull();
    const first = demoReducer(state, { code: "KAMO-1234", type: "applyReferral" });
    expect(demoReducer(first, { code: "LERA-9999", type: "applyReferral" }).referral.referredBy).toBe("KAMO-1234");
  });

  it("shows your code and checks a friend's code", () => {
    renderWithProviders(<ReferralScreen />, signedIn());
    expect(screen.getByText(/^[A-Z]{4}-\d{4}$/)).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Friend's code"), "nope");
    fireEvent.press(screen.getByTestId("apply-referral"));
    expect(screen.getByText("Codes look like VUMI-9530.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Friend's code"), "KAMO-1234");
    fireEvent.press(screen.getByTestId("apply-referral"));
    expect(screen.getByText("KAMO-1234")).toBeTruthy();
  });
});

describe("Vouchers", () => {
  it("lists active vouchers and shows the expired one apart", () => {
    renderWithProviders(<VouchersScreen />, signedIn());
    expect(screen.getByTestId("voucher-WELCOME20")).toBeTruthy();
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
    expect(screen.getByTestId("voucher-COFFEE5")).toBeTruthy();
  });

  it("only applies a voucher when the minimum spend is met", () => {
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    expect(demoReducer(cart, { code: "EXAM15", type: "applyVoucher" }).checkout.voucherCode).toBeNull();
    expect(demoReducer(cart, { code: "WELCOME20", type: "applyVoucher" }).checkout.voucherCode).toBe("WELCOME20");
  });

  it("applies a voucher in one tap at checkout", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 18, 12, 0) });
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, cart);
    fireEvent.press(screen.getByTestId("use-voucher-WELCOME20"));
    expect(screen.getByText(/WELCOME20/)).toBeTruthy();
    jest.useRealTimers();
  });
});

describe("Order for later", () => {
  it("stores the chosen slot, puts it on the order and clears it", () => {
    const slot = new Date(2026, 9, 19, 9, 0).toISOString();
    let state = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { iso: slot, type: "setScheduledFor" });
    const placed = demoReducer(state, { type: "placeOrder" });
    expect(placed.orders[0]!.scheduledFor).toBe(slot);
    expect(placed.orders[0]!.etaMinutes).toBeUndefined();
    expect(placed.checkout.scheduledFor).toBeNull();
    expect(arrivalText({ ...placed.orders[0]!, scheduledFor: slot })).toMatch(/^Scheduled for /);
  });

  it("labels today and tomorrow", () => {
    const now = new Date(2026, 9, 18, 10, 0);
    expect(slotLabel(new Date(2026, 9, 18, 14, 30).toISOString(), now)).toBe("Today 14:30");
    expect(slotLabel(new Date(2026, 9, 19, 9, 0).toISOString(), now)).toBe("Tomorrow 09:00");
  });

  it("picks a slot from the checkout sheet", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 18, 10, 10) });
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, cart);
    fireEvent.press(screen.getByTestId("when-later"));
    fireEvent.press(screen.getByTestId("slot-11:00"));
    expect(screen.getAllByText("Today 11:00").length).toBeGreaterThan(0);
    jest.useRealTimers();
  });
});

describe("Alerts, stock, block and reorder", () => {
  it("fires a price-drop alert straight away on something already discounted", () => {
    const after = demoReducer(signedIn(), { kind: "price-drop", listingId: "burger-chips", type: "toggleAlert" });
    expect(after.alerts).toHaveLength(1);
    expect(after.notifications[0]!.title).toBe("Price drop");
    const off = demoReducer(after, { kind: "price-drop", listingId: "burger-chips", type: "toggleAlert" });
    expect(off.alerts).toHaveLength(0);
  });

  it("shows sold-out items with a notify button", () => {
    mockParams = { id: "tablet-desk" };
    renderWithProviders(<ListingDetailScreen />, signedIn());
    expect(screen.getByText("Sold out right now")).toBeTruthy();
    expect(screen.queryByTestId("add-to-cart")).toBeNull();
    fireEvent.press(screen.getByTestId("notify-back-in-stock"));
    expect(screen.getByText("We'll tell you when it's back")).toBeTruthy();
  });

  it("blocks a seller and hides their listings", () => {
    mockParams = { id: "burger-chips" };
    const view = renderWithProviders(<ListingDetailScreen />, signedIn());
    fireEvent.press(screen.getByTestId("listing-more"));
    fireEvent.press(screen.getByTestId("block-seller"));
    expect(mockBack).toHaveBeenCalled();
    view.unmount();
    const state = demoReducer(signedIn(), { name: "CampusBites", type: "blockUser", userId: "seller-campusbites" });
    const visible = hideBlocked(getListings({}), state.blocked);
    expect(visible.some((listing) => listing.sellerId === "campusbites")).toBe(false);
    expect(visible.length).toBeGreaterThan(10);
  });

  it("adds a past order's items to the cart, skipping sold-out ones", () => {
    const state = demoReducer(signedIn(), { orderId: "order-0998", type: "reorder" });
    const lines = state.orders.find((order) => order.id === "order-0998")!.lines;
    expect(state.cart.length).toBeGreaterThan(0);
    expect(state.cart.length).toBeLessThanOrEqual(lines.length);
  });
});

describe("Skeleton, offline and phone features", () => {
  it("shows a skeleton on first load only", () => {
    jest.useFakeTimers();
    resetFirstLoads();
    const first = renderHook(() => useFirstLoad("x", 300, true));
    expect(first.result.current).toBe(true);
    act(() => {
      jest.advanceTimersByTime(301);
    });
    expect(first.result.current).toBe(false);
    const again = renderHook(() => useFirstLoad("x", 300, true));
    expect(again.result.current).toBe(false);
    jest.useRealTimers();
  });

  it("shows the offline bar", () => {
    renderWithProviders(<OfflineBanner forceOffline />);
    expect(screen.getByTestId("offline-banner")).toBeTruthy();
    expect(screen.getByText(/You're offline/)).toBeTruthy();
  });

  it("asks for biometrics only when switched on, and never blocks a phone that cannot ask", async () => {
    await expect(confirmWithBiometrics(false, "x")).resolves.toBe(true);
    await expect(confirmWithBiometrics(true, "x")).resolves.toBe(true);
  });

  it("keeps sounds off until they are switched on", () => {
    expect(soundsEnabled()).toBe(false);
    setSoundsEnabled(true);
    expect(soundsEnabled()).toBe(true);
    expect(() => playSound("success")).not.toThrow();
    setSoundsEnabled(false);
  });
});
