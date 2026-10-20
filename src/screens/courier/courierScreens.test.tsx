import { act, fireEvent, screen } from "@testing-library/react-native";

import { balanceCents } from "@/courier/state";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";
import { TrackOrderScreen } from "@/screens/activity/TrackOrderScreen";

import { CourierAccountScreen, CourierNotificationsScreen, CourierPerformanceScreen, CourierSupportScreen } from "./CourierAccountScreens";
import { CourierActiveListScreen, CourierActiveScreen } from "./CourierDeliveryScreens";
import { CourierHomeScreen } from "./CourierHomeScreen";
import { CourierJobsScreen, CourierRequestScreen } from "./CourierJobsScreens";
import { CourierEarningsScreen } from "./CourierMoneyScreens";
import { CourierConfirmScreen, CourierFailedScreen } from "./CourierProofScreens";
import { CourierDetailsScreen, CourierVerifyScreen } from "./CourierSetupScreens";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: { id?: string } = {};

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/courier/home",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: mockReplace }),
}));

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

function signedIn(): DemoState {
  return run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

/** A student who is an approved courier, in courier mode, online with three demo offers. */
function courier(): DemoState {
  let state = run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164" }, type: "courierSetProfile" });
  state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" }, { type: "courierSubmitVerification" });
  for (let n = 0; n < 4; n += 1) state = run(state, { type: "courierReviewTick" });
  return run(state, { type: "courierApprovalSeen" }, { online: true, type: "courierSetOnline" });
}

/** The same courier with the first demo job collected and ridden to the door. */
function atTheDoor(): { state: DemoState; id: string; deliveryCode: string; pickupCode: string } {
  let state = courier();
  const job = state.courier.jobs[0]!;
  state = run(state, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, progress: 1, type: "courierProgress" }, { id: job.id, type: "courierArrive" });
  return { deliveryCode: job.deliveryCode, id: job.id, pickupCode: job.pickupCode, state };
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = {};
});

describe("becoming a courier", () => {
  it("asks for a name and a South African number before going on, then goes to the identity step", () => {
    renderWithProviders(<CourierDetailsScreen />, run(signedIn(), { role: "courier", type: "switchRole" }));
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("courier-name"), "");
    fireEvent.changeText(screen.getByTestId("courier-phone"), "12345");
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(screen.getByText("Enter your full name")).toBeTruthy();
    expect(screen.getByText(/Enter a South African mobile number/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId("courier-name"), "Vumisa Malindi");
    fireEvent.changeText(screen.getByTestId("courier-phone"), "082 573 5164");
    fireEvent.press(screen.getByTestId("vehicle-scooter"));
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/verify");
  });

  it("lists the four checks, shows how many are done and sends the documents for review", () => {
    const state = run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" });
    renderWithProviders(<CourierVerifyScreen />, state);
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(screen.getByText("2 of 4 checks complete")).toBeTruthy();
    expect(screen.getByText("ID document")).toBeTruthy();
    expect(screen.getByText("Background check")).toBeTruthy();
    fireEvent.press(screen.getByTestId("courier-submit"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/availability");
  });

  it("will not send the documents without an ID and a selfie", () => {
    renderWithProviders(<CourierVerifyScreen />, run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }));
    fireEvent.press(screen.getByTestId("courier-submit"));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("home and the jobs list", () => {
  it("shows offline until the courier goes online, then the offer with a countdown and its demo label", () => {
    const offline = run(courier(), { online: false, type: "courierSetOnline" });
    renderWithProviders(<CourierHomeScreen />, offline);
    expect(screen.getAllByText("You are offline").length).toBeGreaterThan(0);
    fireEvent(screen.getByTestId("online-toggle"), "press");
    expect(screen.getByText("You are online")).toBeTruthy();
    expect(screen.getByText("Demo job")).toBeTruthy();
    expect(screen.getByText(/Expires \d:\d\d/)).toBeTruthy();
    expect(screen.getByText("Rating")).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
  });

  it("takes an offer from Home and opens the delivery", () => {
    const state = courier();
    renderWithProviders(<CourierHomeScreen />, state);
    fireEvent.press(screen.getByTestId(`accept-${state.courier.jobs[0]!.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/courier/active/${state.courier.jobs[0]!.id}`);
  });

  it("lists the offers by distance, pay or speed, and filters by distance", () => {
    renderWithProviders(<CourierJobsScreen />, courier());
    expect(screen.getByText("3 jobs near you")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-pay"));
    fireEvent.press(screen.getByTestId("chip-quick"));
    fireEvent.press(screen.getByTestId("jobs-filter"));
    fireEvent.press(screen.getByText("Within 2 km"));
    expect(screen.queryByText("3 jobs near you")).toBeNull();
  });

  it("says you are offline instead of showing offers", () => {
    renderWithProviders(<CourierJobsScreen />, run(courier(), { online: false, type: "courierSetOnline" }));
    expect(screen.getAllByText("You are offline").length).toBeGreaterThan(0);
    expect(screen.queryByText("Accept")).toBeNull();
  });

  it("shows a request with the parcel, the items without prices, the payout, and accepts it", () => {
    const state = courier();
    const job = state.courier.jobs[0]!;
    mockParams = { id: job.id };
    renderWithProviders(<CourierRequestScreen />, state);
    expect(screen.getByText("Delivery request")).toBeTruthy();
    expect(screen.getByText("Parcel")).toBeTruthy();
    expect(screen.getByText("Estimated payout")).toBeTruthy();
    expect(screen.getByText("Scientific calculator")).toBeTruthy();
    expect(screen.queryByText(/R 280/)).toBeNull();
    fireEvent.press(screen.getByTestId("accept-delivery"));
    expect(mockReplace).toHaveBeenCalledWith(`/courier/active/${job.id}`);
  });

  it("declines a request", () => {
    const state = courier();
    mockParams = { id: state.courier.jobs[0]!.id };
    renderWithProviders(<CourierRequestScreen />, state);
    fireEvent.press(screen.getByTestId("decline"));
    expect(screen.getByText("Offer declined")).toBeTruthy();
  });
});

describe("a delivery from pickup to the door", () => {
  it("only lets the collection be confirmed with the right code, a photo and the two checks", () => {
    const base = courier();
    const job = base.courier.jobs[0]!;
    const state = run(base, { id: job.id, type: "courierAcceptJob" });
    mockParams = { id: job.id };
    renderWithProviders(<CourierActiveScreen />, state);
    expect(screen.getByText("Pickup")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("pickup-code"), "0000");
    expect(screen.getByText(/not the code the seller has/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("pickup-code"), job.pickupCode);
    expect(screen.getByText("Code matches")).toBeTruthy();
    fireEvent.press(screen.getByTestId("check-label"));
    fireEvent.press(screen.getByTestId("check-sealed"));
    // no photo yet, so the button does nothing
    fireEvent.press(screen.getByTestId("confirm-collection"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows the road to the buyer, locks the arrival slide until the courier is close and unlocks it near the door", () => {
    const base = courier();
    const job = base.courier.jobs[0]!;
    let state = run(base, { id: job.id, type: "courierAcceptJob" }, { code: job.pickupCode, id: job.id, type: "courierConfirmPickup" });
    mockParams = { id: job.id };
    const view = renderWithProviders(<CourierActiveScreen />, state);
    expect(screen.getByText("On the way")).toBeTruthy();
    expect(screen.getByText(/Keep going/)).toBeTruthy();
    expect(screen.getByTestId("slide-arrive").props.accessibilityState.disabled).toBe(true);
    view.unmount();
    state = run(state, { id: job.id, progress: 0.95, type: "courierProgress" });
    renderWithProviders(<CourierActiveScreen />, state);
    expect(screen.getByTestId("slide-arrive").props.accessibilityState.disabled).toBe(false);
  });

  it("asks for the buyer's code and refuses a wrong one, then delivers with the right one", () => {
    const { deliveryCode, id, state } = atTheDoor();
    mockParams = { id };
    renderWithProviders(<CourierConfirmScreen />, state);
    fireEvent.changeText(screen.getByTestId("delivery-code"), "0000");
    expect(screen.getByText(/not the buyer's code/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("confirm-delivery"));
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId("delivery-code"), deliveryCode);
    fireEvent.press(screen.getByTestId("confirm-delivery"));
    expect(mockReplace).toHaveBeenCalledWith(`/courier/active/detail/${id}`);
  });

  it("locks the photo proof unless the buyer allowed leave-at-door", () => {
    const { id, state } = atTheDoor();
    mockParams = { id };
    renderWithProviders(<CourierConfirmScreen />, state);
    expect(screen.getByText("The buyer has not allowed leave-at-door")).toBeTruthy();
    fireEvent.press(screen.getByTestId("proof-signature"));
    expect(screen.getByTestId("signature-pad")).toBeTruthy();
  });

  it("reports a failed delivery, and an unreachable buyer can only be reported after the wait", () => {
    const { id, state } = atTheDoor();
    mockParams = { id };
    renderWithProviders(<CourierFailedScreen />, state);
    expect(screen.getByText("Delivery failed")).toBeTruthy();
    expect(screen.getByText(/Attempt 1 of 2/)).toBeTruthy();
    expect(screen.getByTestId("wait-banner")).toBeTruthy();
    expect(screen.getByText(/Wait at the door/)).toBeTruthy();
    fireEvent.press(screen.getByTestId("submit-failed"));
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("reason-unsafe"));
    fireEvent.press(screen.getByTestId("submit-failed"));
    expect(mockReplace).toHaveBeenCalledWith(`/courier/active/${id}`);
  });

  it("lists active, upcoming, done and cancelled deliveries", () => {
    const { state } = atTheDoor();
    renderWithProviders(<CourierActiveListScreen />, state);
    expect(screen.getByText("1 active · 0 upcoming")).toBeTruthy();
    expect(screen.getByText("At the door")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-done"));
    expect(screen.getByText("No deliveries yet")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-cancelled"));
    expect(screen.getByText("Nothing cancelled")).toBeTruthy();
  });
});

describe("money, score, notifications and support", () => {
  function delivered(): DemoState {
    const { deliveryCode, id, state } = atTheDoor();
    return run(state, { code: deliveryCode, id, proof: "otp", type: "courierConfirmDelivery" });
  }

  it("shows what was earned, a chart you can tap, and asks for bank details before the first cash out", () => {
    const state = delivered();
    renderWithProviders(<CourierEarningsScreen />, state);
    expect(screen.getByText("1 delivery")).toBeTruthy();
    expect(screen.getByTestId("earnings-chart")).toBeTruthy();
    fireEvent.press(screen.getByTestId("bar-0"));
    expect(screen.getByText("Weekly payout")).toBeTruthy();
    expect(balanceCents(state.courier)).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("bank-details"));
    fireEvent.changeText(screen.getByTestId("bank-input"), "FNB 1234");
    fireEvent.press(screen.getByTestId("bank-save"));
    expect(screen.getByText("Bank details saved")).toBeTruthy();
  });

  it("scores a new courier honestly: no rating until a student rates, and the rates start from the first delivery", () => {
    renderWithProviders(<CourierPerformanceScreen />, delivered());
    expect(screen.getByText("Building your score")).toBeTruthy();
    expect(screen.getByText("Based on 1 delivery")).toBeTruthy();
    expect(screen.getByText("Acceptance rate")).toBeTruthy();
    expect(screen.getByText("No feedback yet")).toBeTruthy();
  });

  it("lists notifications, filters them and marks them read", () => {
    renderWithProviders(<CourierNotificationsScreen />, delivered());
    expect(screen.getAllByText("New").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("chip-jobs"));
    fireEvent.press(screen.getByTestId("chip-all"));
    fireEvent.press(screen.getByTestId("mark-read"));
    expect(screen.queryByText("New")).toBeNull();
  });

  it("opens the SOS sheet with real emergency numbers and sends it as an urgent case", () => {
    renderWithProviders(<CourierSupportScreen />, courier());
    fireEvent.press(screen.getByTestId("sos-button"));
    expect(screen.getByText("Send an SOS?")).toBeTruthy();
    expect(screen.getByText("SAPS · 10111")).toBeTruthy();
    fireEvent.press(screen.getByTestId("sos-send"));
    expect(screen.getByText("SOS sent")).toBeTruthy();
  });

  it("sends a message to Vossie Operations as a case", () => {
    renderWithProviders(<CourierSupportScreen />, courier());
    fireEvent.press(screen.getByTestId("row-ops"));
    fireEvent.changeText(screen.getByTestId("case-text"), "My bike has a flat tyre");
    fireEvent.press(screen.getByTestId("case-send"));
    expect(screen.getByText(/Case #S-118/)).toBeTruthy();
  });

  it("shows the account and moves to buying", () => {
    renderWithProviders(<CourierAccountScreen />, courier());
    expect(screen.getByText("Vumisa Malindi")).toBeTruthy();
    expect(screen.getByText("Verified")).toBeTruthy();
    fireEvent.press(screen.getByTestId("row-switch"));
    fireEvent.press(screen.getByText("Buyer"));
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});

describe("the buyer's side of a courier delivery", () => {
  it("shows the delivery code on the tracking page while the courier is on the way, and the leave-at-door choice", () => {
    let state = courier();
    // a buyer's own order, handed to the courier
    state = run(state, { listingId: "burger-chips", quantity: 1, type: "addToCart" }, { type: "placeOrder" });
    const order = state.orders[0]!;
    const job = { ...state.courier.jobs[0]!, buyerOrderId: order.id, source: "order" as const, status: "on-the-way" as const };
    state = { ...state, courier: { ...state.courier, jobs: [job, ...state.courier.jobs.slice(1)] }, orders: state.orders.map((item) => (item.id === order.id ? { ...item, status: "on-the-way" as const } : item)) };
    mockParams = { id: order.id };
    renderWithProviders(<TrackOrderScreen />, state);
    expect(screen.getByTestId("delivery-code-card")).toBeTruthy();
    expect(screen.getByTestId("delivery-code").props.children).toBe(job.deliveryCode.split("").join(" "));
    expect(screen.getByText("Allow the courier to leave it at my door")).toBeTruthy();
    act(() => {
      fireEvent.press(screen.getByTestId("leave-at-door"));
    });
    expect(screen.getByText(/Leave at my door is on/)).toBeTruthy();
    expect(screen.queryByTestId("mark-delivered")).toBeNull();
  });
});
