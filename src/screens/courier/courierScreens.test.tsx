import { act, fireEvent, screen } from "@testing-library/react-native";

import { balanceCents } from "@/courier/state";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";
import { TrackOrderScreen } from "@/screens/activity/TrackOrderScreen";

import { CourierAccountScreen, CourierDocumentsScreen, CourierNotificationsScreen, CourierPerformanceScreen, CourierSupportScreen } from "./CourierAccountScreens";
import { CourierOfferSheet } from "./CourierPush";
import { AvailabilityEditor } from "./CourierScheduleScreens";
import { CourierWalletScreen } from "./CourierWalletScreen";
import { CourierWelcomeScreen } from "./CourierWelcomeScreen";
import { CourierActiveListScreen, CourierActiveScreen } from "./CourierDeliveryScreens";
import { CourierHomeScreen } from "./CourierHomeScreen";
import { CourierJobsScreen, CourierRequestScreen } from "./CourierJobsScreens";
import { CourierEarningsScreen, CourierStatementsScreen } from "./CourierMoneyScreens";
import { CourierChatScreen, CourierConfirmScreen, CourierFailedScreen } from "./CourierProofScreens";
import { CourierDetailsScreen, CourierVerifyScreen } from "./CourierSetupScreens";

/** A licence date a little over a year away, so it is valid and inside the five years a licence lasts. */
const SOON_ISO = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: { id?: string; with?: string } = {};

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
  // approval gives an experienced demo courier's past; these tests want a brand new courier
  state = { ...state, courier: { ...state.courier, bank: undefined, earnings: [], jobs: [], offersAccepted: 0, offersSeen: 0, payouts: [] } };
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
  it("asks for a name and a South African number before going on, never for an ID number, then goes to the identity step", () => {
    renderWithProviders(<CourierDetailsScreen />, run(signedIn(), { role: "courier", type: "switchRole" }));
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("courier-name"), "");
    fireEvent.changeText(screen.getByTestId("courier-phone"), "12345");
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(screen.getByText("Enter your full name")).toBeTruthy();
    expect(screen.getByText(/Enter a South African mobile number/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByTestId("id-number")).toBeNull();
    fireEvent.changeText(screen.getByTestId("courier-name"), "Vumisa Malindi");
    fireEvent.changeText(screen.getByTestId("courier-phone"), "082 573 5164");
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/verify");
  });

  it("asks a scooter or car courier for the make, model, colour and number plate before going on", () => {
    renderWithProviders(<CourierDetailsScreen />, run(signedIn(), { role: "courier", type: "switchRole" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164" }, type: "courierSetProfile" }));
    expect(screen.queryByTestId("vehicle-details")).toBeNull();
    fireEvent.press(screen.getByTestId("chip-car"));
    expect(screen.getByTestId("vehicle-details")).toBeTruthy();
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(screen.getByText("Choose a make")).toBeTruthy();
    expect(screen.getByText("Use a South African plate, like CA 123-456 or ABC 123 GP")).toBeTruthy();
    expect(screen.getByText(/Enter the licence number as printed/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    // the model list is for the make that was chosen, and a made-up plate or licence number is refused
    fireEvent.press(screen.getByTestId("vehicle-make"));
    fireEvent.press(screen.getByTestId("option-Toyota"));
    fireEvent.press(screen.getByTestId("vehicle-model"));
    expect(screen.getByTestId("option-Corolla")).toBeTruthy();
    expect(screen.queryByTestId("option-Primavera")).toBeNull();
    fireEvent.press(screen.getByTestId("option-Corolla"));
    fireEvent.press(screen.getByTestId("vehicle-colour"));
    fireEvent.press(screen.getByTestId("option-White"));
    fireEvent.changeText(screen.getByTestId("vehicle-plate"), "hello");
    fireEvent.changeText(screen.getByTestId("licence-number"), "123");
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId("vehicle-plate"), "ca 123 456");
    fireEvent.changeText(screen.getByTestId("licence-number"), "ZA12345678AB");
    fireEvent.press(screen.getByTestId("courier-continue"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/verify");
  });

  it("welcomes a new courier with the map story and starts the setup", () => {
    renderWithProviders(<CourierWelcomeScreen />, run(signedIn(), { role: "courier", type: "switchRole" }));
    expect(screen.getByTestId("courier-welcome")).toBeTruthy();
    expect(screen.getByText("Deliver.")).toBeTruthy();
    expect(screen.getByText("Earn.")).toBeTruthy();
    expect(screen.getByText("Repeat.")).toBeTruthy();
    expect(screen.getByTestId("welcome-week")).toBeTruthy();
    expect(screen.getByTestId("welcome-bars")).toBeTruthy();
    expect(screen.getByText("Example numbers. What you earn depends on the deliveries you do.")).toBeTruthy();
    fireEvent.press(screen.getByTestId("courier-start"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/details");
  });

  it("lists the four checks, shows how many are done and sends the documents for review", () => {
    const state = run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" });
    renderWithProviders(<CourierVerifyScreen />, state);
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    expect(screen.getByText("2 of 3 checks complete")).toBeTruthy();
    expect(screen.getByText("ID document")).toBeTruthy();
    expect(screen.getByText("Background check")).toBeTruthy();
    fireEvent.press(screen.getByTestId("courier-submit"));
    expect(mockPush).toHaveBeenCalledWith("/courier-setup/availability");
  });

  it("asks a scooter courier for the licence and its date, and will not go on without them", () => {
    let state = run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { vehicle: "scooter", vehicleInfo: { colour: "Red", make: "Vespa", model: "Primavera", plate: "ABC 123 GP" } }, type: "courierSetProfile" });
    state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" });
    renderWithProviders(<CourierVerifyScreen />, state);
    expect(screen.getByText("Driving licence")).toBeTruthy();
    expect(screen.getByTestId("licence-expiry-card")).toBeTruthy();
    fireEvent.press(screen.getByTestId("courier-submit"));
    expect(screen.getByText("Add your driving licence to go on.")).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByTestId("licence-expiry"), "99/99/2027");
    expect(screen.getByText("Use the date as 25/12/2027")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("licence-expiry"), "01/01/2020");
    expect(screen.getByText("That licence has already expired")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("licence-expiry"), "01/01/2099");
    expect(screen.getByText("A licence lasts five years, so that date is too far away")).toBeTruthy();
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
    expect(screen.getByText("3 jobs in your zones")).toBeTruthy();
    fireEvent.press(screen.getByTestId("chip-pay"));
    fireEvent.press(screen.getByTestId("chip-quick"));
    fireEvent.press(screen.getByTestId("jobs-filter"));
    fireEvent.press(screen.getByText("Within 2 km"));
    expect(screen.queryByText("3 jobs in your zones")).toBeNull();
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

  it("shows what was earned, a chart you can tap, and sends Cash out to the wallet once there is enough", () => {
    const state = delivered();
    renderWithProviders(<CourierEarningsScreen />, state);
    expect(screen.getByText("1 delivery")).toBeTruthy();
    expect(screen.getByTestId("earnings-chart")).toBeTruthy();
    fireEvent.press(screen.getByTestId("bar-0"));
    expect(screen.getByText("Weekly payout")).toBeTruthy();
    expect(balanceCents(state.courier)).toBeGreaterThan(0);
    // a few rand is under the smallest withdrawal, so the button waits
    fireEvent.press(screen.getByTestId("cash-out"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens the wallet from Cash out when the balance is enough", () => {
    const state = delivered();
    const rich = { ...state, courier: { ...state.courier, earnings: [{ at: new Date().toISOString(), cents: 30000, id: "e1", jobId: "j", kind: "tip" as const, number: "#VM-1" }, ...state.courier.earnings] } };
    renderWithProviders(<CourierEarningsScreen />, rich);
    fireEvent.press(screen.getByTestId("cash-out"));
    expect(mockPush).toHaveBeenCalledWith("/courier/account/wallet");
  });

  it("shows the wallet like the other roles: the balance card, the payout options, transactions, and a withdraw sheet that asks for a bank the first time", () => {
    const state = delivered();
    const rich = { ...state, courier: { ...state.courier, earnings: [{ at: new Date().toISOString(), cents: 30000, id: "e1", jobId: "j", kind: "tip" as const, number: "#VM-1" }, ...state.courier.earnings] } };
    renderWithProviders(<CourierWalletScreen />, rich);
    expect(screen.getByTestId("courier-balance-card")).toBeTruthy();
    expect(screen.getByText("Cards and payout options")).toBeTruthy();
    expect(screen.getByText("Recent transactions")).toBeTruthy();
    expect(screen.getByText("Demo wallet: no real money moves.")).toBeTruthy();
    expect(screen.getByTestId("tx-e1")).toBeTruthy();
    fireEvent.press(screen.getByTestId("wallet-withdraw"));
    expect(screen.getByText("Withdraw to bank")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("withdraw-amount"), "100");
    fireEvent.press(screen.getByTestId("withdraw-confirm"));
    expect(screen.getByText("Choose your bank and enter the account holder and a 6 to 12 digit account number.")).toBeTruthy();
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

  it("shows the student card, the level and badges, and a vehicle card with the plate for a car", () => {
    let state = courier();
    state = run(state, { patch: { vehicle: "car", vehicleInfo: { colour: "White", make: "Toyota", model: "Corolla", plate: "CA 123-456" } }, type: "courierSetProfile" }, { expiresAt: SOON_ISO, fileName: "l.jpg", kind: "licence", type: "courierUploadDocument" });
    renderWithProviders(<CourierAccountScreen />, state);
    expect(screen.getByTestId("courier-student-card")).toBeTruthy();
    expect(screen.getByTestId("level-card")).toBeTruthy();
    expect(screen.getByTestId("level-name").props.children).toBe("New");
    expect(screen.getByTestId("badge-first")).toBeTruthy();
    expect(screen.getByText("White Toyota Corolla · CA 123-456")).toBeTruthy();
    expect(screen.getByTestId("row-wallet")).toBeTruthy();
    expect(screen.getByTestId("refer-card")).toBeTruthy();
    fireEvent.press(screen.getByTestId("row-wallet"));
    expect(mockPush).toHaveBeenCalledWith("/courier/account/wallet");
  });

  it("lets the courier update the licence date and the vehicle in Documents", () => {
    let state = courier();
    state = run(state, { patch: { licenceNumber: "ZA12345678AB", vehicle: "scooter", vehicleInfo: { colour: "Red", make: "Vespa", model: "Primavera", plate: "ABC 123 GP" } }, type: "courierSetProfile" }, { expiresAt: SOON_ISO, fileName: "l.jpg", kind: "licence", type: "courierUploadDocument" });
    renderWithProviders(<CourierDocumentsScreen />, state);
    expect(screen.getByText("Driving licence")).toBeTruthy();
    expect(screen.getByTestId("licence-card")).toBeTruthy();
    fireEvent.press(screen.getByTestId("vehicle-colour"));
    fireEvent.press(screen.getByTestId("option-Blue"));
    fireEvent.press(screen.getByTestId("vehicle-save"));
    expect(screen.getByText("Vehicle saved. Buyers see it on tracking.")).toBeTruthy();
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

describe("hours, zones and offers", () => {
  it("shows when the courier is on duty, takes a break, finishes for today and lists the zones of the campus", () => {
    renderWithProviders(<AvailabilityEditor />, courier());
    expect(screen.getByTestId("work-status")).toBeTruthy();
    expect(screen.getByTestId("radar")).toBeTruthy();
    expect(screen.getByTestId("auto-offline")).toBeTruthy();
    expect(screen.getByTestId("day-mon")).toBeTruthy();
    expect(screen.getByText("Mooirivier Mall")).toBeTruthy();
    expect(screen.getByTestId("zone-map")).toBeTruthy();
    fireEvent.press(screen.getByTestId("break-15"));
    expect(screen.getByText("On a break")).toBeTruthy();
    fireEvent.press(screen.getByTestId("resume"));
    fireEvent.press(screen.getByTestId("finish-today"));
    expect(screen.getByText("You are offline")).toBeTruthy();
  });

  it("switches a zone off, opens the zone search and has a longest trip", () => {
    renderWithProviders(<AvailabilityEditor setup />, courier());
    expect(screen.queryByTestId("work-status")).toBeNull();
    fireEvent.press(screen.getByTestId("zone-toggle-campus"));
    fireEvent.press(screen.getByTestId("add-zone"));
    expect(screen.getAllByText("Add a zone").length).toBeGreaterThan(1);
    expect(screen.getByTestId("zone-search")).toBeTruthy();
    expect(screen.getByText("Longest delivery")).toBeTruthy();
  });

  it("brings an offer up from the bottom with the route, the pay and a slide to accept", () => {
    const state = courier();
    const job = state.courier.jobs[0]!;
    const onAccept = jest.fn();
    jest.useFakeTimers();
    renderWithProviders(<CourierOfferSheet job={job} loud={false} onAccept={onAccept} onClose={jest.fn()} onDecline={jest.fn()} onOpen={jest.fn()} />, state);
    expect(screen.getByTestId("courier-offer")).toBeTruthy();
    expect(screen.getByText(`NEW DELIVERY · ${job.number}`)).toBeTruthy();
    expect(screen.getByText("You earn")).toBeTruthy();
    expect(screen.getByTestId("courier-offer-timer")).toBeTruthy();
    fireEvent(screen.getByTestId("courier-offer-accept"), "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(onAccept).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

/** The same approved courier but with the experienced demo history kept, so every page has something in it. */
function experienced(): DemoState {
  let state = run(signedIn(), { role: "courier", type: "switchRole" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164" }, type: "courierSetProfile" });
  state = run(state, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" }, { type: "courierSubmitVerification" });
  for (let n = 0; n < 4; n += 1) state = run(state, { type: "courierReviewTick" });
  return run(state, { type: "courierApprovalSeen" }, { online: true, type: "courierSetOnline" });
}

describe("goal, streak, busy areas, statements and the seller chat", () => {
  it("lets the courier set a weekly goal on Home and shows the streak and the busy areas", () => {
    renderWithProviders(<CourierHomeScreen />, experienced());
    expect(screen.getByText("Set a weekly goal")).toBeTruthy();
    expect(screen.getByTestId("streak")).toBeTruthy();
    expect(screen.getByTestId("busy-areas")).toBeTruthy();
    expect(screen.getByTestId("area-campus")).toBeTruthy();
    fireEvent.press(screen.getByTestId("goal-home"));
    fireEvent.press(screen.getByTestId("goal-100000"));
    expect(screen.getByText(/of R 1 000/)).toBeTruthy();
    expect(screen.getByText("Weekly goal")).toBeTruthy();
  });

  it("shows an experienced courier's numbers: a rating, deliveries done and a level on Account", () => {
    renderWithProviders(<CourierAccountScreen />, experienced());
    expect(screen.getByTestId("level-name").props.children).toBe("Trusted");
    expect(screen.getByTestId("badge-first")).toBeTruthy();
    expect(screen.getByText(/badges/)).toBeTruthy();
  });

  it("lists weekly and monthly statements and opens one to see its deliveries", () => {
    renderWithProviders(<CourierStatementsScreen />, experienced());
    expect(screen.getByTestId("statement-0")).toBeTruthy();
    fireEvent.press(screen.getByTestId("statement-0"));
    expect(screen.getAllByText(/deliveries ·/).length).toBeGreaterThan(1);
    fireEvent.press(screen.getByTestId("chip-month"));
    expect(screen.getByTestId("statement-0")).toBeTruthy();
  });

  it("says a demo job has no seller to message, and offers the buyer and seller tabs", () => {
    const state = courier();
    mockParams = { id: state.courier.jobs[0]!.id, with: "seller" };
    renderWithProviders(<CourierChatScreen />, state);
    expect(screen.getByTestId("chip-buyer")).toBeTruthy();
    expect(screen.getByTestId("chip-seller")).toBeTruthy();
    expect(screen.getByText("Demo job")).toBeTruthy();
  });
});
