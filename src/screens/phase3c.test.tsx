import { act, fireEvent, screen } from "@testing-library/react-native";

import { dayLabel } from "@/data/format";
import { getPromo, promoDefs, promoListings, promoPercent } from "@/data/promos";
import type { Conversation, Message } from "@/data/types";
import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { filterConversations, InboxScreen, sortConversations } from "./account/InboxScreen";
import { SecurityScreen, securityScore } from "./account/SecurityScreen";
import { deliveryStatus, groupByDay, quickReplies, ThreadScreen } from "./account/ThreadScreen";
import { initialIndex, walletItems } from "./account/WalletCards";
import { WalletScreen } from "./account/WalletScreen";
import { ART_IDS, hasArt } from "@/components/art/ProductArt";
import { listings } from "@/data/mock/catalog";

import { ActivityScreen } from "./activity/ActivityScreen";
import { MyOrdersScreen } from "./activity/MyOrdersScreen";
import { CampusExtrasScreen } from "./account/CampusExtrasScreen";
import { HelpScreen } from "./account/HelpScreen";
import { SafetyScreen } from "./account/SafetyScreen";
import { WishlistScreen } from "./account/WishlistScreen";
import { HomeScreen } from "./home/HomeScreen";
import { PromoCarousel, PROMOS } from "./home/PromoCarousel";
import { PromoScreen } from "./promo/PromoScreen";

const mockPush = jest.fn();
let mockParams: { id: string } = { id: "promo-campusbites" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/home",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: jest.fn() }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockParams = { id: "promo-campusbites" };
});

describe("Wallet cards", () => {
  it("lists saved cards, Apple Pay, Google Pay, the wallet, instant EFT and add-a-card", () => {
    const items = walletItems({ balanceCents: 24500, bank: null, cards: signedIn().cards, os: "ios" });
    expect(items.map((item) => item.kind)).toEqual(["card", "card", "apple-pay", "google-pay", "wallet", "eft", "add"]);
    expect(items.find((item) => item.kind === "apple-pay")).toMatchObject({ ready: true });
    expect(items.find((item) => item.kind === "google-pay")).toMatchObject({ ready: false });
    expect(initialIndex(items)).toBe(0);
  });

  it("shows the carousel and lets a card be made default or removed", () => {
    renderWithProviders(<WalletScreen />, signedIn());
    expect(screen.getByTestId("wallet-carousel")).toBeTruthy();
    expect(screen.getByTestId("wallet-card-card-demo-visa")).toBeTruthy();
    expect(screen.getByTestId("wallet-card-apple-pay")).toBeTruthy();
    expect(screen.getByTestId("wallet-card-eft")).toBeTruthy();
    // tapping the card in front turns it over; the Edit button opens it for editing
    fireEvent.press(screen.getByTestId("wallet-card-card-demo-visa"));
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId("edit-card"));
    expect(mockPush).toHaveBeenCalledWith("/account/card/card-demo-visa");
    // tapping another option selects it and shows its actions
    fireEvent.press(screen.getByTestId("wallet-card-eft"));
    expect(screen.getByText("Choose bank")).toBeTruthy();
  });

  it("keeps a default after the default card is removed", () => {
    let state = signedIn();
    state = demoReducer(state, { cardId: "card-demo-visa", type: "removeCard" });
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]!.isDefault).toBe(true);
    state = demoReducer(state, { cardId: "card-demo-mc", type: "removeCard" });
    expect(state.cards).toHaveLength(0);
  });
});

describe("Security and settings", () => {
  it("scores the protections", () => {
    expect(securityScore({ biometric: false, otherSessions: 2, twoFactor: true })).toEqual({ score: 1, total: 3 });
    expect(securityScore({ biometric: true, otherSessions: 0, twoFactor: true })).toEqual({ score: 3, total: 3 });
  });

  it("has sections for privacy, notifications, app and data, and toggles a setting", async () => {
    renderWithProviders(<SecurityScreen />, signedIn());
    for (const title of ["Sign in and security", "Privacy", "Notifications", "App", "Your data"]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText("0 of 3 protections on")).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByLabelText("Face ID or Touch ID"), "valueChange", true);
    });
    expect(screen.getByText("1 of 3 protections on")).toBeTruthy();
  });

  it("shows and clears blocked people", () => {
    renderWithProviders(<SecurityScreen />, signedIn());
    fireEvent.press(screen.getByText("Blocked people"));
    expect(screen.getByText("Sam K.")).toBeTruthy();
    fireEvent.press(screen.getByText("Unblock"));
    expect(screen.getByText(/You haven't blocked anyone/)).toBeTruthy();
  });
});

describe("Promotions", () => {
  it("point at a real store or category", () => {
    expect(promoDefs.length).toBeGreaterThanOrEqual(4);
    for (const def of promoDefs) {
      expect(promoListings(def).deals.length + promoListings(def).others.length).toBeGreaterThan(0);
    }
    expect(promoPercent(getPromo("promo-fashion")!)).toBe(30);
  });

  it("opens the promotion page from a banner", () => {
    renderWithProviders(<PromoCarousel onPress={(promo) => mockPush(`/home/promo/${promo.id}`)} width={393} />);
    fireEvent.press(screen.getByLabelText(/Lunch deals at CampusBites/));
    expect(mockPush).toHaveBeenCalledWith("/home/promo/promo-campusbites");
  });

  it("shows each banner's product with its name, price and discount", () => {
    renderWithProviders(<PromoCarousel width={393} />);
    expect(screen.getByLabelText(/Burger & Chips, R 48, 20 percent off/)).toBeTruthy();
    expect(screen.getAllByText("-20%").length).toBeGreaterThan(0);
    for (const promo of PROMOS) {
      expect(promo.product).toBeTruthy();
      expect(hasArt(promo.product!.id)).toBe(true);
    }
  });

  it("shows the discounted listings first, then the rest of the store", () => {
    renderWithProviders(<PromoScreen />, signedIn());
    expect(screen.getByText("Up to 20% off")).toBeTruthy();
    expect(screen.getByText("On promotion (1)")).toBeTruthy();
    expect(screen.getByTestId("listing-card-burger-chips")).toBeTruthy();
    fireEvent.press(screen.getByText("Visit the store"));
    expect(mockPush).toHaveBeenCalledWith("/home/store/campusbites");
  });

  it("lists a category's deals before the rest, under a 'More in' heading", () => {
    mockParams = { id: "promo-fashion" };
    renderWithProviders(<PromoScreen />, signedIn());
    const text = JSON.stringify(screen.toJSON());
    expect(text.indexOf("listing-card-bomber-jacket")).toBeLessThan(text.indexOf("listing-card-tote-bag"));
    expect(text.indexOf("listing-card-denim-jacket")).toBeLessThan(text.indexOf("listing-card-bomber-jacket"));
    expect(text.indexOf("On promotion")).toBeLessThan(text.indexOf("More in Fashion"));
  });

  it("handles a promotion that does not exist", () => {
    mockParams = { id: "nope" };
    renderWithProviders(<PromoScreen />, signedIn());
    expect(screen.getByText("Promotion not found")).toBeTruthy();
  });
});

describe("Messages helpers", () => {
  const msg = (id: string, fromMe: boolean, sentAt: string, body = id): Message => ({ body, fromMe, id, sentAt });
  const conv = (id: string, kind: Conversation["kind"], messages: Message[], unread = false): Conversation => ({ id, kind, messages, name: id, unread });
  const now = new Date(2026, 9, 18, 12, 0);

  it("sorts newest first and filters by kind, unread and search", () => {
    const a = conv("a", "seller", [msg("m1", false, new Date(2026, 9, 18, 9, 0).toISOString(), "Jacket?")], true);
    const b = conv("b", "support", [msg("m2", false, new Date(2026, 9, 18, 11, 0).toISOString(), "Resolved")]);
    expect(sortConversations([a, b]).map((c) => c.id)).toEqual(["b", "a"]);
    expect(filterConversations([a, b], "unread", "").map((c) => c.id)).toEqual(["a"]);
    expect(filterConversations([a, b], "support", "").map((c) => c.id)).toEqual(["b"]);
    expect(filterConversations([a, b], "all", "jacket").map((c) => c.id)).toEqual(["a"]);
  });

  it("labels days and groups messages by day", () => {
    const today = new Date(2026, 9, 18, 8, 0).toISOString();
    const yesterday = new Date(2026, 9, 17, 8, 0).toISOString();
    expect(dayLabel(today, now)).toBe("Today");
    expect(dayLabel(yesterday, now)).toBe("Yesterday");
    const groups = groupByDay([msg("1", true, yesterday), msg("2", false, today), msg("3", true, today)], now);
    expect(groups.map((group) => [group.label, group.messages.length])).toEqual([["Yesterday", 1], ["Today", 2]]);
  });

  it("marks my last message read once they reply, and suggests replies by kind", () => {
    expect(deliveryStatus([msg("1", true, "x")])).toEqual({ id: "1", text: "Delivered" });
    expect(deliveryStatus([msg("1", true, "x"), msg("2", false, "y")])).toEqual({ id: "1", text: "Read" });
    expect(deliveryStatus([msg("1", false, "x")])).toBeNull();
    expect(quickReplies("courier")).toContain("I'm at the gate");
    expect(quickReplies("seller")[0]).toMatch(/available/);
  });
});

describe("Messages screens", () => {
  it("filters the inbox and opens a conversation", () => {
    renderWithProviders(<InboxScreen />, signedIn());
    expect(screen.getByTestId("conversation-conv-support")).toBeTruthy();
    fireEvent.press(screen.getByText("Support"));
    expect(screen.queryByTestId("conversation-conv-kamo")).toBeNull();
    fireEvent.press(screen.getByTestId("conversation-conv-support"));
    expect(mockPush).toHaveBeenCalledWith("/account/inbox/conv-support");
  });

  it("sends a quick reply and a safe meet-up spot", () => {
    mockParams = { id: "conv-kamo" };
    renderWithProviders(<ThreadScreen />, signedIn());
    fireEvent.press(screen.getByText("Where can we meet?"));
    expect(screen.getAllByText("Where can we meet?").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("meet-spot"));
    fireEvent.press(screen.getByText("Library"));
    expect(screen.getByText("Suggested meet-up spot")).toBeTruthy();
    expect(screen.getAllByText("Library").length).toBeGreaterThan(0);
  });

  it("blocks the person from the conversation menu", () => {
    mockParams = { id: "conv-kamo" };
    renderWithProviders(<ThreadScreen />, signedIn());
    fireEvent.press(screen.getByTestId("thread-more"));
    fireEvent.press(screen.getByText("Block Kamo Dlamini"));
    expect(screen.getByText(/You blocked Kamo Dlamini/)).toBeTruthy();
  });

  it("shows the order card on a courier conversation", () => {
    let state = signedIn();
    state = demoReducer(state, { conversationId: "courier-order-1001", kind: "courier", name: "Linda M.", orderId: "order-1001", type: "openConversation" });
    mockParams = { id: "courier-order-1001" };
    renderWithProviders(<ThreadScreen />, state);
    expect(screen.getByTestId("thread-order")).toBeTruthy();
    expect(screen.getByText("I'm at the gate")).toBeTruthy();
  });
});

describe("Product drawings and the notification bell", () => {
  it("gives every listing its own drawing instead of a photo", () => {
    expect(ART_IDS.length).toBeGreaterThanOrEqual(32);
    for (const listing of listings) {
      expect(hasArt(listing.id)).toBe(true);
      expect(listing.images[0]).toBe(`art:${listing.id}`);
    }
  });

  it("opens the notifications screen from the bell", () => {
    renderWithProviders(<HomeScreen />, signedIn());
    fireEvent.press(screen.getByLabelText(/^Notifications/));
    expect(mockPush).toHaveBeenCalledWith("/home/notifications");
  });
});

describe("Page heroes", () => {
  it.each([
    ["orders-hero", () => <MyOrdersScreen />],
    ["wishlist-hero", () => <WishlistScreen />],
    ["inbox-hero", () => <InboxScreen />],
    ["help-hero", () => <HelpScreen />],
    ["activity-hero", () => <ActivityScreen />],
    ["safety-hero", () => <SafetyScreen />],
    ["campus-hero", () => <CampusExtrasScreen />],
  ])("shows %s", (testID, render) => {
    renderWithProviders(render(), signedIn());
    expect(screen.getByTestId(testID)).toBeTruthy();
  });
});
