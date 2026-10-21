import { fireEvent, screen } from "@testing-library/react-native";

import { registerOwnStore } from "@/data/repository";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";
import { SellerOrderDetailScreen } from "@/screens/seller/SellerOrderDetailScreen";

let mockParams: { id?: string } = {};

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/seller/orders",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

function run(state: DemoState, ...actions: DemoAction[]): DemoState {
  return actions.reduce((current, action) => demoReducer(current, action), state);
}

afterEach(() => registerOwnStore(null));

/** A student who is the seller of an approved shop and an approved courier, with one parcel that failed twice and is coming back. */
function comingBack(): { state: DemoState; sellerOrderId: string; returnCode: string } {
  let state = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { role: "seller", type: "switchRole" }, { type: "sellerStart" }, { kind: "student", type: "sellerSetKind" });
  state = run(state, { phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" }, { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" }, { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" }, { type: "sellerSubmitVerification" }, { type: "sellerReviewTick" }, { type: "sellerReviewTick" }, { patch: { description: "Books", location: "Res Block B" }, type: "sellerSaveStore" }, { type: "sellerFinishSetup" });
  let courierSide = run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }, { type: "courierStart" }, { patch: { fullName: "Vumisa Malindi", phone: "0825735164" }, type: "courierSetProfile" }, { fileName: "id.jpg", kind: "id", type: "courierUploadDocument" }, { fileName: "me.jpg", kind: "selfie", type: "courierUploadDocument" }, { type: "courierSubmitVerification" });
  for (let n = 0; n < 4; n += 1) courierSide = run(courierSide, { type: "courierReviewTick" });
  state = { ...state, courier: { ...courierSide.courier, earnings: [], jobs: [], payouts: [] }, orders: state.orders.filter((item) => item.sellerId !== "campusbites") };
  state = run(state, { role: "buyer", type: "switchRole" }, { listingId: "sl-calculus", quantity: 1, type: "addToCart" }, { type: "placeOrder" });
  const sellerOrder = state.seller.orders.find((item) => item.buyerOrderId)!;
  state = run(state, { accept: true, id: sellerOrder.id, type: "sellerRespondOrder" }, { id: sellerOrder.id, to: "preparing", type: "sellerAdvanceOrder" }, { id: sellerOrder.id, to: "ready", type: "sellerAdvanceOrder" }, { type: "courierApprovalSeen" });
  const job = state.courier.jobs.find((item) => item.source === "order")!;
  state = run(state, { online: true, type: "courierSetOnline" }, { id: job.id, type: "courierAcceptJob" }, { code: sellerOrder.courierCode, id: job.id, type: "courierConfirmPickup" }, { id: job.id, type: "courierArrive" }, { id: job.id, reason: "address", type: "courierFailAttempt" }, { id: job.id, type: "courierArrive" }, { id: job.id, reason: "refused", type: "courierFailAttempt" }, { role: "seller", type: "switchRole" });
  return { returnCode: job.returnCode, sellerOrderId: sellerOrder.id, state };
}

describe("the seller takes a failed parcel back", () => {
  it("shows the parcel coming back, refuses a wrong code and takes it with the courier's code", () => {
    const { returnCode, sellerOrderId, state } = comingBack();
    mockParams = { id: sellerOrderId };
    renderWithProviders(<SellerOrderDetailScreen />, state);
    expect(screen.getByText("A parcel is coming back")).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("return-code-input"), "0000");
    expect(screen.getByText(/not the courier's code/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("return-code-input"), returnCode);
    fireEvent.press(screen.getByTestId("confirm-return"));
    expect(screen.getByText("Parcel returned")).toBeTruthy();
  });
});
