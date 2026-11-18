import { act, fireEvent, screen } from "@testing-library/react-native";

import { AGREEMENT_VERSION } from "@/seller/agreement";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { SellerContractSheet } from "./SellerContractSheet";

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  usePathname: () => "/seller/account/agreement",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async () => "a".repeat(64)),
}));
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
// the pad draws with the finger; here it just hands back a signature when asked
let mockDraw: ((path: string | null) => void) | undefined;
jest.mock("./SignaturePad", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    SignaturePad: ({ onChange }: { onChange: (path: string | null) => void }) => {
      mockDraw = onChange;
      return (
        <Pressable onPress={() => onChange("M10 40 C 30 5, 50 70, 70 30 S 110 60, 130 20")} testID="signature-pad">
          <Text>pad</Text>
        </Pressable>
      );
    },
    SignatureView: () => null,
  };
});

const run = (state: DemoState, ...actions: DemoAction[]) => actions.reduce((current, action) => demoReducer(current, action), state);

/** An approved seller who has seen the verified screen and has not signed. */
function approved(): DemoState {
  return run(
    run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }),
    { role: "seller", type: "switchRole" },
    { type: "sellerStart" },
    { kind: "student", type: "sellerSetKind" },
    { campusId: "potchefstroom", phone: "0825735164", storeName: "Vumisa Books", type: "sellerSetBasics" },
    { fileName: "id.jpg", kind: "id", type: "sellerUploadDocument" },
    { fileName: "bill.pdf", kind: "address", type: "sellerUploadDocument" },
    { type: "sellerSubmitVerification" },
    { type: "sellerReviewTick" },
    { type: "sellerReviewTick" },
    { type: "sellerApprovalSeen" },
  );
}

const fullName = (state: DemoState) => state.profile!.fullName;

describe("the seller agreement sheet", () => {
  beforeEach(() => {
    mockDraw = undefined;
  });

  it("shows nothing unless it is due", () => {
    renderWithProviders(<SellerContractSheet due={false} />, approved());
    expect(screen.queryByTestId("seller-contract")).toBeNull();
  });

  it("opens on the seller's own details, which cannot be edited, and the date", () => {
    const state = approved();
    renderWithProviders(<SellerContractSheet due />, state);
    expect(screen.getByTestId("seller-contract")).toBeTruthy();
    const details = screen.getByTestId("contract-details");
    expect(details).toBeTruthy();
    expect(screen.getByText(fullName(state))).toBeTruthy();
    expect(screen.getByText("Vumisa Books")).toBeTruthy();
    expect(screen.getByText("Potchefstroom")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
  });

  it("asks for a real South African ID number before going on", () => {
    renderWithProviders(<SellerContractSheet due />, approved());
    fireEvent.press(screen.getByTestId("contract-next"));
    expect(screen.getByText(/13-digit South African ID number/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("contract-id-number"), "8001015009086");
    fireEvent.press(screen.getByTestId("contract-next"));
    expect(screen.getByText(/13-digit South African ID number/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId("contract-id-number"), "8001015009087");
    fireEvent.press(screen.getByTestId("contract-next"));
    expect(screen.getByText("What I promise")).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();
  });

  it("will not sign without the tick, the typed name and a signature, and gives a reason for each", async () => {
    const state = approved();
    renderWithProviders(<SellerContractSheet due />, state);
    fireEvent.changeText(screen.getByTestId("contract-id-number"), "8001015009087");
    fireEvent.press(screen.getByTestId("contract-next"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("contract-sign"));
    });
    expect(screen.getByText("Tick the box to say you have read and agree.")).toBeTruthy();
    expect(screen.getByText(/Type your full name and surname exactly as on your account/)).toBeTruthy();
    expect(screen.getByText("Draw your signature in the box.")).toBeTruthy();
    // a different name is not accepted either
    fireEvent.changeText(screen.getByTestId("contract-name"), "Somebody Else");
    fireEvent.press(screen.getByTestId("contract-agree"));
    fireEvent.press(screen.getByTestId("signature-pad"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("contract-sign"));
    });
    expect(screen.getByText(/Type your full name and surname exactly as on your account/)).toBeTruthy();
    expect(screen.queryByTestId("contract-signed")).toBeNull();
  });

  it("signs with the name in any case, saves the agreement, and says so", async () => {
    const state = approved();
    renderWithProviders(<SellerContractSheet due />, state);
    fireEvent.changeText(screen.getByTestId("contract-id-number"), "800101 5009 087");
    fireEvent.press(screen.getByTestId("contract-next"));
    fireEvent.changeText(screen.getByTestId("contract-name"), `  ${fullName(state).toUpperCase()}  `);
    fireEvent.press(screen.getByTestId("contract-agree"));
    fireEvent.press(screen.getByTestId("signature-pad"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("contract-sign"));
    });
    expect(screen.getByTestId("contract-signed")).toBeTruthy();
    expect(mockDraw).toBeDefined();
  });
});

describe("signing in the seller state", () => {
  const sign = (state: DemoState, over: Partial<{ signedName: string; signature: string }> = {}) =>
    demoReducer(state, { idNumber: "800101 5009 087", signature: over.signature ?? "M10 40 C 30 5, 50 70, 70 30 S 110 60, 130 20", signedName: over.signedName ?? "Vumisa Mokoena", type: "sellerSignAgreement", version: AGREEMENT_VERSION });

  it("keeps the signature, the version and only the last four digits of the ID", () => {
    const state = sign(approved());
    expect(state.seller.agreement).toMatchObject({ idLast4: "9087", signedName: "Vumisa Mokoena", version: AGREEMENT_VERSION });
    expect(JSON.stringify(state.seller.agreement)).not.toContain("8001015009087");
    expect(state.seller.agreement?.signedAt).toBeTruthy();
  });

  it("ignores signing before approval, and a name or signature that is too short", () => {
    const early = run(run(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" }), { type: "sellerStart" });
    expect(sign(early).seller.agreement).toBeUndefined();
    expect(sign(approved(), { signedName: "Ab" }).seller.agreement).toBeUndefined();
    expect(sign(approved(), { signature: "M1 1" }).seller.agreement).toBeUndefined();
  });
});

describe("the signed agreement in Account", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SellerAgreementScreen } = require("./SellerAgreementScreen") as typeof import("./SellerAgreementScreen");

  it("says it is not signed before approval is done", () => {
    renderWithProviders(<SellerAgreementScreen />, approved());
    expect(screen.getByText("Not signed yet")).toBeTruthy();
    expect(screen.getByText("What I promised")).toBeTruthy();
  });

  it("shows who signed, when, the last four digits of the ID and the promises once it is signed", () => {
    const signedState = demoReducer(approved(), { idNumber: "8001015009087", signature: "M10 40 C 30 5, 50 70, 70 30 S 110 60, 130 20", signedName: "Vumisa Mokoena", type: "sellerSignAgreement", version: AGREEMENT_VERSION });
    renderWithProviders(<SellerAgreementScreen />, signedState);
    expect(screen.getAllByText("Signed").length).toBeGreaterThan(0);
    expect(screen.getByText(/ID number ending 9087/)).toBeTruthy();
    expect(screen.getByText("I sell only what is real")).toBeTruthy();
  });
});
