import { fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { OperationsReviewScreen } from "./OperationsReview";

jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useFocusEffect: jest.fn(), useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock("expo-image", () => ({ Image: () => null }));

const run = (state: DemoState, ...actions: DemoAction[]) => actions.reduce((current, action) => demoReducer(current, action), state);

/** A seller who has sent in an ID with both sides and a proof of address, waiting in review. */
function waiting(withBack = true): DemoState {
  return run(
    run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }),
    { role: "seller", type: "switchRole" },
    { type: "sellerStart" },
    { kind: "student", type: "sellerSetKind" },
    { phone: "0825735164", storeName: "Vumisa Books", type: "sellerSetBasics" },
    { backFileName: withBack ? "id-back.jpg" : undefined, backUri: withBack ? "file:///id-back.jpg" : undefined, fileKind: "image", fileName: "id-front.jpg", kind: "id", type: "sellerUploadDocument", uri: "file:///id-front.jpg" },
    { fileKind: "pdf", fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument", uri: "file:///bill.pdf" },
    { type: "sellerSubmitVerification" },
  );
}

describe("Operations document review", () => {
  it("shows the front and back of an ID and keeps Accept locked until every check is ticked", () => {
    renderWithProviders(<OperationsReviewScreen />, waiting());
    expect(screen.getAllByText("Vumisa Books", { exact: false })).toHaveLength(2);
    expect(screen.getByTestId("shot-front")).toBeTruthy();
    expect(screen.getByTestId("shot-back")).toBeTruthy();
    expect(screen.queryByTestId("review-no-back")).toBeNull();
    const accept = screen.getByTestId("accept-id");
    expect(accept.props.accessibilityState).toMatchObject({ disabled: true });
    for (const index of [0, 1, 2]) fireEvent.press(screen.getByTestId(`check-id-${index}`));
    expect(screen.getByTestId("accept-id").props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("warns when an ID came without its back", () => {
    renderWithProviders(<OperationsReviewScreen />, waiting(false));
    expect(screen.getByTestId("review-no-back")).toBeTruthy();
  });

  it("accepts a document, and approves the seller when the last one is accepted", () => {
    renderWithProviders(<OperationsReviewScreen />, waiting());
    for (const index of [0, 1, 2]) fireEvent.press(screen.getByTestId(`check-id-${index}`));
    fireEvent.press(screen.getByTestId("accept-id"));
    expect(screen.queryByTestId("review-id")).toBeNull();
    for (const index of [0, 1, 2]) fireEvent.press(screen.getByTestId(`check-address-${index}`));
    fireEvent.press(screen.getByTestId("accept-address"));
    expect(screen.getByTestId("review-empty")).toBeTruthy();
  });

  it("turns a document down with a reason the seller will read", () => {
    renderWithProviders(<OperationsReviewScreen />, waiting());
    fireEvent.press(screen.getByTestId("reject-id"));
    expect(screen.getByTestId("review-reasons")).toBeTruthy();
    fireEvent.press(screen.getByText("The photo is blurry. Take it again in good light."));
    expect(screen.queryByTestId("review-id")).toBeNull();
    expect(screen.getByTestId("review-address")).toBeTruthy();
  });

  it("says so when nothing is waiting", () => {
    renderWithProviders(<OperationsReviewScreen />, run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }));
    expect(screen.getByTestId("review-empty")).toBeTruthy();
  });
});
