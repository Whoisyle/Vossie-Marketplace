import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { AccountScreen } from "@/screens/account/AccountScreen";

import { SellerAccountScreen } from "./SellerAccountScreen";
import { SellerInventoryScreen } from "./SellerInventoryScreen";
import { SellerAnalyticsScreen, SellerReviewsScreen, SellerStorePreviewScreen } from "./SellerInsightScreens";
import { SellerCasesScreen, SellerTeamScreen } from "./SellerManageScreens";
import { SellerPromotionFormScreen, SellerPromotionsScreen } from "./SellerPromotionScreens";
import { SellerHandoverScreen, SellerPrepareScreen } from "./SellerPrepareScreens";
import { SellerReceiptScreen, SellerStatementsScreen, SellerTransactionsScreen } from "./SellerMoneyScreens";
import { SellerPlaceScreen } from "./SellerPlaceScreen";
import { SellerReelPreviewScreen, SellerReelsPageScreen } from "./SellerReelPreview";
import { SellerWalletScreen } from "./SellerWalletScreen";
import { SellerListingFormScreen } from "./SellerListingFormScreen";
import { SellerPlansScreen } from "./SellerPlansScreen";
import { SellerSupportFormScreen, SellerSupportScreen, SellerTicketScreen } from "./SellerSupportScreens";
import { ShareStoreSheet, storeLink, storeSlug } from "./ShareStore";
import { SellerReelFormScreen } from "./SellerReelsScreens";
import { SellerScheduleScreen } from "./SellerScheduleScreen";
import { SellerSecurityScreen, SellerSettingsScreen } from "./SellerSettingsScreens";
import { SellerPayoutsScreen } from "./SellerPayoutsScreen";
import { SellerHomeScreen } from "./SellerHomeScreen";
import { SellerProductsScreen } from "./SellerProductsScreen";
import { SellerMessagesScreen } from "./SellerMessagesScreen";
import { SellerNotificationsScreen, SellerNotifySettingsScreen } from "./SellerNotificationsScreen";
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
    const started = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
    const first = renderWithProviders(<SellerStoreScreen />, started);
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(screen.getByText("Give your store a name.")).toBeTruthy();
    expect(screen.getByText("Choose the place where buyers collect from.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("choose-place"));
    expect(mockPush).toHaveBeenCalledWith("/seller-setup/place");
    first.unmount();

    const placed = run(started, { patch: { place: { address: "12 Esselen Street, Die Bult", latitude: -26.694, longitude: 27.094, name: "Eduvos Potchefstroom campus", source: "hub" } }, type: "sellerSaveStore" });
    renderWithProviders(<SellerStoreScreen />, placed);
    expect(screen.getByText("Eduvos Potchefstroom campus")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("store-name"), "CampusBites");
    fireEvent.press(screen.getByTestId("day-mon"));
    fireEvent.changeText(screen.getByTestId("store-opens"), "25:00");
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(screen.getByText(/Use times like 08:00/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("store-opens"), "08:00");
    fireEvent.press(screen.getByTestId("seller-store-save"));
    expect(mockReplace).toHaveBeenCalledWith("/seller/home");
  });

  it("offers a store banner from the library or the camera", () => {
    renderWithProviders(<SellerStoreScreen mode="manage" />, seller());
    fireEvent.press(screen.getByTestId("banner-button"));
    expect(screen.getByTestId("attach-library")).toBeTruthy();
    expect(screen.getByTestId("attach-camera")).toBeTruthy();
    expect(screen.queryByTestId("attach-scan")).toBeNull();
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
    expect(screen.getAllByText("CampusBites").length).toBeGreaterThan(0);
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

  it("lists promotions by where they are up to, and opens one to edit", () => {
    renderWithProviders(<SellerPromotionsScreen />, seller());
    expect(screen.getByTestId("promo-pr-first")).toBeTruthy();
    expect(screen.queryByTestId("promo-pr-exam")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-scheduled"));
    expect(screen.getByTestId("promo-pr-exam")).toBeTruthy();
    fireEvent(screen.getByTestId("toggle-pr-exam"), "valueChange", true);
    fireEvent.press(screen.getByTestId("chip-active"));
    fireEvent.press(screen.getByTestId("promo-pr-first"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/promotion/pr-first");
    fireEvent.press(screen.getByTestId("create-promotion"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/promotion/new");
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
    expect(mockPush).toHaveBeenCalledWith("/seller/account/security");
    fireEvent.press(screen.getByTestId("row-hours"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/hours");
    fireEvent.press(screen.getByTestId("row-settings"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/settings");
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

describe("operating times", () => {
  it("shows whether the store is open and applies a preset to the whole week", () => {
    renderWithProviders(<SellerScheduleScreen />, seller());
    expect(screen.getByTestId("schedule-status")).toBeTruthy();
    fireEvent.press(screen.getByTestId("preset-every-day"));
    expect(screen.getByTestId("open-sat").props.value).toBe(true);
    fireEvent.press(screen.getByTestId("preset-weekdays"));
    expect(screen.getByTestId("open-sat").props.value).toBe(false);
  });

  it("changes one day by hand and sets the week from lectures", () => {
    renderWithProviders(<SellerScheduleScreen />, seller());
    fireEvent.press(screen.getByTestId("from-mon-plus"));
    expect(screen.getByTestId("from-mon-value").props.children).toBe("08:30");
    fireEvent.press(screen.getByTestId("lecture-day-mon"));
    fireEvent.press(screen.getByTestId("add-lecture"));
    expect(screen.getByTestId("preset-timetable").props.accessibilityState.selected).toBe(true);
  });

  it("blocks out days and picks how long a pickup slot is", () => {
    renderWithProviders(<SellerScheduleScreen />, seller());
    fireEvent.press(screen.getByTestId("add-closure"));
    expect(screen.getByText(/Exam week ·/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("slot-60"));
    expect(screen.getByTestId("slot-60").props.accessibilityState.selected).toBe(true);
  });
});

describe("transactions, receipts and statements", () => {
  it("filters and searches the transactions and opens a receipt", () => {
    renderWithProviders(<SellerTransactionsScreen />, seller());
    fireEvent.press(screen.getByTestId("tx-payout"));
    expect(screen.getAllByText("Payout to bank").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("tx-all"));
    fireEvent.changeText(screen.getByTestId("tx-search"), "zzzz");
    expect(screen.getByTestId("tx-empty")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("tx-search"), "");
    fireEvent.press(screen.getByTestId("range-all"));
    fireEvent.press(screen.getAllByTestId(/^ledger-/)[0]!);
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/seller\/payouts\/receipt\//));
  });

  it("shows a sale receipt with the fee breakdown", () => {
    const state = run(seller(), { accept: true, id: "so-2041", type: "sellerRespondOrder" }, { id: "so-2041", to: "ready", type: "sellerAdvanceOrder" }, { id: "so-2041", type: "sellerAssignCourier" }, { id: "so-2041", type: "sellerHandToCourier" });
    const entry = state.seller.ledger.find((item) => item.sellerOrderId === "so-2041")!;
    mockParams = { id: entry.id };
    renderWithProviders(<SellerReceiptScreen />, state);
    expect(screen.getByText("Vossie platform fee")).toBeTruthy();
    expect(screen.getByText("You earned")).toBeTruthy();
    expect(screen.getByTestId("share-receipt")).toBeTruthy();
  });

  it("lists a statement for each month", () => {
    renderWithProviders(<SellerStatementsScreen />, seller());
    expect(screen.getAllByText(/Left in your balance/).length).toBeGreaterThan(0);
  });
});

describe("notification centre, notification settings, security and account settings", () => {
  it("groups notifications, filters them and marks one read", () => {
    renderWithProviders(<SellerNotificationsScreen />, seller());
    expect(screen.getByText("Today")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-money"));
    expect(screen.queryByTestId("alert-sa-1")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-all"));
    fireEvent.press(screen.getByTestId("alert-sa-1"));
    expect(screen.queryByTestId("unread-sa-1")).toBeNull();
  });

  it("switches push and email for a kind and sets quiet hours", () => {
    renderWithProviders(<SellerNotifySettingsScreen />, seller());
    fireEvent(screen.getByTestId("email-messages"), "valueChange", true);
    expect(screen.getByTestId("email-messages").props.value).toBe(true);
    fireEvent(screen.getByLabelText("Quiet hours"), "valueChange", true);
    fireEvent.press(screen.getByTestId("quiet-from-plus"));
    expect(screen.getByTestId("quiet-from-value").props.children).toBe("22:30");
  });

  it("shows the security score and signed-in devices", () => {
    renderWithProviders(<SellerSecurityScreen />, seller());
    expect(screen.getByTestId("security-score")).toBeTruthy();
    expect(screen.getAllByText(/This device/).length).toBeGreaterThan(0);
  });

  it("saves a tax number and pauses the store from Settings", () => {
    renderWithProviders(<SellerSettingsScreen />, seller());
    fireEvent.press(screen.getByTestId("set-tax"));
    fireEvent.changeText(screen.getByTestId("tax-field"), "4012345678");
    fireEvent.press(screen.getByTestId("tax-save"));
    expect(screen.getByText("Tax number 4012345678")).toBeTruthy();
    fireEvent(screen.getByLabelText("Pause the store"), "valueChange", true);
    expect(screen.getByText("Buyers see the store as closed")).toBeTruthy();
  });
});

describe("reels, analytics tabs, plans and the growth hub", () => {
  const withPlan = (planId: "seller-plus" | "seller-pro") => run(seller(), { planId, type: "subscribe" });

  it("lists the reels with the best one marked, and asks a free seller to upgrade to add one", () => {
    renderWithProviders(<SellerProductsScreen />, seller());
    fireEvent.press(screen.getByTestId("view-reels"));
    expect(screen.getByTestId("reels-panel")).toBeTruthy();
    expect(screen.getByTestId("reel-rl-ti30")).toBeTruthy();
    expect(screen.getAllByText("Best performing")).toHaveLength(1);
    fireEvent.press(screen.getByTestId("add-reel"));
    expect(screen.getByText(/Reels start with Seller Plus/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("see-plans"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/plans");
  });

  it("lets a Plus seller open the new reel form, hides and deletes a reel", () => {
    renderWithProviders(<SellerProductsScreen />, withPlan("seller-plus"));
    fireEvent.press(screen.getByTestId("view-reels"));
    fireEvent.press(screen.getByTestId("add-reel"));
    expect(mockPush).toHaveBeenCalledWith("/seller/products/reel/new");
    fireEvent.press(screen.getByTestId("hide-rl-lamp"));
    expect(screen.getByTestId("publish-rl-lamp")).toBeTruthy();
    fireEvent.press(screen.getByTestId("delete-rl-lamp"));
    fireEvent.press(screen.getByTestId("confirm-delete-reel"));
    expect(screen.queryByTestId("reel-rl-lamp")).toBeNull();
  });

  it("saves a reel from the form, and refuses a caption that is too short", () => {
    mockParams = { id: "new" };
    renderWithProviders(<SellerReelFormScreen />, withPlan("seller-plus"));
    fireEvent.changeText(screen.getByTestId("reel-caption"), "Hi");
    fireEvent.press(screen.getByTestId("reel-publish"));
    expect(screen.getByText(/at least 3 letters/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("reel-caption"), "Lamp on a desk");
    fireEvent.press(screen.getByTestId("reel-draft"));
    expect(screen.queryByText(/at least 3 letters/)).toBeNull();
  });

  it("asks a free seller to upgrade before publishing a reel", () => {
    mockParams = { id: "new" };
    renderWithProviders(<SellerReelFormScreen />, seller());
    fireEvent.changeText(screen.getByTestId("reel-caption"), "Lamp on a desk");
    fireEvent.press(screen.getByTestId("reel-publish"));
    expect(screen.getByText(/Reels start with Seller Plus/)).toBeTruthy();
  });

  it("locks the product and reel analytics until the plan allows them", () => {
    renderWithProviders(<SellerAnalyticsScreen />, seller());
    fireEvent.press(screen.getByTestId("tab-products"));
    expect(screen.getByText(/Analytics by product starts with Seller Plus/)).toBeTruthy();
    expect(screen.queryByTestId("analytics-products")).toBeNull();
  });

  it("shows product and reel analytics on Pro, best performer first", () => {
    renderWithProviders(<SellerAnalyticsScreen />, withPlan("seller-pro"));
    fireEvent.press(screen.getByTestId("tab-products"));
    expect(screen.getByTestId("analytics-products")).toBeTruthy();
    fireEvent.press(screen.getByTestId("tab-reels"));
    expect(screen.getByTestId("reel-rank-rl-ti30")).toBeTruthy();
    expect(screen.getAllByText("Best performing")).toHaveLength(1);
  });

  it("shows the plans, and joins Seller Plus from the wallet", async () => {
    renderWithProviders(<SellerPlansScreen />, seller());
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("choose-plus"));
    fireEvent.press(screen.getByTestId("confirm-plan"));
    expect(await screen.findByText("Seller Plus")).toBeTruthy();
    expect(screen.getByTestId("billing")).toBeTruthy();
  });

  it("shows the growth hub on Home and opens the plans", () => {
    renderWithProviders(<SellerHomeScreen />, seller());
    expect(screen.getByTestId("growth-hub")).toBeTruthy();
    fireEvent.press(screen.getByTestId("growth-plan"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/plans");
    fireEvent.press(screen.getByTestId("growth-analytics"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/analytics");
  });

  it("stops a free seller adding an eleventh product", () => {
    let state = seller();
    for (const n of [1, 2]) state = run(state, { listing: { category: "food", description: "", id: `sl-extra-${n}`, onHand: 5, photos: [], priceCents: 1000, sku: `VM-9${n}`, status: "published", title: `Extra ${n}`, unlimited: false, updatedAt: "", variants: [] }, type: "sellerSaveListing" });
    renderWithProviders(<SellerProductsScreen />, state);
    fireEvent.press(screen.getByTestId("add-listing"));
    expect(screen.getByText(/The Free plan holds 10 products/)).toBeTruthy();
  });
});

describe("creating and editing a promotion", () => {
  it("checks the fields, previews the offer and creates it with all its options", () => {
    mockParams = { id: "new" };
    const view = renderWithProviders(<SellerPromotionFormScreen />, seller());
    fireEvent.press(screen.getByTestId("promo-save"));
    expect(screen.getByText(/name of at least 3 letters/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("promo-title"), "Lamp week");
    fireEvent.press(screen.getByTestId("kind-rand-off"));
    fireEvent.press(screen.getByTestId("promo-rand-plus"));
    fireEvent.press(screen.getByTestId("applies-products"));
    fireEvent.press(screen.getByTestId("promo-save"));
    expect(screen.getByText(/Pick at least one product/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("promo-product-sl-lamp"));
    fireEvent.changeText(screen.getByTestId("promo-code"), "lamp5!");
    expect(screen.getByTestId("promo-preview")).toBeTruthy();
    expect(screen.getByText(/R25 off · on 1 product · code LAMP5/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("promo-endless"));
    fireEvent.press(screen.getByTestId("promo-save"));
    expect(screen.queryByText(/Pick at least one product/)).toBeNull();
    view.unmount();
  });

  it("opens an existing offer, and duplicates it as a paused copy", () => {
    mockParams = { id: "pr-first" };
    renderWithProviders(<SellerPromotionFormScreen />, seller());
    expect(screen.getByTestId("promo-title").props.value).toBe("First order 10% off");
    expect(screen.getByText(/10% off · first order · code VOSSIE10/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("promo-duplicate"));
    fireEvent.press(screen.getByTestId("promo-delete"));
    fireEvent.press(screen.getByTestId("promo-confirm-delete"));
  });
});

describe("choosing a real place for the store", () => {
  const hits = [{ display_name: "Potchefstroom Library, Steve Biko Avenue, Potchefstroom, North West", lat: "-26.6931", lon: "27.0951", name: "Potchefstroom Library", place_id: 7 }];

  it("starts from the campus hubs, finds real places by search and saves the one chosen", async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ json: async () => hits, ok: true }) as never;
    renderWithProviders(<SellerPlaceScreen />, seller());
    expect(screen.getByTestId("place-card")).toBeTruthy();
    expect(screen.getAllByText("Eduvos Potchefstroom campus").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("hub-hub-mooirivier"));
    expect(screen.getAllByText("Mooirivier Mall").length).toBeGreaterThan(0);
    fireEvent.changeText(screen.getByTestId("place-search"), "library");
    fireEvent.press(await screen.findByTestId("place-osm-7", {}, { timeout: 3000 }));
    expect(screen.getByText("Found on the map")).toBeTruthy();
    fireEvent.press(screen.getByTestId("place-confirm"));
    global.fetch = original;
  });

  it("says so when a search finds nothing", async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [], ok: true }) as never;
    renderWithProviders(<SellerPlaceScreen />, seller());
    fireEvent.changeText(screen.getByTestId("place-search"), "nowhere at all");
    expect(await screen.findByText(/No places found/, {}, { timeout: 3000 })).toBeTruthy();
    global.fetch = original;
  });
});

describe("help and support", () => {
  it("lists the requests with their status and opens one", () => {
    renderWithProviders(<SellerSupportScreen />, seller());
    expect(screen.getByTestId("ticket-tk-1")).toBeTruthy();
    expect(screen.getByText("Resolved")).toBeTruthy();
    fireEvent.press(screen.getByTestId("ticket-tk-1"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/support/tk-1");
    fireEvent.press(screen.getByTestId("new-ticket"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/support/new");
  });

  it("checks the form, asks for a phone number only for a call, and sends the request", () => {
    renderWithProviders(<SellerSupportFormScreen />, seller());
    fireEvent.press(screen.getByTestId("send-ticket"));
    expect(screen.getByText("Give the request a short subject.")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("ticket-subject"), "Payout is late");
    fireEvent.changeText(screen.getByTestId("ticket-details"), "I asked for a payout on Friday and it has not arrived.");
    expect(screen.queryByTestId("ticket-phone")).toBeNull();
    fireEvent.press(screen.getByTestId("contact-phone"));
    expect(screen.getByTestId("ticket-phone")).toBeTruthy();
    fireEvent.press(screen.getByTestId("topic-payout"));
    fireEvent.press(screen.getByTestId("ticket-urgent"));
    fireEvent.press(screen.getByTestId("add-attachment"));
    expect(screen.getByTestId("attach-library")).toBeTruthy();
    fireEvent.press(screen.getByTestId("send-ticket"));
    expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/^\/seller\/account\/support\/tk-/));
  });

  it("shows the thread and lets the seller reply or resolve", async () => {
    mockParams = { id: "tk-1" };
    renderWithProviders(<SellerTicketScreen />, seller());
    expect(screen.getByTestId("ticket-thread")).toBeTruthy();
    expect(screen.getByText(/This request is resolved/)).toBeTruthy();
    const open = run(seller(), { ticket: { attachments: [], bestTime: "anytime", contact: "chat", createdAt: "", details: "Where is my money?", id: "tk-9", messages: [], ref: "", status: "open", subject: "Money", topic: "payout", urgency: "normal" }, type: "sellerCreateTicket" });
    const id = open.seller.tickets[0]!.id;
    mockParams = { id };
    renderWithProviders(<SellerTicketScreen />, open);
    fireEvent.changeText(screen.getByTestId("ticket-reply"), "Any news?");
    fireEvent.press(screen.getByTestId("ticket-send-reply"));
    expect(screen.getByText("Any news?")).toBeTruthy();
    fireEvent.press(screen.getByTestId("ticket-resolve"));
    expect(await screen.findByText(/This request is resolved/)).toBeTruthy();
  });
});

describe("sharing the store", () => {
  it("makes a tidy link, and shows the link and a QR code to share", () => {
    expect(storeSlug("Vumisa's Thrift")).toBe("vumisas-thrift");
    expect(storeLink("Campus Bites!")).toBe("https://vossie.app/s/campus-bites");
    renderWithProviders(<ShareStoreSheet onClose={() => undefined} place="Eduvos" storeId="campusbites" storeName="CampusBites" visible />, seller());
    expect(screen.getByTestId("store-qr")).toBeTruthy();
    expect(screen.getByTestId("store-link")).toBeTruthy();
    expect(screen.getByTestId("share-native")).toBeTruthy();
    expect(screen.getByTestId("share-copy")).toBeTruthy();
  });

  it("opens from the store preview", () => {
    renderWithProviders(<SellerStorePreviewScreen />, seller());
    fireEvent.press(screen.getByTestId("share-store"));
    expect(screen.getByTestId("store-qr")).toBeTruthy();
  });
});

describe("documents from the library, camera, files or a scan", () => {
  it("offers the ways to add a document, and previews, replaces and removes one", () => {
    const state = run(signedIn(), { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
    renderWithProviders(<SellerVerifyScreen />, state);
    fireEvent.press(screen.getByTestId("doc-id"));
    for (const source of ["library", "camera", "scan"]) expect(screen.getByTestId(`attach-${source}`)).toBeTruthy();
    const uploaded = run(state, { fileKind: "image", fileName: "id.jpg", kind: "id", type: "sellerUploadDocument", uri: "file:///id.jpg" });
    renderWithProviders(<SellerVerifyScreen />, uploaded);
    fireEvent.press(screen.getAllByTestId("doc-id")[screen.getAllByTestId("doc-id").length - 1]!);
    expect(screen.getByTestId("doc-preview")).toBeTruthy();
    fireEvent.press(screen.getByTestId("doc-remove"));
  });
});

describe("reels page and preview", () => {
  it("lists the reels on Account with a preview for each", () => {
    renderWithProviders(<SellerReelsPageScreen />, seller());
    expect(screen.getByTestId("seller-reels-page")).toBeTruthy();
    fireEvent.press(screen.getByTestId("preview-rl-ti30"));
    expect(mockPush).toHaveBeenCalledWith("/seller/account/reel-preview/rl-ti30");
  });

  it("shows a reel the way a buyer sees it, and pauses on a tap", () => {
    mockParams = { id: "rl-ti30" };
    renderWithProviders(<SellerReelPreviewScreen />, seller());
    expect(screen.getByTestId("preview-caption")).toBeTruthy();
    expect(screen.getByText("TI-30XS unboxing, student price")).toBeTruthy();
    expect(screen.getByTestId("preview-product")).toBeTruthy();
    fireEvent.press(screen.getByTestId("reel-surface"));
    expect(screen.getByLabelText("Play")).toBeTruthy();
    fireEvent.press(screen.getByTestId("close-preview"));
  });
});

describe("seller wallet and the student card on Account", () => {
  it("shows the balance card that flips, the payout cards and the recent money", () => {
    renderWithProviders(<SellerWalletScreen />, seller());
    expect(screen.getByTestId("seller-balance-card")).toBeTruthy();
    expect(screen.getByTestId("wallet-pending")).toBeTruthy();
    expect(screen.getByTestId("seller-wallet-actions")).toBeTruthy();
    fireEvent.press(screen.getByTestId("wallet-payout"));
    expect(screen.getByText("Withdraw to bank")).toBeTruthy();
  });

  it("shows the flipping student card and the wallet, reels and support rows on Account", () => {
    renderWithProviders(<SellerAccountScreen />, seller());
    expect(screen.getByTestId("seller-student-card")).toBeTruthy();
    for (const [row, path] of [["row-wallet", "/seller/account/wallet"], ["row-reels", "/seller/account/reels"], ["row-support", "/seller/account/support"], ["row-plans", "/seller/account/plans"]] as const) {
      fireEvent.press(screen.getByTestId(row));
      expect(mockPush).toHaveBeenCalledWith(path);
    }
  });
});

describe("product photos", () => {
  it("adds photos from the library or camera, the first being the cover, and takes one away", () => {
    mockParams = { id: "sl-ti30" };
    renderWithProviders(<SellerListingFormScreen />, run(seller(), { listing: { ...seller().seller.listings.find((item) => item.id === "sl-ti30")!, photos: ["file:///a.jpg", "file:///b.jpg"] }, type: "sellerSaveListing" }));
    expect(screen.getByText("Cover")).toBeTruthy();
    fireEvent.press(screen.getByTestId("photo-1"));
    fireEvent.press(screen.getByTestId("remove-photo-1"));
    fireEvent.press(screen.getByTestId("add-photo"));
    expect(screen.getByTestId("attach-library")).toBeTruthy();
    expect(screen.getByTestId("attach-camera")).toBeTruthy();
    expect(screen.queryByTestId("attach-scan")).toBeNull();
  });
});

describe("maps on orders and handover", () => {
  it("shows the pickup place and the drop-off on a delivery order, and the pickup alone on a collection", () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [], ok: true }) as never;
    mockParams = { id: "so-2041" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByTestId("order-map")).toBeTruthy();
    mockParams = { id: "so-2039" };
    renderWithProviders(<SellerOrderDetailScreen />, seller());
    expect(screen.getByText("Collect here")).toBeTruthy();
    global.fetch = original;
  });

  it("shows the pickup place and the courier on the handover page", () => {
    mockParams = { id: "so-2038" };
    const ready = run(seller(), { id: "so-2038", to: "ready", type: "sellerAdvanceOrder" }, { id: "so-2038", type: "sellerAssignCourier" });
    renderWithProviders(<SellerHandoverScreen />, ready);
    expect(screen.getByTestId("handover-map")).toBeTruthy();
  });
});
