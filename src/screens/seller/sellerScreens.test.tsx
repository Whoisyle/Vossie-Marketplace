import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { AccountScreen } from "@/screens/account/AccountScreen";

import { SellerAccountScreen } from "./SellerAccountScreen";
import { SellerInventoryScreen } from "./SellerInventoryScreen";
import { SellerAnalyticsScreen, SellerReviewsScreen, SellerStorePreviewScreen } from "./SellerInsightScreens";
import { SellerCasesScreen, SellerPromotionsScreen, SellerTeamScreen } from "./SellerManageScreens";
import { SellerHandoverScreen, SellerPrepareScreen } from "./SellerPrepareScreens";
import { SellerPayoutsScreen } from "./SellerPayoutsScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import { SellerProductsScreen } from "./SellerProductsScreen";
import { SellerMessagesScreen } from "./SellerMessagesScreen";
import { SellerNotificationsScreen } from "./SellerNotificationsScreen";
import { SellerOrderDetailScreen } from "./SellerOrderDetailScreen";
import { SellerOrdersScreen } from "./SellerOrdersScreen";
import { SellerStoreScreen } from "./SellerStoreScreen";
import { SellerTypeScreen } from "./SellerTypeScreen";
import { SellerVerifyScreen } from "./SellerVerifyScreen";
import { SellerWelcomeScreen } from "./SellerWelcomeScreen";

let mockScan: ((event: { data: string }) => void) | undefined;
jest.mock("expo-camera", () => {
  const { View } = jest.requireActual("react-native");
  return {
    CameraView: ({ onBarcodeScanned }: { onBarcodeScanned: (event: { data: string }) => void }) => {
      mockScan = onBarcodeScanned;
      return <View testID="camera" />;
    },
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

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
    expect(screen.getByText("To ship")).toBeTruthy();
    expect(screen.getByTestId("attention-a-so-2041")).toBeTruthy();
    expect(screen.getByTestId("attention-a-sl-ti30")).toBeTruthy();
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
    fireEvent.press(screen.getByTestId("chip-accepted"));
    expect(screen.getByTestId("order-so-2038")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-preparing"));
    expect(screen.getByTestId("order-so-2036")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-ready"));
    expect(screen.getByTestId("order-so-2035")).toBeTruthy();
  });

  it("accepts a new order, which moves to Preparing", () => {
    jest.useFakeTimers();
    renderWithProviders(<SellerOrdersScreen />, seller());
    fireEvent.press(screen.getByTestId("accept-so-2041"));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId("order-so-2041")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-accepted"));
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
    fireEvent.press(screen.getByTestId("advance-so-2036"));
    fireEvent.press(screen.getByTestId("chip-ready"));
    expect(screen.getByTestId("order-so-2036")).toBeTruthy();
  });
});

describe("seller order detail", () => {
  it("shows the items, buyer, collection and totals of a new order", () => {
    mockParams = { id: "so-2041" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByText("Order #VM-2041")).toBeTruthy();
    expect(screen.getByText("Thabo Mokoena")).toBeTruthy();
    expect(screen.getAllByText("Courier delivery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paid in app").length).toBeGreaterThan(0);
    expect(screen.getByText("Awaiting your acceptance")).toBeTruthy();
    expect(screen.getByText("Respond within 30 min")).toBeTruthy();
    fireEvent.press(screen.getByTestId("message-buyer"));
    expect(mockPush).toHaveBeenCalled();
    expect(screen.getByText("Delivery fee (paid by buyer)")).toBeTruthy();
    expect(screen.getByText("Vossie platform fee")).toBeTruthy();
    expect(screen.getByText("You earn")).toBeTruthy();
    expect(screen.getByTestId("slide-accept")).toBeTruthy();
  });

  it("completes a ready order only with the right collection code", async () => {
    mockParams = { id: "so-2035" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    fireEvent.changeText(screen.getByTestId("handover-code"), "000000");
    fireEvent.press(screen.getByTestId("handover-confirm"));
    expect(await screen.findByText(/That code does not match/)).toBeTruthy();
    expect(screen.queryByTestId("order-done")).toBeNull();
    const code = screen.getByText(/Demo code: \d{6}/).props.children.join("").replace(/\D/g, "");
    fireEvent.changeText(screen.getByTestId("handover-code"), code);
    fireEvent.press(screen.getByTestId("handover-confirm"));
    expect(await screen.findByTestId("order-done")).toBeTruthy();
  });

  it("says so when the order is not there", () => {
    mockParams = { id: "nope" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByText("That order is not here any more.")).toBeTruthy();
  });
});

describe("seller earnings, listings and the rest", () => {
  it("shows the balance, the week as a chart and recent activity", () => {
    renderWithProviders(<SellerPayoutsScreen />, seller());
    expect(screen.getByText("Available balance")).toBeTruthy();
    expect(screen.getByTestId("week-chart")).toBeTruthy();
    expect(screen.getAllByText(/fee R/).length).toBeGreaterThan(0);
    expect(screen.getByText("Payout to bank")).toBeTruthy();
    expect(screen.getByTestId("payout-pending")).toBeTruthy();
    expect(screen.getByTestId("payout-fees")).toBeTruthy();
  });

  it("opens the withdraw sheet and asks for a bank the first time", () => {
    renderWithProviders(<SellerPayoutsScreen />, seller());
    fireEvent.press(screen.getByTestId("open-withdraw"));
    expect(screen.getByText("Withdraw to bank")).toBeTruthy();
    expect(screen.getByText("Account holder")).toBeTruthy();
  });

  it("lists the listings, filters low stock, and pauses and restocks", () => {
    renderWithProviders(<SellerProductsScreen />, seller());
    expect(screen.getByTestId("listing-sl-calculus")).toBeTruthy();
    fireEvent.press(screen.getByTestId("filter-low"));
    expect(screen.getByTestId("listing-sl-ti30")).toBeTruthy();
    expect(screen.queryByTestId("listing-sl-calculus")).toBeNull();
    fireEvent.press(screen.getByTestId("pause-sl-ti30"));
    fireEvent.press(screen.getByTestId("filter-paused"));
    expect(screen.getByTestId("listing-sl-ti30")).toBeTruthy();
  });

  it("shows the buyer messages, the notifications and the account", () => {
    const state = seller();
    renderWithProviders(<SellerMessagesScreen />, state);
    expect(screen.getByText("Messages")).toBeTruthy();
    renderWithProviders(<SellerNotificationsScreen />, state);
    expect(screen.getByText("New order #VM-2041")).toBeTruthy();
    renderWithProviders(<SellerAccountScreen />, state);
    expect(screen.getByText("CampusBites")).toBeTruthy();
    fireEvent.press(screen.getByTestId("switch-to-buyer"));
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});

describe("switching to the seller role from Account", () => {
  it("opens the first seller screen for someone who has not set up, every time", () => {
    renderWithProviders(<AccountScreen />, signedIn());
    fireEvent.press(screen.getByText("Switch role"));
    fireEvent.press(screen.getByText("Seller"));
    expect(mockReplace).toHaveBeenCalledWith("/seller-setup/welcome");
  });

  it("opens Seller Home for a seller whose shop is already set up", () => {
    renderWithProviders(<AccountScreen />, run(seller(), { role: "buyer", type: "switchRole" }));
    fireEvent.press(screen.getByText("Switch role"));
    fireEvent.press(screen.getByText("Seller"));
    expect(mockReplace).toHaveBeenCalledWith("/seller/home");
  });
});

describe("products and inventory", () => {
  it("searches the products and opens Inventory", () => {
    renderWithProviders(<SellerProductsScreen />, seller());
    fireEvent.changeText(screen.getByTestId("product-search"), "lamp");
    expect(screen.getByTestId("listing-sl-lamp")).toBeTruthy();
    expect(screen.queryByTestId("listing-sl-calculus")).toBeNull();
    fireEvent.press(screen.getByTestId("open-inventory"));
    expect(mockPush).toHaveBeenCalledWith("/seller/products/inventory");
    fireEvent.changeText(screen.getByTestId("product-search"), "");
    fireEvent.press(screen.getByTestId("filter-archived"));
    expect(screen.queryByTestId("listing-sl-lamp")).toBeNull();
  });

  it("counts stock, warns about the one almost out, and changes it with plus and minus", () => {
    renderWithProviders(<SellerInventoryScreen />, seller());
    expect(screen.getByTestId("inv-alert")).toBeTruthy();
    expect(screen.getByTestId("stock-count-sl-ti30").props.children).toBe(2);
    fireEvent.press(screen.getByTestId("stock-plus-sl-ti30"));
    expect(screen.getByTestId("stock-count-sl-ti30").props.children).toBe(3);
    fireEvent.press(screen.getByTestId("stock-minus-sl-ti30"));
    fireEvent.press(screen.getByTestId("stock-minus-sl-ti30"));
    expect(screen.getByTestId("stock-count-sl-ti30").props.children).toBe(1);
  });
});

describe("preparing a delivery and handing it to the courier", () => {
  it("only lets the seller mark ready once everything is packed, then goes to the handover", () => {
    mockParams = { id: "so-2038" };
    renderWithProviders(<SellerPrepareScreen />, seller());
    expect(screen.getByTestId("mark-ready").props.accessibilityState.disabled).toBe(true);
    for (const id of ["pack-Economics 101 Textbook-", "pack-label"]) fireEvent.press(screen.getByTestId(id));
    expect(screen.getByTestId("mark-ready").props.accessibilityState.disabled).toBeFalsy();
    fireEvent.press(screen.getByTestId("mark-ready"));
    expect(mockReplace).toHaveBeenCalledWith("/seller/orders/handover/so-2038");
  });

  it("shows the four digit code, waits for a courier and confirms only when sealed and matching", () => {
    jest.useFakeTimers();
    mockParams = { id: "so-2035" };
    renderWithProviders(<SellerHandoverScreen />, run(seller(), { id: "so-2038", to: "ready", type: "sellerAdvanceOrder" }));
    expect(screen.getByTestId("handover-code-card")).toBeTruthy();
    expect(screen.getByText("Finding a courier")).toBeTruthy();
    expect(screen.getByTestId("confirm-handover").props.accessibilityState.disabled).toBe(true);
    jest.useRealTimers();
  });

  it("scans the courier's QR: a wrong code is refused, the right one is accepted", () => {
    mockParams = { id: "so-2038" };
    const ready = run(seller(), { id: "so-2038", to: "ready", type: "sellerAdvanceOrder" }, { id: "so-2038", type: "sellerAssignCourier" });
    renderWithProviders(<SellerHandoverScreen />, ready);
    fireEvent.press(screen.getByTestId("scan-code"));
    expect(screen.getByTestId("camera")).toBeTruthy();
    act(() => mockScan?.({ data: "vossie-courier:0000" }));
    expect(screen.getByText(/not for this order/)).toBeTruthy();
    const code = ready.seller.orders.find((item) => item.id === "so-2038")!.courierCode;
    act(() => mockScan?.({ data: `vossie-courier:${code}` }));
    expect(screen.getByText("Code matched")).toBeTruthy();
  });

  it("confirms the handover once a courier is there", () => {
    jest.useFakeTimers();
    mockParams = { id: "so-2038" };
    const ready = run(seller(), { id: "so-2038", to: "ready", type: "sellerAdvanceOrder" }, { id: "so-2038", type: "sellerAssignCourier" });
    renderWithProviders(<SellerHandoverScreen />, ready);
    expect(screen.getByText("Tebogo K.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("check-sealed"));
    fireEvent.press(screen.getByTestId("check-matches"));
    fireEvent.press(screen.getByTestId("confirm-handover"));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockReplace).toHaveBeenCalledWith("/seller/orders");
    jest.useRealTimers();
  });
});

describe("store, reviews, analytics, promotions, cases and team", () => {
  it("shows how buyers see the store", () => {
    renderWithProviders(<SellerStorePreviewScreen />, seller());
    expect(screen.getByText("How buyers see you")).toBeTruthy();
    expect(screen.getByTestId("preview-sl-calculus")).toBeTruthy();
    fireEvent.press(screen.getByTestId("edit-store"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/store");
  });

  it("shows the rating and sends a reply", () => {
    renderWithProviders(<SellerReviewsScreen />, seller());
    expect(screen.getByText("4.8")).toBeTruthy();
    fireEvent.press(screen.getByTestId("reply-rv-1"));
    fireEvent.press(screen.getByText("Thank you for your review!"));
    expect(screen.getByText("Your reply")).toBeTruthy();
  });

  it("changes the analytics range", () => {
    renderWithProviders(<SellerAnalyticsScreen />, seller());
    expect(screen.getByTestId("analytics-revenue")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-30"));
    expect(screen.getByTestId("analytics-orders")).toBeTruthy();
  });

  it("switches a promotion and creates one", () => {
    renderWithProviders(<SellerPromotionsScreen />, seller());
    expect(screen.getByTestId("promo-pr-first")).toBeTruthy();
    expect(screen.queryByTestId("promo-pr-exam")).toBeNull();
    fireEvent.press(screen.getByTestId("create-promotion"));
    fireEvent.press(screen.getByTestId("template-free-delivery"));
    expect(screen.getAllByText("Free delivery over R100").length).toBeGreaterThan(0);
  });

  it("approves a refund and answers a dispute", () => {
    renderWithProviders(<SellerCasesScreen />, seller());
    fireEvent.press(screen.getByTestId("approve-cs-2012"));
    fireEvent.press(screen.getByTestId("respond-cs-1998"));
    expect(screen.queryByTestId("approve-cs-2012")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-resolved"));
    expect(screen.getByText("Refund approved")).toBeTruthy();
  });

  it("invites a team member and removes them", () => {
    renderWithProviders(<SellerTeamScreen />, seller());
    fireEvent.press(screen.getByTestId("invite-team"));
    fireEvent.changeText(screen.getByLabelText("Email"), "naledi@vossie.net");
    fireEvent.press(screen.getByTestId("send-invite"));
    expect(screen.getAllByText("naledi@vossie.net").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("remove-tm-2"));
    expect(screen.queryByTestId("member-tm-2")).toBeNull();
  });
});

describe("seller account extras", () => {
  it("explains sign-in security and logs out", () => {
    renderWithProviders(<SellerAccountScreen />, seller());
    fireEvent.press(screen.getByTestId("row-security"));
    expect(screen.getByText(/one-time code/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("row-details"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/store");
    fireEvent.press(screen.getByTestId("seller-logout"));
    expect(mockReplace).toHaveBeenCalledWith("/sign-in");
  });

  it("shows the order timeline moving on with the status", () => {
    mockParams = { id: "so-2036" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByTestId("order-timeline")).toBeTruthy();
    expect(screen.getByText("Packing")).toBeTruthy();
  });
});
