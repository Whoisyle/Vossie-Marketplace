import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { StudentCard, cardHeight, landscapeHeight } from "@/components/StudentCard";
import { groupCode, memberShares } from "@/data/group";
import { legalDocs } from "@/data/legal";
import { MIN_WITHDRAW_CENTS } from "@/data/wallet";
import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { LegalReaderScreen } from "./account/LegalScreens";
import { CardFace, CardSurface, WALLET_CARD_HEIGHT, WALLET_CARD_WIDTH } from "./account/WalletCards";
import { GroupOrderScreen } from "./cart/GroupOrderScreen";

const mockPush = jest.fn();
let mockParams: { id?: string } = {};

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/cart",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: jest.fn() }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockParams = {};
});

describe("minimum withdrawal", () => {
  it("is R60", () => {
    expect(MIN_WITHDRAW_CENTS).toBe(6000);
    const state = signedIn();
    expect(demoReducer(state, { amountCents: 5900, cardId: "card-demo-visa", type: "withdraw" })).toBe(state);
    expect(demoReducer(state, { amountCents: 6000, cardId: "card-demo-visa", type: "withdraw" }).wallet.balanceCents).toBe(state.wallet.balanceCents - 6000);
  });
});

describe("card sizes", () => {
  it("draws bank and wallet cards horizontally and the student card upright, at real card proportions", () => {
    expect(WALLET_CARD_WIDTH / WALLET_CARD_HEIGHT).toBeCloseTo(85.6 / 54, 1);
    expect(landscapeHeight(300)).toBe(189);
    expect(cardHeight(300)).toBe(476);
    expect(320 / cardHeight(320)).toBeCloseTo(54 / 85.6, 2);
  });

  it("gives the card face and the balance card the same shape", () => {
    renderWithProviders(
      <>
        <CardFace card={{ ...signedIn().cards[0]!, issuer: undefined }} width={300} />
        <CardSurface colors={["#000000", "#111111"]} testID="surface" width={300}>
          <Text>Balance</Text>
        </CardSurface>
      </>,
    );
    const shape = expect.arrayContaining([expect.objectContaining({ height: landscapeHeight(300), width: 300 })]);
    expect(screen.getByTestId("card-face").props.style).toEqual(shape);
    expect(screen.getByTestId("surface").props.style).toEqual(shape);
  });

  it("draws the student card like the Eduvos reference", () => {
    renderWithProviders(<StudentCard campusName="Potchefstroom" name="Vumisa" studentNumber="202309530" width={320} />);
    expect(screen.getByTestId("student-card")).toBeTruthy();
    expect(screen.getByText("DISPLAY NAME")).toBeTruthy();
    expect(screen.getByText("Vumisa")).toBeTruthy();
    expect(screen.getByLabelText("HID")).toBeTruthy();
  });
});

describe("terms and policies", () => {
  it("has five documents written for Vossie, none marked as a draft", () => {
    expect(legalDocs.map((doc) => doc.id)).toEqual(["terms", "refunds", "seller", "privacy", "community"]);
    const all = JSON.stringify(legalDocs);
    expect(all).not.toMatch(/draft|legal review|lorem/i);
    for (const needle of [
      "Vossie Wallet",
      "Vossie Points",
      "one-time code",
      "48-hour",
      "R60",
      "hub to hub",
      "POPIA",
      "Protection of Personal Information Act",
      "Consumer Protection Act",
      "Electronic Communications and Transactions Act",
      "Information Regulator",
      "Vossie Plus",
    ]) {
      expect(all).toContain(needle);
    }
  });

  it("matches the numbers used in the app", () => {
    const text = JSON.stringify(legalDocs);
    for (const needle of ["R49 a month", "R99 a month", "R29 a month", "200 points", "15 minutes", "24 hours"]) {
      expect(text).toContain(needle);
    }
  });

  it("opens the refunds policy and the seller terms", () => {
    mockParams = { id: "refunds" };
    const first = renderWithProviders(<LegalReaderScreen />, signedIn());
    expect(screen.getByText(/1\. Cancel before the seller accepts/)).toBeTruthy();
    first.unmount();
    mockParams = { id: "seller" };
    renderWithProviders(<LegalReaderScreen />, signedIn());
    expect(screen.getByText(/Fees and payouts/)).toBeTruthy();
  });
});

describe("group orders", () => {
  it("makes codes and splits shared costs so shares add up", () => {
    expect(groupCode("Flat 4B", 1234)).toMatch(/^GRP-FLAT4B-[0-9A-Z]{2}$/);
    const shares = memberShares({ deliveryCents: 1500, discountCents: 400, hostId: "a", itemCentsByMember: { a: 5000, b: 3000, c: 0 }, memberIds: ["a", "b", "c"] });
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(5000 + 3000 + 1500 - 400);
    expect(shares.b).toBe(3000 + 366);
  });

  it("builds a basket, checks out together and creates the split by what each person added", () => {
    let state = demoReducer(signedIn(), { name: "Flat 4B", type: "startGroup" });
    expect(state.group!.members).toHaveLength(1);
    state = demoReducer(state, { name: "Kamo", type: "addGroupMember" });
    state = demoReducer(state, { name: "kamo", type: "addGroupMember" });
    expect(state.group!.members).toHaveLength(2);
    const [host, kamo] = state.group!.members;
    state = demoReducer(state, { listingId: "burger-chips", memberId: host!.id, optionId: "small", type: "addGroupItem" });
    state = demoReducer(state, { listingId: "iced-latte", memberId: kamo!.id, optionId: "regular", type: "addGroupItem" });
    state = demoReducer(state, { listingId: "tablet-desk", memberId: kamo!.id, type: "addGroupItem" });
    expect(state.group!.lines).toHaveLength(2);

    state = demoReducer(state, { type: "groupCheckout" });
    expect(state.cart).toHaveLength(2);
    expect(state.group!.status).toBe("checkout");
    state = demoReducer(state, { type: "placeOrder" });
    expect(state.group!.status).toBe("placed");
    const split = state.splits[0]!;
    expect(split.members).toHaveLength(1);
    expect(split.members[0]!.name).toBe("Kamo");
    expect(split.members[0]!.shareCents).toBeGreaterThan(2800);
    expect(split.totalCents).toBe(state.lastReceipt!.totalCents);
  });

  it("starts, adds friends and items, and checks out from the screen", () => {
    renderWithProviders(<GroupOrderScreen />, signedIn());
    fireEvent.changeText(screen.getByLabelText("Group name"), "Flat 4B");
    fireEvent.press(screen.getByTestId("start-group"));
    expect(screen.getByTestId("group-code")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Add a friend"), "Kamo");
    fireEvent.press(screen.getByTestId("add-group-friend"));
    expect(screen.getByTestId("group-member-Kamo")).toBeTruthy();
    fireEvent.press(screen.getByTestId("add-item-Kamo"));
    fireEvent.press(screen.getByTestId("choose-burger-chips"));
    fireEvent.press(screen.getByTestId("group-checkout"));
    expect(mockPush).toHaveBeenCalledWith("/cart/checkout");
  });
});
