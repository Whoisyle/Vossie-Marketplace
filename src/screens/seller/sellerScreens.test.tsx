import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { SellerAccountScreen } from "./SellerAccountScreen";
import { SellerEarningsScreen } from "./SellerEarningsScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import { SellerListingsScreen } from "./SellerListingsScreen";
import { SellerMessagesScreen } from "./SellerMessagesScreen";
import { SellerNotificationsScreen } from "./SellerNotificationsScreen";
import { SellerOrderDetailScreen } from "./SellerOrderDetailScreen";
import { SellerOrdersScreen } from "./SellerOrdersScreen";
import { SellerStoreScreen } from "./SellerStoreScreen";
import { SellerTypeScreen } from "./SellerTypeScreen";
import { SellerVerifyScreen } from "./SellerVerifyScreen";
import { SellerWelcomeScreen } from "./SellerWelcomeScreen";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: { id?: string } = {};

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/seller/home",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: mockReplace }),
}));

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

function signedIn(): DemoState {
  return run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

/** A seller who has finished setup and is approved, in seller mode. */
function seller(): DemoState {
  return run(
    signedIn(),
    { role: "seller", type: "switchRole" },
    { type: "sellerStart" },
    { kind: "student", type: "sellerSetKind" },
    { phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" },
    { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" },
    { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" },
    { type: "sellerSubmitVerification" },
    { type: "sellerReviewTick" },
    { type: "sellerReviewTick" },
    { patch: { days: ["mon", "tue"], description: "Burgers", location: "Res Block B", opens: "08:00", closes: "17:00" }, type: "sellerSaveStore" },
    { type: "sellerFinishSetup" },
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = {};
});

describe("seller setup", () => {
  it("welcomes the seller and starts the setup", () => {
    renderWithProviders(<SellerWelcomeScreen />, signedIn());
    expect(screen.getByText("Seller mode")).toBeTruthy();
    fireEvent.press(screen.getByTestId("seller-start"));
    expect(mockPush).toHaveBeenCalledWith("/seller-setup/type");
  });

  it("asks for a kind of seller, a store name and a valid number before going on", () => {
    renderWithProviders(<SellerTypeScreen />, run(signedIn(), { type: "sellerStart" }));
    fireEvent.press(screen.getByTestId("seller-type-continue"));
    expect(screen.getByText("Choose what kind of seller you are.")).toBeTruthy();
    expect(screen.getByText("Give your store a name.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("kind-campus-business"));
    fireEvent.changeText(screen.getByTestId("seller-store-name"), "CampusBites");
    fireEvent.changeText(screen.getByTestId("seller-phone"), "123");
    fireEvent.press(screen.getByTestId("seller-type-continue"));
    expect(screen.getByText(/South African mobile number/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("seller-phone"), "082 573 5164");
    fireEvent.press(screen.getByTestId("seller-type-continue"));
    expect(mockPush).toHaveBeenCalledWith("/seller-setup/verify");
  });

  it("shows each document with its status and holds the submit button until all are given", () => {
    const state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
    renderWithProviders(<SellerVerifyScreen />, state);
    expect(screen.getByText("Verify your account")).toBeTruthy();
    expect(screen.getByText("1 of 3 documents received")).toBeTruthy();
    expect(screen.getAllByText("Required")).toHaveLength(2);
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByTestId("seller-submit-review").props.accessibilityState.disabled).toBe(true);
  });

  it("lets a seller with every document submit, then continue to the store", () => {
    const state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }, { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" }, { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" });
    jest.useFakeTimers();
    renderWithProviders(<SellerVerifyScreen />, state);
    fireEvent.press(screen.getByTestId("seller-submit-review"));
    expect(screen.getByTestId("seller-verify-continue")).toBeTruthy();
    // the status labels flip over, so give them a moment
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.getAllByText("In review")).toHaveLength(2);
    jest.useRealTimers();
    fireEvent.press(screen.getByTestId("seller-verify-continue"));
    expect(mockPush).toHaveBeenCalledWith("/seller-setup/store");
  });

  it("checks the store details before saving and finishing setup", () => {
    renderWithProviders(<SellerStoreScreen />, run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }));
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(screen.getByText("Give your store a name.")).toBeTruthy();
    expect(screen.getByText("Say where buyers collect from.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("store-name"), "CampusBites");
    fireEvent.changeText(screen.getByTestId("store-location"), "Res Block B");
    fireEvent.press(screen.getByTestId("day-mon"));
    fireEvent.changeText(screen.getByTestId("store-opens"), "25:00");
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(screen.getByText(/Use times like 08:00/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("store-opens"), "08:00");
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(mockReplace).toHaveBeenCalledWith("/seller/home");
  });
});

describe("seller home", () => {
  it("shows the counts and what needs attention, with new orders first", () => {
    renderWithProviders(<SellerHomeScreen />, seller());
    expect(screen.getByText("Needs your attention")).toBeTruthy();
    expect(screen.getByText("New orders")).toBeTruthy();
    expect(screen.getByText("Active listings")).toBeTruthy();
    expect(screen.getByTestId("attention-a-so-2041")).toBeTruthy();
    expect(screen.getByTestId("attention-a-sl-coffee")).toBeTruthy();
    expect(screen.queryByTestId("verification-banner")).toBeNull();
  });

  it("explains that orders wait for approval while verification is in review", () => {
    const pending = run(signedIn(), { role: "seller", type: "switchRole" }, { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" }, { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" }, { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" }, { type: "sellerSubmitVerification" }, { type: "sellerFinishSetup" });
    renderWithProviders(<SellerHomeScreen />, pending);
    expect(screen.getByTestId("verification-banner")).toBeTruthy();
    expect(screen.getByTestId("attention-act-a-so-2041").props.accessibilityState.disabled).toBe(true);
  });

  it("opens the notifications and the orders from the bell and the tiles", () => {
    renderWithProviders(<SellerHomeScreen />, seller());
    fireEvent.press(screen.getByTestId("seller-bell"));
    expect(mockPush).toHaveBeenCalledWith("/seller/home/notifications");
    fireEvent.press(screen.getByTestId("tile-orders"));
    expect(mockPush).toHaveBeenCalledWith("/seller/orders");
  });
});

describe("seller orders", () => {
  it("filters orders by where they are up to", () => {
    renderWithProviders(<SellerOrdersScreen />, seller());
    expect(screen.getByTestId("order-so-2041")).toBeTruthy();
    expect(screen.queryByTestId("order-so-2038")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-preparing"));
    expect(screen.getByTestId("order-so-2038")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-ready"));
    expect(screen.getByTestId("order-so-2036")).toBeTruthy();
  });

  it("accepts a new order, which moves to Preparing", () => {
    jest.useFakeTimers();
    renderWithProviders(<SellerOrdersScreen />, seller());
    fireEvent.press(screen.getByTestId("accept-so-2041"));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId("order-so-2041")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-preparing"));
    expect(screen.getByTestId("order-so-2041")).toBeTruthy();
    jest.useRealTimers();
  });

  it("declines with a reason", () => {
    jest.useFakeTimers();
    renderWithProviders(<SellerOrdersScreen />, seller());
    fireEvent.press(screen.getByTestId("decline-so-2040"));
    act(() => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(screen.getByTestId("reason-Sold out"));
    fireEvent.press(screen.getByTestId("confirm-decline"));
    expect(screen.queryByTestId("order-so-2040")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-cancelled"));
    expect(screen.getByTestId("order-so-2040")).toBeTruthy();
    jest.useRealTimers();
  });

  it("moves an accepted order on to preparing and ready", () => {
    renderWithProviders(<SellerOrdersScreen />, seller());
    fireEvent.press(screen.getByTestId("chip-preparing"));
    fireEvent.press(screen.getByTestId("advance-so-2037"));
    fireEvent.press(screen.getByTestId("advance-so-2037"));
    fireEvent.press(screen.getByTestId("chip-ready"));
    expect(screen.getByTestId("order-so-2037")).toBeTruthy();
  });
});

describe("seller order detail", () => {
  it("shows the items, buyer, collection and totals of a new order", () => {
    mockParams = { id: "so-2041" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByText("Order #2041")).toBeTruthy();
    expect(screen.getByText("Thabo N.")).toBeTruthy();
    expect(screen.getByText("Campus collection")).toBeTruthy();
    expect(screen.getByText("Paid in app")).toBeTruthy();
    expect(screen.getByTestId("slide-accept")).toBeTruthy();
  });

  it("completes a ready order only with the right collection code", () => {
    mockParams = { id: "so-2036" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    fireEvent.changeText(screen.getByTestId("handover-code"), "000000");
    fireEvent.press(screen.getByTestId("handover-confirm"));
    expect(screen.getByText(/That code does not match/)).toBeTruthy();
    expect(screen.queryByTestId("order-done")).toBeNull();
    const code = screen.getByText(/Demo code: \d{6}/).props.children.join("").replace(/\D/g, "");
    fireEvent.changeText(screen.getByTestId("handover-code"), code);
    fireEvent.press(screen.getByTestId("handover-confirm"));
    expect(screen.getByTestId("order-done")).toBeTruthy();
  });

  it("says so when the order is not there", () => {
    mockParams = { id: "nope" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByText("That order is not here any more.")).toBeTruthy();
  });
});

describe("seller earnings, listings and the rest", () => {
  it("shows the balance, the week as a chart and recent activity", () => {
    renderWithProviders(<SellerEarningsScreen />, seller());
    expect(screen.getByText("Available balance")).toBeTruthy();
    expect(screen.getByTestId("week-chart")).toBeTruthy();
    expect(screen.getAllByText(/Sale ·/).length).toBeGreaterThan(0);
    expect(screen.getByText("Payout · Bank transfer")).toBeTruthy();
  });

  it("opens the withdraw sheet and asks for a bank the first time", () => {
    renderWithProviders(<SellerEarningsScreen />, seller());
    fireEvent.press(screen.getByTestId("open-withdraw"));
    expect(screen.getByText("Withdraw to bank")).toBeTruthy();
    expect(screen.getByText("Account holder")).toBeTruthy();
  });

  it("lists the listings, filters low stock, and pauses and restocks", () => {
    renderWithProviders(<SellerListingsScreen />, seller());
    expect(screen.getByTestId("listing-sl-burger")).toBeTruthy();
    fireEvent.press(screen.getByTestId("filter-low"));
    expect(screen.getByTestId("listing-sl-coffee")).toBeTruthy();
    expect(screen.queryByTestId("listing-sl-burger")).toBeNull();
    fireEvent.press(screen.getByTestId("pause-sl-coffee"));
    fireEvent.press(screen.getByTestId("filter-paused"));
    expect(screen.getByTestId("listing-sl-coffee")).toBeTruthy();
  });

  it("shows the buyer messages, the notifications and the account", () => {
    const state = seller();
    renderWithProviders(<SellerMessagesScreen />, state);
    expect(screen.getByText("Messages")).toBeTruthy();
    renderWithProviders(<SellerNotificationsScreen />, state);
    expect(screen.getByText("New order #2041")).toBeTruthy();
    renderWithProviders(<SellerAccountScreen />, state);
    expect(screen.getByText("CampusBites")).toBeTruthy();
    fireEvent.press(screen.getByTestId("switch-to-buyer"));
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});
