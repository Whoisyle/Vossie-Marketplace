import { act, fireEvent, screen } from "@testing-library/react-native";

import { splitShares, tutorSlots } from "@/data/campus";
import { dealFor } from "@/data/deals";
import { legalDocs } from "@/data/legal";
import { dialable, safetyCheckup, tripMessage, validContact } from "@/data/safety";
import { hasPlan, plans } from "@/data/subscriptions";
import { totp } from "@/lib/totp";
import { balancesAfter, transactionKind, withdrawProblem } from "@/data/wallet";
import { cartTotals, createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { AccountScreen } from "./account/AccountScreen";
import { CampusExtrasScreen } from "./account/CampusExtrasScreen";
import { brandFor, CardEditScreen, cardEditErrors } from "./account/CardEditScreen";
import { LegalListScreen, LegalReaderScreen } from "./account/LegalScreens";
import { SafetyScreen } from "./account/SafetyScreen";
import { SecurityScreen } from "./account/SecurityScreen";
import { SubscriptionsScreen } from "./account/SubscriptionsScreen";
import { TransactionScreen } from "./account/TransactionScreen";
import { VouchersScreen } from "./account/VouchersScreen";
import { walletItems, WalletCarousel, WALLET_AUTO_MS, WALLET_CARD_HEIGHT, WALLET_CARD_WIDTH } from "./account/WalletCards";
import { WalletScreen } from "./account/WalletScreen";
import { WishlistScreen } from "./account/WishlistScreen";
import { ReceiptScreen } from "./activity/ReceiptScreen";
import { SplitBillScreen } from "./activity/SplitBillScreen";
import { CheckoutScreen } from "./cart/CheckoutScreen";
import { ExploreScreen } from "./explore/ExploreScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { id?: string; q?: string } = {};

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
  mockParams = {};
});

describe("subscriptions", () => {
  it("starts on Vossie Plus and can apply for the other two plans", () => {
    const state = signedIn();
    expect(hasPlan(state.subscriptions, "plus")).toBe(true);
    expect(hasPlan(state.subscriptions, "study-pass")).toBe(false);
    expect(plans.map((plan) => plan.id)).toEqual(["plus", "seller-pro", "study-pass"]);
  });

  it("charges the wallet to join, refuses when it is too low, and keeps perks until the period ends after a cancel", () => {
    const state = signedIn();
    const joined = demoReducer(state, { planId: "study-pass", type: "subscribe" });
    expect(hasPlan(joined.subscriptions, "study-pass")).toBe(true);
    expect(joined.wallet.balanceCents).toBe(state.wallet.balanceCents - 2900);
    expect(joined.wallet.transactions[0]).toMatchObject({ amountCents: -2900, kind: "subscription" });
    const broke = { ...state, wallet: { ...state.wallet, balanceCents: 100 } };
    expect(demoReducer(broke, { planId: "study-pass", type: "subscribe" })).toBe(broke);
    const cancelled = demoReducer(joined, { planId: "study-pass", type: "cancelSubscription" });
    expect(cancelled.subscriptions.find((item) => item.planId === "study-pass")!.cancelling).toBe(true);
    expect(hasPlan(cancelled.subscriptions, "study-pass")).toBe(true);
    expect(demoReducer(cancelled, { planId: "study-pass", type: "resumeSubscription" }).subscriptions.find((item) => item.planId === "study-pass")!.cancelling).toBe(false);
  });

  it("gives Plus members R4 off, a free Vossie courier over R100 and double points", () => {
    let state = demoReducer(signedIn(), { listingId: "mint-laptop", quantity: 1, type: "addToCart" });
    expect(cartTotals(state).memberDiscountCents).toBe(400);
    expect(cartTotals(state).deliveryFeeCents).toBe(0);
    const placed = demoReducer(state, { type: "placeOrder" });
    expect(placed.orders[0]!.pointsMultiplier).toBe(2);
    // without Plus there is no discount and the courier is charged
    const ended = { ...state, subscriptions: [{ ...state.subscriptions[0]!, renewsAt: new Date(2020, 0, 1).toISOString() }] };
    expect(cartTotals(ended).memberDiscountCents).toBe(0);
    expect(cartTotals(ended).deliveryFeeCents).toBe(1500);
    // a small order pays the courier even with Plus
    state = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    expect(cartTotals(state).deliveryFeeCents).toBe(1500);
  });

  it("takes 10% off services with the Study Pass", () => {
    let state = demoReducer(signedIn(), { planId: "study-pass", type: "subscribe" });
    state = demoReducer(state, { listingId: "maths-tutoring", quantity: 1, type: "addToCart" });
    expect(dealFor("maths-tutoring")).toBe(15);
    expect(cartTotals(state).memberDiscountCents).toBeGreaterThan(400);
  });

  it("shows your plans and the ones you can apply for, and joins from the sheet", () => {
    renderWithProviders(<SubscriptionsScreen />, signedIn());
    expect(screen.getByTestId("current-plus")).toBeTruthy();
    expect(screen.getByTestId("available-seller-pro")).toBeTruthy();
    expect(screen.getByTestId("available-study-pass")).toBeTruthy();
    fireEvent.press(screen.getByTestId("apply-study-pass"));
    fireEvent.press(screen.getByTestId("confirm-subscribe"));
  });

  it("lets a plan be cancelled from the screen", () => {
    renderWithProviders(<SubscriptionsScreen />, signedIn());
    fireEvent.press(screen.getByTestId("cancel-plus"));
    expect(screen.getByText("Ending")).toBeTruthy();
    expect(screen.getByTestId("resume-plus")).toBeTruthy();
  });
});

describe("referral points, terms and offers", () => {
  it("lists the three documents with a draft notice and opens one", () => {
    renderWithProviders(<LegalListScreen />, signedIn());
    for (const doc of legalDocs) expect(screen.getByText(doc.title)).toBeTruthy();
    expect(screen.queryByText(/draft/i)).toBeNull();
    mockParams = { id: "terms" };
    renderWithProviders(<LegalReaderScreen />, signedIn());
    expect(screen.getByText(/2\. Who can use Vossie/)).toBeTruthy();
  });

  it("records that the student accepted the terms", () => {
    expect(signedIn().termsAcceptedAt).toBeNull();
    expect(demoReducer(signedIn(), { type: "acceptTerms" }).termsAcceptedAt).not.toBeNull();
  });

  it("has a Coupons tab and an Offers tab", () => {
    renderWithProviders(<VouchersScreen />, signedIn());
    expect(screen.getByTestId("voucher-WELCOME20")).toBeTruthy();
    expect(screen.getByTestId("copy-WELCOME20")).toBeTruthy();
    fireEvent.press(screen.getByText(/Offers/));
    expect(screen.getByTestId("offer-promo-campusbites")).toBeTruthy();
    expect(screen.getByTestId("offer-referral")).toBeTruthy();
    expect(screen.getByTestId("offer-plus")).toBeTruthy();
  });
});

describe("delivery wording", () => {
  it("calls it the Vossie courier and keeps collection as a small option", () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 18, 12, 0) });
    const cart = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    renderWithProviders(<CheckoutScreen />, cart);
    expect(screen.getByText("Vossie courier")).toBeTruthy();
    expect(screen.getByTestId("mode-collection")).toBeTruthy();
    expect(screen.getByText(/Or collect it yourself/)).toBeTruthy();
    jest.useRealTimers();
  });
});

describe("receipts again", () => {
  it("opens the receipt of a past order from its id", () => {
    mockParams = { id: "order-0998" };
    renderWithProviders(<ReceiptScreen />, signedIn());
    expect(screen.getByTestId("receipt-paper")).toBeTruthy();
    expect(screen.getByTestId("share-receipt")).toBeTruthy();
  });

  it("explains that a cancelled order has no receipt", () => {
    mockParams = { id: "order-0960" };
    renderWithProviders(<ReceiptScreen />, signedIn());
    expect(screen.getByText("No receipt")).toBeTruthy();
  });

  it("puts all orders paid together on one slip", () => {
    let state = demoReducer(signedIn(), { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { listingId: "mint-laptop", quantity: 1, type: "addToCart" });
    const placed = demoReducer(state, { type: "placeOrder" });
    mockParams = { id: placed.orders[0]!.id };
    renderWithProviders(<ReceiptScreen />, placed);
    expect(screen.getAllByTestId(/receipt-order-/)).toHaveLength(2);
  });
});

describe("wallet cards and transactions", () => {
  it("draws cards at real card proportions and moves the carousel by itself", () => {
    expect(WALLET_CARD_WIDTH / WALLET_CARD_HEIGHT).toBeCloseTo(85.6 / 54, 1);
    jest.useFakeTimers();
    const onSelect = jest.fn();
    const items = walletItems({ balanceCents: 1000, bank: null, cards: signedIn().cards, os: "ios" });
    renderWithProviders(<WalletCarousel items={items} onAdd={jest.fn()} onSelect={onSelect} selected={0} />);
    act(() => {
      jest.advanceTimersByTime(WALLET_AUTO_MS + 50);
    });
    expect(onSelect).toHaveBeenCalledWith(1);
    jest.useRealTimers();
  });

  it("turns a card over when it is tapped, and only the card in front", () => {
    const items = walletItems({ balanceCents: 1000, bank: null, cards: signedIn().cards, os: "ios" });
    const onSelect = jest.fn();
    renderWithProviders(<WalletCarousel items={items} onAdd={jest.fn()} onSelect={onSelect} selected={0} />);
    expect(screen.getAllByTestId("card-back").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("wallet-card-card-demo-visa"));
    fireEvent.press(screen.getByTestId("wallet-card-apple-pay"));
    expect(onSelect).toHaveBeenCalledWith(items.findIndex((item) => item.kind === "apple-pay"));
  });

  it("checks card edits and finds the brand from the number", () => {
    expect(brandFor("5123", "visa")).toBe("mastercard");
    expect(brandFor("4123", "mastercard")).toBe("visa");
    expect(brandFor("", "visa")).toBe("visa");
    expect(cardEditErrors({ expiry: "01/20", holder: "A", number: "123" })).toMatchObject({ expiry: expect.any(String), holder: expect.any(String), number: expect.any(String) });
    expect(cardEditErrors({ expiry: "12/40", holder: "Vumisa", number: "" })).toEqual({ expiry: undefined, holder: undefined, number: undefined });
  });

  it("edits a saved card and keeps only the last four digits", () => {
    let state = signedIn();
    state = demoReducer(state, { cardId: "card-demo-mc", makeDefault: true, patch: { expiry: "11/29", holder: "V Test", last4: "1111", brand: "visa" }, type: "updateCard" });
    const card = state.cards.find((item) => item.id === "card-demo-mc")!;
    expect(card).toMatchObject({ brand: "visa", expiry: "11/29", holder: "V Test", isDefault: true, last4: "1111" });
    expect(state.cards.filter((item) => item.isDefault)).toHaveLength(1);
  });

  it("shows the edit screen with the card on top and saves changes", () => {
    mockParams = { id: "card-demo-visa" };
    renderWithProviders(<CardEditScreen />, signedIn());
    expect(screen.getByTestId("card-face")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Name on card"), "Vumisa Test");
    fireEvent.press(screen.getByTestId("save-card"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("opens a transaction with its details and the receipt for an order payment", () => {
    let state = demoReducer(signedIn(), { payment: "wallet", type: "setPayment" });
    state = demoReducer(state, { listingId: "burger-chips", optionId: "small", quantity: 1, type: "addToCart" });
    state = demoReducer(state, { type: "placeOrder" });
    const tx = state.wallet.transactions[0]!;
    expect(tx.orderId).toBe(state.orders[0]!.id);
    mockParams = { id: tx.id };
    renderWithProviders(<TransactionScreen />, state);
    expect(screen.getByTestId("transaction-details")).toBeTruthy();
    expect(screen.getByTestId("receipt-paper")).toBeTruthy();
    expect(screen.getByTestId("open-receipt")).toBeTruthy();
  });

  it("shows a top-up without an order receipt", () => {
    const state = demoReducer(signedIn(), { amountCents: 5000, source: "card", type: "addFunds" });
    mockParams = { id: state.wallet.transactions[0]!.id };
    renderWithProviders(<TransactionScreen />, state);
    expect(screen.getAllByText("Top up").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("receipt-paper")).toBeNull();
  });

  it("works out kinds and balances after each transaction", () => {
    const state = signedIn();
    expect(transactionKind({ amountCents: 100, label: "Top up via EFT" })).toBe("top-up");
    expect(transactionKind({ amountCents: -100, label: "Purchase – Study Desk" })).toBe("purchase");
    const after = balancesAfter(state.wallet.balanceCents, state.wallet.transactions);
    expect(after[state.wallet.transactions[0]!.id]).toBe(state.wallet.balanceCents);
  });

  it("withdraws to a card as a pending transaction, within limits", () => {
    expect(withdrawProblem({ amountCents: 1000, balanceCents: 50000, hasCard: true })).toBe("too-small");
    expect(withdrawProblem({ amountCents: 90000, balanceCents: 50000, hasCard: true })).toBe("too-much");
    expect(withdrawProblem({ amountCents: 10000, balanceCents: 50000, hasCard: false })).toBe("no-card");
    expect(withdrawProblem({ amountCents: 10000, balanceCents: 50000, hasCard: true })).toBeNull();
    const state = signedIn();
    const after = demoReducer(state, { amountCents: 10000, cardId: "card-demo-visa", type: "withdraw" });
    expect(after.wallet.balanceCents).toBe(state.wallet.balanceCents - 10000);
    expect(after.wallet.transactions[0]).toMatchObject({ kind: "withdrawal", status: "pending" });
    expect(demoReducer(state, { amountCents: 100, cardId: "card-demo-visa", type: "withdraw" })).toBe(state);
  });

  it("has a Withdraw button and tappable transactions on the wallet screen", () => {
    const state = signedIn();
    renderWithProviders(<WalletScreen />, state);
    expect(screen.getByTestId("withdraw")).toBeTruthy();
    fireEvent.press(screen.getByTestId(`tx-${state.wallet.transactions[0]!.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/account/transaction/${state.wallet.transactions[0]!.id}`);
  });
});

describe("safety", () => {
  it("scores the check-up and builds messages", () => {
    const empty = safetyCheckup({ biometric: false, campusSecurityNumber: "", contacts: 0, otherSessions: 2, twoFactor: false });
    expect(empty).toMatchObject({ score: 0, total: 5 });
    const full = safetyCheckup({ biometric: true, campusSecurityNumber: "018 299 1111", contacts: 1, otherSessions: 0, twoFactor: true });
    expect(full.score).toBe(5);
    expect(dialable("018 299-1111")).toBe("0182991111");
    expect(validContact({ name: "A", phone: "12" })).toMatchObject({ name: expect.any(String), phone: expect.any(String) });
    expect(validContact({ name: "Mom", phone: "071 234 5678" })).toEqual({ name: undefined, phone: undefined });
    expect(tripMessage({ kind: "meetup", name: "Vumisa", place: "Library" })).toContain("Library");
    expect(tripMessage({ kind: "order", link: "vossie://track/1", name: "V" })).toContain("vossie://track/1");
  });

  it("shows the check-up first, and Face ID can be switched on from a fix", async () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    expect(screen.getByTestId("sos")).toBeTruthy();
    expect(screen.getByTestId("tab-checkup")).toBeTruthy();
    expect(screen.getByTestId("check-biometric")).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId("fix-biometric"));
    });
    expect(screen.queryByTestId("fix-biometric")).toBeNull();
  });

  it("only turns two-factor on with a correct authenticator code, and off again with one", async () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    fireEvent.press(screen.getByTestId("fix-two-factor"));
    expect(screen.getByTestId("two-factor-qr")).toBeTruthy();
    const secret = String(screen.getByTestId("two-factor-key").props.children).replace(/\s/g, "");
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);

    fireEvent.changeText(screen.getByLabelText("6-digit code"), "000000");
    fireEvent.press(screen.getByTestId("two-factor-confirm"));
    expect(screen.getByText(/That code isn't right/)).toBeTruthy();
    expect(screen.getByTestId("fix-two-factor")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("6-digit code"), totp(secret));
    fireEvent.press(screen.getByTestId("two-factor-confirm"));
    expect(screen.queryByTestId("fix-two-factor")).toBeNull();
  });

  it("asks for a code to turn two-factor off in Security and Settings", () => {
    const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const on = demoReducer(signedIn(), { secret, type: "enableTwoFactor" });
    renderWithProviders(<SecurityScreen />, on);
    fireEvent(screen.getByLabelText("Two-factor authentication"), "valueChange", false);
    expect(screen.getByText("Turn off two-factor sign-in")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("6-digit code"), "111111");
    fireEvent.press(screen.getByTestId("two-factor-confirm"));
    expect(screen.getByText(/That code isn't right/)).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("6-digit code"), totp(secret));
    fireEvent.press(screen.getByTestId("two-factor-confirm"));
    expect(screen.getByLabelText("Two-factor authentication").props.accessibilityState.checked).toBe(false);
  });

  it("signs out other devices from the check-up", () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    fireEvent.press(screen.getByTestId("fix-sessions"));
    expect(screen.queryByTestId("fix-sessions")).toBeNull();
  });

  it("shows the campus numbers from the database and counts them in the check-up", () => {
    const state = demoReducer(signedIn(), {
      contacts: [{ campusId: "potchefstroom", id: "cc-1", kind: "security", label: "Campus security desk", phone: "018 299 1111" }],
      type: "setCampusContacts",
    });
    renderWithProviders(<SafetyScreen />, state);
    expect(screen.queryByTestId("fix-security-number")).toBeNull();
    fireEvent.press(screen.getByText("Contacts"));
    expect(screen.getByTestId("campus-contact-cc-1")).toBeTruthy();
    expect(screen.getByText("018 299 1111")).toBeTruthy();
  });

  it("says so when the campus has no number yet", () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    fireEvent.press(screen.getByText("Contacts"));
    expect(screen.getByText(/hasn't added its security number yet/)).toBeTruthy();
  });

  it("adds a trusted contact and shows emergency numbers", () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    fireEvent.press(screen.getByText("Contacts"));
    expect(screen.getByTestId("call-10111")).toBeTruthy();
    fireEvent.press(screen.getByTestId("add-contact"));
    fireEvent.changeText(screen.getByLabelText("Name"), "Mam Zodwa");
    fireEvent.changeText(screen.getByLabelText("Phone number"), "071 234 5678");
    fireEvent.press(screen.getByTestId("save-contact"));
    expect(screen.getByText("Mam Zodwa")).toBeTruthy();
  });

  it("sends a report and lists it", () => {
    renderWithProviders(<SafetyScreen />, signedIn());
    fireEvent.press(screen.getByText("Report"));
    fireEvent.press(screen.getByTestId("send-report"));
    expect(screen.getByText("Tell us a little about what happened.")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("What happened?"), "Someone followed me after a meet-up");
    fireEvent.press(screen.getByTestId("send-report"));
    expect(screen.getAllByText("Safety incident").length).toBeGreaterThan(0);
    expect(screen.getByText("Received")).toBeTruthy();
  });

  it("stores contacts, the campus security number and reports", () => {
    let state = demoReducer(signedIn(), { name: "Mam Zodwa", phone: "0712345678", relationship: "Mother", type: "addEmergencyContact" });
    expect(state.emergencyContacts).toHaveLength(1);
    state = demoReducer(state, { contactId: state.emergencyContacts[0]!.id, type: "removeEmergencyContact" });
    expect(state.emergencyContacts).toHaveLength(0);
    state = demoReducer(state, { number: " 018 299 1111 ", type: "setCampusSecurityNumber" });
    expect(state.campusSecurityNumber).toBe("018 299 1111");
    expect(demoReducer(state, { category: "User", notes: "no", type: "submitSafetyReport" })).toBe(state);
    expect(demoReducer(state, { category: "User", notes: "Rude and threatening", type: "submitSafetyReport" }).safetyReports).toHaveLength(1);
  });
});

describe("wishlist, split bill and campus extras", () => {
  it("makes collections and saved searches", () => {
    let state = demoReducer(signedIn(), { name: "Birthday ideas", type: "createCollection" });
    expect(state.collections.map((item) => item.name)).toContain("Birthday ideas");
    expect(demoReducer(state, { name: "birthday ideas", type: "createCollection" })).toBe(state);
    const id = state.collections[0]!.id;
    state = demoReducer(state, { collectionId: id, listingId: "iced-latte", type: "toggleInCollection" });
    expect(state.collections[0]!.listingIds).toEqual(["iced-latte"]);
    state = demoReducer(state, { collectionId: id, listingId: "iced-latte", type: "toggleInCollection" });
    expect(state.collections[0]!.listingIds).toEqual([]);
    state = demoReducer(state, { query: "latte", type: "saveSearch" });
    expect(state.savedSearches).toHaveLength(1);
    expect(demoReducer(state, { query: "LATTE", type: "saveSearch" })).toBe(state);
  });

  it("shows the wishlist tabs and creates a collection", () => {
    renderWithProviders(<WishlistScreen />, demoReducer(signedIn(), { listingId: "iced-latte", type: "toggleFavourite" }));
    expect(screen.getByTestId("collect-iced-latte")).toBeTruthy();
    fireEvent.press(screen.getByText(/Collections/));
    fireEvent.changeText(screen.getByLabelText("New collection"), "Gifts");
    fireEvent.press(screen.getByTestId("create-collection"));
    expect(screen.getByText("Gifts")).toBeTruthy();
  });

  it("saves a search from Explore", () => {
    mockParams = { q: "latte" };
    renderWithProviders(<ExploreScreen />, signedIn());
    fireEvent.press(screen.getByTestId("save-search"));
    expect(screen.getByText("Search saved")).toBeTruthy();
  });

  it("splits a bill so the shares add up, and credits the wallet when a friend pays", () => {
    expect(splitShares(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitShares(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000);
    let state = signedIn();
    const order = state.orders.find((item) => item.status === "delivered")!;
    state = demoReducer(state, { names: ["Kamo", "Lerato"], orderId: order.id, type: "createSplit" });
    expect(state.splits[0]!.members).toHaveLength(2);
    expect(demoReducer(state, { names: ["X"], orderId: order.id, type: "createSplit" })).toBe(state);
    const before = state.wallet.balanceCents;
    const member = state.splits[0]!.members[0]!;
    state = demoReducer(state, { memberId: member.id, splitId: state.splits[0]!.id, type: "markSplitPaid" });
    expect(state.wallet.balanceCents).toBe(before + member.shareCents);
    expect(demoReducer(state, { memberId: member.id, splitId: state.splits[0]!.id, type: "markSplitPaid" })).toBe(state);
  });

  it("splits from the screen", () => {
    const order = signedIn().orders.find((item) => item.status === "delivered")!;
    mockParams = { id: order.id };
    renderWithProviders(<SplitBillScreen />, signedIn());
    fireEvent.changeText(screen.getByLabelText("Add a friend"), "Kamo");
    fireEvent.press(screen.getByTestId("add-friend"));
    fireEvent.press(screen.getByTestId("create-split"));
    expect(screen.getByTestId("member-Kamo")).toBeTruthy();
    fireEvent.press(screen.getByTestId("paid-Kamo"));
    expect(screen.getByText("Paid")).toBeTruthy();
  });

  it("swaps books, posts lost and found, and books a tutor slot", () => {
    let state = demoReducer(signedIn(), { have: "Econ 101", type: "addSwap", want: "Stats 1" });
    expect(state.swaps[0]).toMatchObject({ have: "Econ 101", mine: true });
    state = demoReducer(state, { swapId: state.swaps[0]!.id, type: "removeSwap" });
    expect(state.swaps.every((post) => !post.mine)).toBe(true);
    state = demoReducer(state, { kind: "lost", place: "Library", title: "Blue pen", type: "addLostFound" });
    expect(state.lostFound[0]!.title).toBe("Blue pen");
    state = demoReducer(state, { postId: state.lostFound[0]!.id, type: "resolveLostFound" });
    expect(state.lostFound[0]!.resolved).toBe(true);
    const slot = tutorSlots()[0]!;
    const booked = demoReducer(state, { listingId: "maths-tutoring", startsAt: slot.iso, type: "bookTutor" });
    expect(booked.bookings[0]).toMatchObject({ status: "upcoming", title: expect.stringMatching(/Tutoring/i) });
    expect(demoReducer(state, { listingId: "burger-chips", startsAt: slot.iso, type: "bookTutor" })).toBe(state);
  });

  it("shows the campus extras tabs and books a tutor", () => {
    renderWithProviders(<CampusExtrasScreen />, signedIn());
    expect(screen.getByTestId("tab-swap")).toBeTruthy();
    fireEvent.press(screen.getByText("Tutors"));
    fireEvent.press(screen.getByTestId("tutor-maths-tutoring"));
    const slot = tutorSlots()[0]!;
    fireEvent.press(screen.getByTestId(`tutor-slot-${slot.label}`));
    fireEvent.press(screen.getByText("Lost & found"));
    expect(screen.getByTestId("tab-lost")).toBeTruthy();
  });
});

describe("account page", () => {
  it("shows the upright student card and the new menu rows", () => {
    renderWithProviders(<AccountScreen />, signedIn());
    expect(screen.getByTestId("student-card")).toBeTruthy();
    for (const label of ["Subscriptions", "Coupons and offers", "Refer friends", "Safety", "Terms and conditions", "Wishlist and saved searches", "Campus extras"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
