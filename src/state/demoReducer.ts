import {
  loginEventsSeed,
  returningProfiles,
  savedCardsSeed,
  subscriberDiscountCents,
  vouchers,
  walletSeed,
} from "@/data/mock/account";
import {
  bookingsSeed,
  conversationsSeed,
  notificationsSeed,
  ordersSeed,
  recentActivitySeed,
} from "@/data/mock/activity";
import { reelsSeed, reviewsSeed } from "@/data/mock/content";
import { effectivePrice } from "@/data/deals";
import { deliveryEtaMinutes, deliveryFee, fulfilmentFor, type DeliveryMode, type ThirdPartyTier } from "@/data/delivery";
import { getListing, getSeller } from "@/data/repository";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { lookupStudentRecord } from "@/data/studentRecord";
import type {
  ActivityItem,
  AppSettings,
  BlockedUser,
  Booking,
  CampusId,
  CartLine,
  Conversation,
  Fulfilment,
  LoginEvent,
  NotificationItem,
  Order,
  PaymentMethod,
  Profile,
  Reel,
  Review,
  Role,
  SavedCard,
  WalletTransaction,
} from "@/data/types";

export type Receipt = {
  orderIds: string[];
  number: string;
  placedAt: string;
  itemCount: number;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
};

export type DemoState = {
  profile: Profile | null;
  isNewUser: boolean;
  knownProfiles: Profile[];
  /** The student's preferred delivery option; used to pre-select at checkout when it is available. */
  preferredDelivery: DeliveryMode | null;
  favourites: string[];
  following: string[];
  /** Listings opened most recently, newest first. */
  recentViews: string[];
  /** Last searches, newest first. */
  recentSearches: string[];
  reviews: Review[];
  cart: CartLine[];
  checkout: {
    fulfilment: Fulfilment;
    address: string;
    /** The map pin for the delivery address, when one was chosen. */
    addressPoint: { latitude: number; longitude: number } | null;
    payment: PaymentMethod;
    cardId: string | null;
    bank: string | null;
    /** How the items from the student's own campus are delivered. */
    deliveryMode: DeliveryMode;
    /** How items from other campuses are delivered: hub to hub or a third-party courier. */
    remoteMode: DeliveryMode;
    thirdPartyTier: ThirdPartyTier;
    voucherCode: string | null;
  };
  orders: Order[];
  bookings: Booking[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  activity: ActivityItem[];
  wallet: { balanceCents: number; transactions: WalletTransaction[] };
  cards: SavedCard[];
  twoFactor: boolean;
  settings: AppSettings;
  blocked: BlockedUser[];
  loginEvents: LoginEvent[];
  reels: Reel[];
  likedReels: string[];
  lastReceipt: Receipt | null;
};

export function createInitialState(): DemoState {
  return {
    profile: null,
    isNewUser: false,
    knownProfiles: returningProfiles,
    preferredDelivery: null,
    favourites: ["mint-laptop"],
    following: ["plato-coffee"],
    recentViews: [],
    recentSearches: [],
    reviews: reviewsSeed,
    cart: [],
    checkout: {
      fulfilment: "delivery",
      address: "123 Campus Drive, Eduvos Potchefstroom, Meyer Street, 2531",
      addressPoint: null,
      payment: "apple-pay",
      cardId: null,
      bank: null,
      deliveryMode: "campus-courier",
      remoteMode: "hub-to-hub",
      thirdPartyTier: "standard",
      voucherCode: null,
    },
    orders: ordersSeed,
    bookings: bookingsSeed,
    conversations: conversationsSeed,
    notifications: notificationsSeed,
    activity: recentActivitySeed,
    wallet: { balanceCents: walletSeed.balanceCents, transactions: walletSeed.transactions },
    cards: savedCardsSeed,
    twoFactor: true,
    settings: DEFAULT_SETTINGS,
    blocked: [{ blockedAt: daysAgoIso(12), id: "user-blocked-1", name: "Sam K." }],
    loginEvents: loginEventsSeed,
    reels: reelsSeed,
    likedReels: [],
    lastReceipt: null,
  };
}

export type DemoAction =
  | { type: "signIn"; email: string }
  | { type: "completeProfile"; profile: Omit<Profile, "id" | "isVerifiedStudent" | "role"> }
  | { type: "updateProfile"; patch: Partial<Pick<Profile, "fullName" | "phone" | "campusId" | "avatarUri">> }
  | { type: "signOut" }
  | { type: "deleteAccount" }
  | { type: "switchRole"; role: Role }
  | { type: "toggleFavourite"; listingId: string }
  | { type: "viewListing"; listingId: string }
  | { type: "addSearch"; query: string }
  | { type: "clearSearches" }
  | { type: "addReview"; listingId: string; rating: 1 | 2 | 3 | 4 | 5; body: string }
  | { type: "toggleFollow"; sellerId: string }
  | { type: "addToCart"; listingId: string; optionId?: string; quantity: number }
  | { type: "setCartQuantity"; lineId: string; quantity: number }
  | { type: "setFulfilment"; fulfilment: Fulfilment }
  | { type: "setDeliveryMode"; mode: DeliveryMode; group?: "local" | "remote" }
  | { type: "setThirdPartyTier"; tier: ThirdPartyTier }
  | { type: "setPreferredDelivery"; mode: DeliveryMode | null }
  | { type: "setAddress"; address: string; point?: { latitude: number; longitude: number } | null }
  | { type: "setPayment"; payment: PaymentMethod; cardId?: string | null; bank?: string | null }
  | { type: "applyVoucher"; code: string | null }
  | { type: "placeOrder" }
  | { type: "addCard"; card: Omit<SavedCard, "id" | "isDefault">; makeDefault: boolean }
  | { type: "removeCard"; cardId: string }
  | { type: "setDefaultCard"; cardId: string }
  | { type: "addFunds"; amountCents: number; source: string }
  | { type: "sendMessage"; conversationId: string; body: string; place?: string }
  | { type: "openConversation"; conversationId: string; name?: string; kind?: Conversation["kind"]; orderId?: string }
  | { type: "markConversationRead"; conversationId: string }
  | { type: "markNotificationsRead" }
  | { type: "setTwoFactor"; enabled: boolean }
  | { type: "setSetting"; key: keyof AppSettings; value: AppSettings[keyof AppSettings] }
  | { type: "unblockUser"; userId: string }
  | { type: "blockUser"; userId: string; name: string }
  | { type: "signOutOtherSessions" }
  | { type: "toggleReelLike"; reelId: string }
  | { type: "addReelComment"; reelId: string; body: string };

let sequence = 0;
function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

/** "Vumisa Dlamini" becomes "Vumisa D."; a single name stays as it is. */
export function reviewerName(fullName: string): string {
  const [first = "You", second] = fullName.trim().split(/\s+/);
  return second ? `${first} ${second[0]!.toUpperCase()}.` : first;
}

export type ReviewEligibility = "can_review" | "already_reviewed" | "needs_purchase" | "signed_out";

/**
 * Same rule the database enforces: only a signed-in buyer with a completed order for the listing can review it,
 * once. Everyone else can read reviews but not write one.
 */
export function reviewEligibility(state: Pick<DemoState, "orders" | "profile" | "reviews">, listingId: string): ReviewEligibility {
  if (!state.profile) return "signed_out";
  if (state.reviews.some((review) => review.listingId === listingId && review.mine)) return "already_reviewed";
  const completed = state.orders.some(
    (order) => order.status === "delivered" && order.lines.some((line) => line.listingId === listingId),
  );
  return completed ? "can_review" : "needs_purchase";
}

export function unitPrice(line: Pick<CartLine, "listingId" | "optionId">): number {
  const listing = getListing(line.listingId);
  if (!listing) return 0;
  const option = listing.options.find((item) => item.id === line.optionId);
  return effectivePrice(listing, option?.priceCents ?? listing.priceCents);
}

/** Which delivery group a seller's items fall in for this student: their own campus or another one. */
export function deliveryGroup(state: Pick<DemoState, "profile">, sellerId: string): "local" | "remote" {
  const seller = getSeller(sellerId);
  const buyerCampus = state.profile?.campusId;
  return seller && buyerCampus && seller.campusId !== buyerCampus ? "remote" : "local";
}

/** The mode and fee for a delivery group, from the student's choices. */
export function groupDelivery(state: Pick<DemoState, "checkout">, group: "local" | "remote") {
  const mode = group === "remote" ? state.checkout.remoteMode : state.checkout.deliveryMode;
  return { feeCents: deliveryFee(mode, state.checkout.thirdPartyTier), mode };
}

export function cartTotals(state: Pick<DemoState, "cart" | "checkout" | "profile">) {
  const subtotalCents = state.cart.reduce(
    (sum, line) => sum + unitPrice(line) * line.quantity,
    0,
  );
  const itemCount = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const groups = new Set(state.cart.map((line) => deliveryGroup(state, getListing(line.listingId)?.sellerId ?? "")));
  const delivery = [...groups].reduce((sum, group) => sum + groupDelivery(state, group).feeCents, 0);
  const memberDiscount = itemCount > 0 ? subscriberDiscountCents : 0;
  const voucher = state.checkout.voucherCode ? vouchers[state.checkout.voucherCode] : undefined;
  const voucherDiscount = voucher
    ? voucher.centsOff ?? Math.round((subtotalCents * (voucher.percentOff ?? 0)) / 100)
    : 0;
  const discountCents = Math.min(subtotalCents, memberDiscount + voucherDiscount);
  return {
    itemCount,
    subtotalCents,
    deliveryFeeCents: delivery,
    memberDiscountCents: memberDiscount,
    voucherDiscountCents: voucherDiscount,
    discountCents,
    totalCents: Math.max(0, subtotalCents + delivery - discountCents),
  };
}

function addressFor(mode: DeliveryMode, address: string): string {
  if (mode === "collection") return "Campus collection point";
  if (mode === "hub-to-hub") return "Your campus hub (collect there)";
  return address;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function orderNumber() {
  return `#${2605000 + Math.floor(Math.random() * 999)}`;
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "signIn": {
      const email = action.email.trim().toLowerCase();
      const known = state.knownProfiles.find((profile) => profile.email.toLowerCase() === email);
      const record = lookupStudentRecord(email);
      if (known) return { ...state, profile: { ...known, studentNumber: known.studentNumber ?? record.studentNumber }, isNewUser: false };
      return {
        ...state,
        isNewUser: true,
        profile: {
          id: nextId("user"),
          fullName: "",
          email,
          phone: "",
          campusId: record.campusId,
          studentNumber: record.studentNumber,
          isVerifiedStudent: true,
          role: "buyer",
        },
      };
    }
    case "completeProfile": {
      if (!state.profile) return state;
      const profile: Profile = { ...state.profile, ...action.profile };
      return {
        ...state,
        profile,
        isNewUser: false,
        knownProfiles: [...state.knownProfiles.filter((item) => item.id !== profile.id), profile],
      };
    }
    case "updateProfile": {
      if (!state.profile) return state;
      const profile = { ...state.profile, ...action.patch };
      return {
        ...state,
        profile,
        knownProfiles: state.knownProfiles.map((item) => (item.id === profile.id ? profile : item)),
      };
    }
    case "signOut":
      return { ...createInitialState(), knownProfiles: state.knownProfiles };
    case "deleteAccount": {
      const id = state.profile?.id;
      return {
        ...createInitialState(),
        knownProfiles: state.knownProfiles.filter((item) => item.id !== id),
      };
    }
    case "switchRole":
      return state.profile ? { ...state, profile: { ...state.profile, role: action.role } } : state;
    case "toggleFavourite":
      return {
        ...state,
        favourites: state.favourites.includes(action.listingId)
          ? state.favourites.filter((id) => id !== action.listingId)
          : [...state.favourites, action.listingId],
      };
    case "viewListing":
      return {
        ...state,
        recentViews: [action.listingId, ...state.recentViews.filter((id) => id !== action.listingId)].slice(0, 12),
      };
    case "addSearch": {
      const query = action.query.trim();
      if (query.length < 2) return state;
      const rest = state.recentSearches.filter((item) => item.toLowerCase() !== query.toLowerCase());
      return { ...state, recentSearches: [query, ...rest].slice(0, 8) };
    }
    case "clearSearches":
      return { ...state, recentSearches: [] };
    case "addReview": {
      const eligibility = reviewEligibility(state, action.listingId);
      if (eligibility !== "can_review") return state;
      const listing = getListing(action.listingId);
      if (!listing) return state;
      const review: Review = {
        author: reviewerName(state.profile?.fullName ?? ""),
        mine: true,
        body: action.body.trim().slice(0, 280),
        createdAt: new Date().toISOString(),
        id: nextId("rv"),
        listingId: listing.id,
        rating: action.rating,
        sellerId: listing.sellerId,
      };
      return { ...state, reviews: [review, ...state.reviews] };
    }
    case "toggleFollow":
      return {
        ...state,
        following: state.following.includes(action.sellerId)
          ? state.following.filter((id) => id !== action.sellerId)
          : [...state.following, action.sellerId],
      };
    case "addToCart": {
      const existing = state.cart.find(
        (line) => line.listingId === action.listingId && line.optionId === action.optionId,
      );
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((line) =>
            line === existing ? { ...line, quantity: line.quantity + action.quantity } : line,
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          { id: nextId("line"), listingId: action.listingId, optionId: action.optionId, quantity: action.quantity },
        ],
      };
    }
    case "setCartQuantity":
      return {
        ...state,
        cart:
          action.quantity <= 0
            ? state.cart.filter((line) => line.id !== action.lineId)
            : state.cart.map((line) => (line.id === action.lineId ? { ...line, quantity: action.quantity } : line)),
      };
    case "setFulfilment": {
      const deliveryMode = action.fulfilment === "delivery" ? "campus-courier" : "collection";
      return { ...state, checkout: { ...state.checkout, fulfilment: action.fulfilment, deliveryMode } };
    }
    case "setDeliveryMode": {
      // hub to hub only ever applies to items from another campus
      const group = action.mode === "hub-to-hub" ? "remote" : (action.group ?? "local");
      if (group === "remote") return { ...state, checkout: { ...state.checkout, remoteMode: action.mode } };
      return { ...state, checkout: { ...state.checkout, deliveryMode: action.mode, fulfilment: fulfilmentFor(action.mode) } };
    }
    case "setThirdPartyTier":
      return { ...state, checkout: { ...state.checkout, thirdPartyTier: action.tier } };
    case "setPreferredDelivery":
      return { ...state, preferredDelivery: action.mode };
    case "setAddress":
      return { ...state, checkout: { ...state.checkout, address: action.address, addressPoint: action.point ?? null } };
    case "setPayment":
      return {
        ...state,
        checkout: { ...state.checkout, payment: action.payment, cardId: action.cardId ?? state.checkout.cardId, bank: action.bank ?? state.checkout.bank },
      };
    case "applyVoucher":
      return { ...state, checkout: { ...state.checkout, voucherCode: action.code } };
    case "placeOrder": {
      if (state.cart.length === 0) return state;
      const totals = cartTotals(state);
      const placedAt = new Date().toISOString();
      const bySeller = new Map<string, CartLine[]>();
      for (const line of state.cart) {
        const sellerId = getListing(line.listingId)?.sellerId ?? "unknown";
        bySeller.set(sellerId, [...(bySeller.get(sellerId) ?? []), line]);
      }
      const sellerCount = bySeller.size;
      // each delivery group (own campus / other campuses) pays its fee once, split across that group's sellers
      const groupSellers = { local: 0, remote: 0 };
      for (const sellerId of bySeller.keys()) groupSellers[deliveryGroup(state, sellerId)] += 1;
      const groupSeen = { local: 0, remote: 0 };
      const orders: Order[] = [...bySeller.entries()].map(([sellerId, lines], index) => {
        const subtotal = lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
        const share = (value: number) => (index === 0 ? value - Math.floor(value / sellerCount) * (sellerCount - 1) : Math.floor(value / sellerCount));
        const group = deliveryGroup(state, sellerId);
        const { feeCents: groupFee, mode } = groupDelivery(state, group);
        const position = groupSeen[group];
        groupSeen[group] += 1;
        const count = groupSellers[group];
        const delivery = position === 0 ? groupFee - Math.floor(groupFee / count) * (count - 1) : Math.floor(groupFee / count);
        const discount = Math.min(subtotal, share(totals.discountCents));
        return {
          id: nextId("order"),
          number: orderNumber(),
          sellerId,
          lines: lines.map((line) => {
            const listing = getListing(line.listingId);
            return {
              listingId: line.listingId,
              title: listing?.title ?? "Item",
              optionLabel: listing?.options.find((option) => option.id === line.optionId)?.label,
              quantity: line.quantity,
              unitPriceCents: unitPrice(line),
            };
          }),
          status: "placed",
          fulfilment: fulfilmentFor(mode),
          deliveryMode: mode,
          address: addressFor(mode, state.checkout.address),
          paymentMethod: state.checkout.payment,
          subtotalCents: subtotal,
          deliveryFeeCents: delivery,
          discountCents: discount,
          totalCents: subtotal + delivery - discount,
          placedAt,
          etaMinutes: deliveryEtaMinutes(mode, state.checkout.thirdPartyTier),
          destination: fulfilmentFor(mode) === "delivery" ? (state.checkout.addressPoint ?? undefined) : undefined,
        };
      });
      const receipt: Receipt = {
        orderIds: orders.map((order) => order.id),
        number: orders[0]!.number,
        placedAt,
        itemCount: totals.itemCount,
        subtotalCents: totals.subtotalCents,
        deliveryFeeCents: totals.deliveryFeeCents,
        discountCents: totals.discountCents,
        totalCents: totals.totalCents,
      };
      const notification: NotificationItem = {
        id: nextId("n"),
        title: "Order placed",
        body: `Order ${receipt.number} was sent to the seller.`,
        createdAt: placedAt,
        read: false,
        href: `/activity/order/${orders[0]!.id}`,
      };
      const paidFromWallet = state.checkout.payment === "wallet";
      if (paidFromWallet && state.wallet.balanceCents < totals.totalCents) return state;
      return {
        ...state,
        wallet: paidFromWallet
          ? {
              balanceCents: state.wallet.balanceCents - totals.totalCents,
              transactions: [
                { id: nextId("tx"), label: `Order ${receipt.number}`, amountCents: -totals.totalCents, createdAt: placedAt },
                ...state.wallet.transactions,
              ],
            }
          : state.wallet,
        orders: [...orders, ...state.orders],
        cart: [],
        checkout: { ...state.checkout, voucherCode: null },
        notifications: [notification, ...state.notifications],
        lastReceipt: receipt,
      };
    }
    case "addCard": {
      const card: SavedCard = {
        ...action.card,
        id: nextId("card"),
        isDefault: action.makeDefault || state.cards.length === 0,
      };
      const cards = card.isDefault ? state.cards.map((item) => ({ ...item, isDefault: false })) : state.cards;
      return {
        ...state,
        cards: [...cards, card],
        checkout: { ...state.checkout, payment: "card", cardId: card.id },
      };
    }
    case "setDefaultCard":
      return {
        ...state,
        cards: state.cards.map((item) => ({ ...item, isDefault: item.id === action.cardId })),
        checkout: { ...state.checkout, cardId: action.cardId },
      };
    case "removeCard": {
      const rest = state.cards.filter((item) => item.id !== action.cardId);
      const cards = rest.length > 0 && !rest.some((item) => item.isDefault) ? rest.map((item, index) => ({ ...item, isDefault: index === 0 })) : rest;
      const usingIt = state.checkout.cardId === action.cardId;
      return {
        ...state,
        cards,
        checkout: {
          ...state.checkout,
          cardId: usingIt ? (cards.find((item) => item.isDefault)?.id ?? null) : state.checkout.cardId,
          payment: usingIt && cards.length === 0 && state.checkout.payment === "card" ? "wallet" : state.checkout.payment,
        },
      };
    }
    case "addFunds":
      return {
        ...state,
        wallet: {
          balanceCents: state.wallet.balanceCents + action.amountCents,
          transactions: [
            { id: nextId("tx"), label: `Top up via ${action.source}`, amountCents: action.amountCents, createdAt: new Date().toISOString() },
            ...state.wallet.transactions,
          ],
        },
      };
    case "openConversation": {
      if (state.conversations.some((item) => item.id === action.conversationId)) return state;
      return {
        ...state,
        conversations: [
          { id: action.conversationId, name: action.name ?? "Conversation", kind: action.kind ?? "seller", orderId: action.orderId, unread: false, messages: [] },
          ...state.conversations,
        ],
      };
    }
    case "sendMessage": {
      const body = action.body.trim();
      if (!body) return state;
      const sentAt = new Date().toISOString();
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId
            ? { ...conversation, messages: [...conversation.messages, { id: nextId("m"), fromMe: true, body, sentAt, ...(action.place ? { place: action.place } : {}) }] }
            : conversation,
        ),
      };
    }
    case "markConversationRead":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.conversationId ? { ...conversation, unread: false } : conversation,
        ),
      };
    case "markNotificationsRead":
      return { ...state, notifications: state.notifications.map((item) => ({ ...item, read: true })) };
    case "setSetting":
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };
    case "unblockUser":
      return { ...state, blocked: state.blocked.filter((item) => item.id !== action.userId) };
    case "blockUser":
      return state.blocked.some((item) => item.id === action.userId)
        ? state
        : { ...state, blocked: [...state.blocked, { blockedAt: new Date().toISOString(), id: action.userId, name: action.name }] };
    case "setTwoFactor":
      return { ...state, twoFactor: action.enabled };
    case "signOutOtherSessions":
      return { ...state, loginEvents: state.loginEvents.filter((event) => event.current) };
    case "toggleReelLike":
      return {
        ...state,
        likedReels: state.likedReels.includes(action.reelId)
          ? state.likedReels.filter((id) => id !== action.reelId)
          : [...state.likedReels, action.reelId],
      };
    case "addReelComment": {
      const body = action.body.trim();
      if (!body) return state;
      const author = state.profile?.fullName.toLowerCase().replace(/\s+/g, ".") || "you";
      return {
        ...state,
        reels: state.reels.map((reel) =>
          reel.id === action.reelId
            ? { ...reel, comments: [...reel.comments, { id: nextId("c"), author, body }] }
            : reel,
        ),
      };
    }
    default:
      return state;
  }
}

export function isCampusId(value: string): value is CampusId {
  return [
    "midrand-head-office", "bedfordview", "pretoria", "potchefstroom",
    "vaal-vanderbijlpark", "bloemfontein", "durban-umhlanga", "east-london",
    "nelson-mandela-bay-gqeberha", "cape-town-mowbray", "tyger-valley-cape-town",
    "nelspruit-mbombela",
  ].includes(value);
}
