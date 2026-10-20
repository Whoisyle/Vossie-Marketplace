import {
  loginEventsSeed,
  returningProfiles,
  userVouchersSeed,
  savedCardsSeed,
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
import { dealFor, effectivePrice } from "@/data/deals";
import { deliveryEtaMinutes, deliveryFee, fulfilmentFor, type DeliveryMode, type ThirdPartyTier } from "@/data/delivery";
import { getListing, getSeller } from "@/data/repository";
import { invitedSeed, REFERRAL_REWARD_POINTS, referralCodeFor, isSoldOut, voucherProblem, type InvitedFriend, type PriceAlert, type UserVoucher } from "@/data/phase4";
import { getPlan, hasPlan, nextMonth, PLUS_FREE_COURIER_OVER_CENTS, PLUS_ORDER_DISCOUNT_CENTS, PLUS_POINTS_MULTIPLIER, STUDY_PASS_PERCENT_OFF_SERVICES, type PlanId, type Subscription } from "@/data/subscriptions";
import { canRedeem, orderPoints, pointsBalance, pointsValueCents } from "@/data/points";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { MIN_WITHDRAW_CENTS } from "@/data/wallet";
import type { CampusContact, EmergencyContact, ReportCategory, SafetyReport } from "@/data/safety";
import { groupCode, MAX_GROUP_MEMBERS, memberShares, type GroupOrder } from "@/data/group";
import { lostFoundSeed, splitShares, swapsSeed, type LostFoundKind, type LostFoundPost, type SavedSearch, type Split, type SwapPost, type WishCollection } from "@/data/campus";
import { lookupStudentRecord } from "@/data/studentRecord";
import { applySellerAction, routeNewOrdersToSeller } from "@/seller/bridge";
import { liveBackend } from "@/backend/mode";
import { createSellerState, emptySellerState } from "@/seller/state";
import type { SellerAction, SellerState } from "@/seller/types";
import type {
  ActivityItem,
  AppSettings,
  CategoryId,
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
  PointsEntry,
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
    /** Order for later: the chosen time slot (ISO), or null for as soon as possible. */
    scheduledFor: string | null;
  };
  orders: Order[];
  bookings: Booking[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  activity: ActivityItem[];
  wallet: { balanceCents: number; transactions: WalletTransaction[] };
  cards: SavedCard[];
  twoFactor: boolean;
  /** The authenticator key (base32) when two-factor is on. Kept on this phone in the demo. */
  twoFactorSecret: string | null;
  settings: AppSettings;
  blocked: BlockedUser[];
  /** Points history beyond what delivered orders earn: redemptions and awards. */
  pointsLedger: PointsEntry[];
  referral: { referredBy: string | null; rewardPaid: boolean; firstOrderId: string | null; invited: InvitedFriend[] };
  subscriptions: Subscription[];
  /** Categories the student picked when they joined; they shape For you and Home. */
  interests: CategoryId[];
  emergencyContacts: EmergencyContact[];
  campusSecurityNumber: string;
  /** Numbers for the student's campus, read from the database (empty until the backend is on). */
  campusContacts: CampusContact[];
  safetyReports: SafetyReport[];
  collections: WishCollection[];
  savedSearches: SavedSearch[];
  splits: Split[];
  /** The group order being built, if any. */
  group: GroupOrder | null;
  swaps: SwapPost[];
  lostFound: LostFoundPost[];
  /** When the student accepted the Terms, Privacy Policy and Community Rules; null until they do. */
  termsAcceptedAt: string | null;
  userVouchers: UserVoucher[];
  alerts: PriceAlert[];
  loginEvents: LoginEvent[];
  reels: Reel[];
  likedReels: string[];
  lastReceipt: Receipt | null;
  /** Seller mode: the setup, orders, listings and earnings of the seller this student has become. */
  seller: SellerState;
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
      scheduledFor: null,
    },
    orders: ordersSeed,
    bookings: bookingsSeed,
    conversations: conversationsSeed,
    notifications: notificationsSeed,
    activity: recentActivitySeed,
    wallet: { balanceCents: walletSeed.balanceCents, transactions: walletSeed.transactions },
    cards: savedCardsSeed,
    // starts off, so the Safety check-up has something real to switch on
    twoFactor: false,
    twoFactorSecret: null,
    settings: DEFAULT_SETTINGS,
    // a demo welcome bonus so there is something to redeem (the seeded past orders earn very little)
    pointsLedger: [{ createdAt: daysAgoIso(10), id: "pt-welcome", label: "Welcome bonus (demo)", points: 300 }],
    referral: { firstOrderId: null, invited: invitedSeed, referredBy: null, rewardPaid: false },
    // the demo student starts on Vossie Plus so the R4 order discount keeps working
    subscriptions: [{ cancelling: false, planId: "plus", renewsAt: nextMonth(), since: daysAgoIso(40) }],
    termsAcceptedAt: null,
    interests: [],
    emergencyContacts: [],
    campusSecurityNumber: "",
    campusContacts: [],
    safetyReports: [],
    collections: [{ id: "col-study", listingIds: [], name: "Study gear" }],
    savedSearches: [],
    splits: [],
    group: null,
    swaps: swapsSeed,
    lostFound: lostFoundSeed,
    userVouchers: userVouchersSeed,
    alerts: [],
    blocked: [{ blockedAt: daysAgoIso(12), id: "user-blocked-1", name: "Sam K." }],
    loginEvents: loginEventsSeed,
    reels: reelsSeed,
    likedReels: [],
    lastReceipt: null,
    // the live backend starts from nothing; the demo starts with the sample shop from the designs
    seller: liveBackend ? emptySellerState() : createSellerState(),
  };
}

export type DemoAction =
  | SellerAction
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
  | { type: "updateCard"; cardId: string; patch: Partial<Pick<SavedCard, "brand" | "last4" | "expiry" | "holder" | "issuer">>; makeDefault?: boolean }
  | { type: "withdraw"; amountCents: number; cardId: string }
  | { type: "setDefaultCard"; cardId: string }
  | { type: "addFunds"; amountCents: number; source: string }
  | { type: "sendMessage"; conversationId: string; body: string; place?: string }
  | { type: "openConversation"; conversationId: string; name?: string; kind?: Conversation["kind"]; orderId?: string }
  | { type: "markConversationRead"; conversationId: string }
  | { type: "markNotificationsRead" }
  | { type: "markNotificationRead"; notificationId: string }
  | { type: "advanceOrder"; orderId: string; status: "accepted" | "preparing" | "on-the-way" | "ready" }
  | { type: "setTwoFactor"; enabled: boolean }
  | { type: "enableTwoFactor"; secret: string }
  | { type: "disableTwoFactor" }
  | { type: "setSetting"; key: keyof AppSettings; value: AppSettings[keyof AppSettings] }
  | { type: "unblockUser"; userId: string }
  | { type: "blockUser"; userId: string; name: string }
  | { type: "signOutOtherSessions" }
  | { type: "deliverOrder"; orderId: string }
  | { type: "rateCourier"; orderId: string; rating: 1 | 2 | 3 | 4 | 5; tipCents: number }
  | { type: "redeemPoints"; points: number }
  | { type: "applyReferral"; code: string }
  | { type: "setScheduledFor"; iso: string | null }
  | { type: "toggleAlert"; listingId: string; kind: PriceAlert["kind"] }
  | { type: "reorder"; orderId: string }
  | { type: "subscribe"; planId: PlanId }
  | { type: "cancelSubscription"; planId: PlanId }
  | { type: "resumeSubscription"; planId: PlanId }
  | { type: "acceptTerms" }
  | { type: "setInterests"; interests: CategoryId[] }
  | { type: "createCollection"; name: string }
  | { type: "deleteCollection"; collectionId: string }
  | { type: "toggleInCollection"; collectionId: string; listingId: string }
  | { type: "saveSearch"; query: string }
  | { type: "removeSavedSearch"; searchId: string }
  | { type: "createSplit"; orderId: string; names: string[] }
  | { type: "startGroup"; name: string }
  | { type: "addGroupMember"; name: string }
  | { type: "removeGroupMember"; memberId: string }
  | { type: "addGroupItem"; memberId: string; listingId: string; optionId?: string; quantity?: number }
  | { type: "removeGroupItem"; lineId: string }
  | { type: "groupCheckout" }
  | { type: "cancelGroup" }
  | { type: "markSplitPaid"; splitId: string; memberId: string }
  | { type: "addSwap"; have: string; want: string }
  | { type: "removeSwap"; swapId: string }
  | { type: "addLostFound"; kind: LostFoundKind; title: string; place: string }
  | { type: "resolveLostFound"; postId: string }
  | { type: "bookTutor"; listingId: string; startsAt: string }
  | { type: "addEmergencyContact"; name: string; phone: string; relationship: string }
  | { type: "removeEmergencyContact"; contactId: string }
  | { type: "setCampusSecurityNumber"; number: string }
  | { type: "setCampusContacts"; contacts: CampusContact[] }
  | { type: "submitSafetyReport"; category: ReportCategory; notes: string }
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

export function cartTotals(state: Pick<DemoState, "cart" | "checkout" | "profile" | "subscriptions">) {
  const subtotalCents = state.cart.reduce(
    (sum, line) => sum + unitPrice(line) * line.quantity,
    0,
  );
  const itemCount = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const groups = new Set(state.cart.map((line) => deliveryGroup(state, getListing(line.listingId)?.sellerId ?? "")));
  const plus = hasPlan(state.subscriptions, "plus");
  const studyPass = hasPlan(state.subscriptions, "study-pass");
  // Vossie Plus: the Vossie courier is free on orders over R100
  const delivery = [...groups].reduce((sum, group) => {
    const { feeCents, mode } = groupDelivery(state, group);
    return sum + (plus && mode === "campus-courier" && subtotalCents >= PLUS_FREE_COURIER_OVER_CENTS ? 0 : feeCents);
  }, 0);
  const serviceSubtotal = state.cart.reduce(
    (sum, line) => sum + (getListing(line.listingId)?.categoryId === "services" ? unitPrice(line) * line.quantity : 0),
    0,
  );
  const memberDiscount =
    itemCount > 0
      ? (plus ? PLUS_ORDER_DISCOUNT_CENTS : 0) + (studyPass ? Math.round((serviceSubtotal * STUDY_PASS_PERCENT_OFF_SERVICES) / 100) : 0)
      : 0;
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

function baseDemoReducer(state: DemoState, action: DemoAction): DemoState {
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
    case "applyVoucher": {
      if (action.code) {
        const owned = state.userVouchers.find((item) => item.code === action.code);
        if (voucherProblem(owned, cartTotals(state).subtotalCents)) return state;
      }
      return { ...state, checkout: { ...state.checkout, voucherCode: action.code } };
    }
    case "setScheduledFor":
      return { ...state, checkout: { ...state.checkout, scheduledFor: action.iso } };
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
      const plusMember = hasPlan(state.subscriptions, "plus");
      const groupId = nextId("grp");
      // each delivery group (own campus / other campuses) pays its fee once, split across that group's sellers
      const groupSellers = { local: 0, remote: 0 };
      for (const sellerId of bySeller.keys()) groupSellers[deliveryGroup(state, sellerId)] += 1;
      const groupSeen = { local: 0, remote: 0 };
      const orders: Order[] = [...bySeller.entries()].map(([sellerId, lines], index) => {
        const subtotal = lines.reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
        const share = (value: number) => (index === 0 ? value - Math.floor(value / sellerCount) * (sellerCount - 1) : Math.floor(value / sellerCount));
        const group = deliveryGroup(state, sellerId);
        const { feeCents: rawFee, mode } = groupDelivery(state, group);
        // Vossie Plus: the Vossie courier is free on orders over R100
        const groupFee = plusMember && mode === "campus-courier" && totals.subtotalCents >= PLUS_FREE_COURIER_OVER_CENTS ? 0 : rawFee;
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
          scheduledFor: state.checkout.scheduledFor ?? undefined,
          pointsMultiplier: plusMember ? PLUS_POINTS_MULTIPLIER : 1,
          groupId,
          etaMinutes: state.checkout.scheduledFor ? undefined : deliveryEtaMinutes(mode, state.checkout.thirdPartyTier),
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
      // the first order after entering a friend's code is the one that earns the referral points once delivered
      const firstOrderId =
        state.referral.referredBy && !state.referral.rewardPaid && !state.referral.firstOrderId ? orders[0]!.id : state.referral.firstOrderId;
      const wallet = paidFromWallet
        ? {
            balanceCents: state.wallet.balanceCents - totals.totalCents,
            transactions: [
              { id: nextId("tx"), label: `Order ${receipt.number}`, amountCents: -totals.totalCents, createdAt: placedAt, kind: "purchase" as const, orderId: orders[0]!.id },
              ...state.wallet.transactions,
            ],
          }
        : state.wallet;
      // a group order splits the bill by what each person added
      const group = state.group;
      let groupSplit: Split | null = null;
      if (group && group.status === "checkout") {
        const hostId = group.members.find((member) => member.isHost)!.id;
        const itemCentsByMember: Record<string, number> = {};
        for (const line of group.lines) {
          const listing = getListing(line.listingId);
          const price = listing ? unitPrice({ listingId: line.listingId, optionId: line.optionId }) : 0;
          itemCentsByMember[line.memberId] = (itemCentsByMember[line.memberId] ?? 0) + price * line.quantity;
        }
        const shares = memberShares({ deliveryCents: totals.deliveryFeeCents, discountCents: totals.discountCents, hostId, itemCentsByMember, memberIds: group.members.map((member) => member.id) });
        groupSplit = {
          createdAt: placedAt,
          id: nextId("split"),
          members: group.members.filter((member) => !member.isHost).map((member) => ({ id: nextId("sm"), name: member.name, shareCents: shares[member.id]!, status: "pending" as const })),
          orderId: orders[0]!.id,
          totalCents: totals.totalCents,
        };
      }
      return {
        ...state,
        wallet,
        group: group && group.status === "checkout" ? { ...group, orderId: orders[0]!.id, status: "placed" } : group,
        splits: groupSplit ? [groupSplit, ...state.splits] : state.splits,
        referral: { ...state.referral, firstOrderId },
        orders: [...orders, ...state.orders],
        cart: [],
        checkout: { ...state.checkout, scheduledFor: null, voucherCode: null },
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
    case "updateCard": {
      if (!state.cards.some((item) => item.id === action.cardId)) return state;
      const cards = state.cards.map((item) => {
        if (item.id === action.cardId) return { ...item, ...action.patch, isDefault: action.makeDefault ? true : item.isDefault };
        return action.makeDefault ? { ...item, isDefault: false } : item;
      });
      return { ...state, cards };
    }
    case "withdraw": {
      const card = state.cards.find((item) => item.id === action.cardId);
      if (!card || action.amountCents < MIN_WITHDRAW_CENTS || action.amountCents > state.wallet.balanceCents) return state;
      const at = new Date().toISOString();
      const brand = card.brand === "visa" ? "Visa" : "Mastercard";
      return {
        ...state,
        wallet: {
          balanceCents: state.wallet.balanceCents - action.amountCents,
          transactions: [
            {
              amountCents: -action.amountCents,
              createdAt: at,
              detail: `To ${brand} ending ${card.last4}. Takes 1 to 3 working days.`,
              id: nextId("tx"),
              kind: "withdrawal",
              label: `Withdrawal to card ending ${card.last4}`,
              status: "pending",
            },
            ...state.wallet.transactions,
          ],
        },
        notifications: [{ id: nextId("n"), title: "Withdrawal requested", body: `We are sending your money to the card ending ${card.last4}.`, createdAt: at, read: false }, ...state.notifications],
      };
    }
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
            { id: nextId("tx"), label: `Top up via ${action.source}`, amountCents: action.amountCents, createdAt: new Date().toISOString(), kind: "top-up" as const },
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
    case "deliverOrder": {
      const order = state.orders.find((item) => item.id === action.orderId);
      if (!order || order.status === "delivered" || order.status === "cancelled") return state;
      const earned = orderPoints(order);
      const at = new Date().toISOString();
      // the referred student's first delivered order pays 200 points to them (and to their friend, in the backend)
      const referralDue = state.referral.firstOrderId === order.id && !state.referral.rewardPaid;
      return {
        ...state,
        orders: state.orders.map((item) => (item.id === order.id ? { ...item, status: "delivered", deliveredAt: at } : item)),
        pointsLedger: referralDue
          ? [{ id: nextId("pt"), label: `Referral reward (${state.referral.referredBy})`, points: REFERRAL_REWARD_POINTS, createdAt: at }, ...state.pointsLedger]
          : state.pointsLedger,
        referral: referralDue ? { ...state.referral, rewardPaid: true } : state.referral,
        notifications: [
          ...(referralDue ? [{ id: nextId("n"), title: "Referral reward", body: `You and your friend each earned ${REFERRAL_REWARD_POINTS} points.`, createdAt: at, read: false }] : []),
          { id: nextId("n"), title: "Order delivered", body: `Order ${order.number} arrived. You earned ${earned} Vossie points.`, createdAt: at, read: false, href: `/activity/order/${order.id}` },
          ...state.notifications,
        ],
      };
    }
    case "rateCourier": {
      const order = state.orders.find((item) => item.id === action.orderId);
      if (!order || order.status !== "delivered" || order.courierRating) return state;
      // a tip comes off the wallet when the order was paid from it and there is enough; otherwise it goes to the order's payment method
      const fromWallet = action.tipCents > 0 && order.paymentMethod === "wallet" && state.wallet.balanceCents >= action.tipCents;
      return {
        ...state,
        orders: state.orders.map((item) => (item.id === order.id ? { ...item, courierRating: action.rating, tipCents: action.tipCents } : item)),
        wallet: fromWallet
          ? {
              balanceCents: state.wallet.balanceCents - action.tipCents,
              transactions: [
                { id: nextId("tx"), label: `Tip for ${order.courier?.name ?? "your courier"}`, amountCents: -action.tipCents, createdAt: new Date().toISOString(), kind: "tip" as const, orderId: order.id },
                ...state.wallet.transactions,
              ],
            }
          : state.wallet,
      };
    }
    case "redeemPoints": {
      const balance = pointsBalance(state.orders, state.pointsLedger);
      if (!canRedeem(balance, action.points)) return state;
      const cents = pointsValueCents(action.points);
      const at = new Date().toISOString();
      return {
        ...state,
        pointsLedger: [{ id: nextId("pt"), label: "Redeemed for wallet credit", points: -action.points, createdAt: at }, ...state.pointsLedger],
        wallet: {
          balanceCents: state.wallet.balanceCents + cents,
          transactions: [{ id: nextId("tx"), label: `${action.points} points redeemed`, amountCents: cents, createdAt: at, kind: "points" as const }, ...state.wallet.transactions],
        },
      };
    }
    case "applyReferral": {
      const code = action.code.trim().toUpperCase();
      if (state.referral.referredBy || !state.profile) return state;
      if (code === referralCodeFor(state.profile.fullName || state.profile.email, state.profile.studentNumber)) return state;
      return { ...state, referral: { ...state.referral, referredBy: code } };
    }
    case "toggleAlert": {
      const exists = state.alerts.some((item) => item.listingId === action.listingId && item.kind === action.kind);
      if (exists) return { ...state, alerts: state.alerts.filter((item) => !(item.listingId === action.listingId && item.kind === action.kind)) };
      const listing = getListing(action.listingId);
      if (!listing) return state;
      const now = new Date().toISOString();
      const alert: PriceAlert = { kind: action.kind, listingId: listing.id, priceCents: listing.priceCents, setAt: now };
      // a price-drop alert on something already discounted, or a back-in-stock alert on something that is in stock, fires straight away
      const fireNow =
        (action.kind === "price-drop" && dealFor(listing.id) > 0) || (action.kind === "back-in-stock" && !isSoldOut(listing.id));
      return {
        ...state,
        alerts: [...state.alerts, alert],
        notifications: fireNow
          ? [
              {
                id: nextId("n"),
                title: action.kind === "price-drop" ? "Price drop" : "Back in stock",
                body: action.kind === "price-drop" ? `${listing.title} is now ${dealFor(listing.id)}% off.` : `${listing.title} is available.`,
                createdAt: now,
                read: false,
                href: `/home/listing/${listing.id}`,
              },
              ...state.notifications,
            ]
          : state.notifications,
      };
    }
    case "reorder": {
      const order = state.orders.find((item) => item.id === action.orderId);
      if (!order) return state;
      let cart = state.cart;
      for (const line of order.lines) {
        const listing = getListing(line.listingId);
        if (!listing || isSoldOut(listing.id)) continue;
        const optionId = listing.options.find((option) => option.label === line.optionLabel)?.id;
        const existing = cart.find((item) => item.listingId === line.listingId && item.optionId === optionId);
        cart = existing
          ? cart.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + line.quantity } : item))
          : [...cart, { id: nextId("line"), listingId: line.listingId, optionId, quantity: line.quantity }];
      }
      return { ...state, cart };
    }
    case "subscribe": {
      const plan = getPlan(action.planId);
      if (hasPlan(state.subscriptions, plan.id) || state.wallet.balanceCents < plan.priceCents) return state;
      const now = new Date().toISOString();
      return {
        ...state,
        subscriptions: [...state.subscriptions.filter((item) => item.planId !== plan.id), { cancelling: false, planId: plan.id, renewsAt: nextMonth(), since: now }],
        wallet: {
          balanceCents: state.wallet.balanceCents - plan.priceCents,
          transactions: [
            { id: nextId("tx"), label: `${plan.name} subscription`, amountCents: -plan.priceCents, createdAt: now, kind: "subscription", detail: "Monthly plan, first payment" },
            ...state.wallet.transactions,
          ],
        },
        notifications: [{ id: nextId("n"), title: `Welcome to ${plan.name}`, body: plan.tagline, createdAt: now, read: false }, ...state.notifications],
      };
    }
    case "cancelSubscription":
      return { ...state, subscriptions: state.subscriptions.map((item) => (item.planId === action.planId ? { ...item, cancelling: true } : item)) };
    case "resumeSubscription":
      return { ...state, subscriptions: state.subscriptions.map((item) => (item.planId === action.planId ? { ...item, cancelling: false } : item)) };
    case "addEmergencyContact":
      return { ...state, emergencyContacts: [...state.emergencyContacts, { id: nextId("ec"), name: action.name.trim(), phone: action.phone.trim(), relationship: action.relationship.trim() }] };
    case "removeEmergencyContact":
      return { ...state, emergencyContacts: state.emergencyContacts.filter((item) => item.id !== action.contactId) };
    case "setCampusContacts":
      return { ...state, campusContacts: action.contacts };
    case "setCampusSecurityNumber":
      return { ...state, campusSecurityNumber: action.number.trim() };
    case "submitSafetyReport": {
      if (action.notes.trim().length < 5) return state;
      const at = new Date().toISOString();
      return {
        ...state,
        safetyReports: [{ category: action.category, createdAt: at, id: nextId("rep"), notes: action.notes.trim(), status: "received" }, ...state.safetyReports],
        notifications: [{ id: nextId("n"), title: "Report received", body: `Thanks. Our team will look at your ${action.category.toLowerCase()} report.`, createdAt: at, read: false }, ...state.notifications],
      };
    }
    case "createCollection": {
      const name = action.name.trim();
      if (name.length < 2 || state.collections.some((item) => item.name.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, collections: [...state.collections, { id: nextId("col"), listingIds: [], name }] };
    }
    case "deleteCollection":
      return { ...state, collections: state.collections.filter((item) => item.id !== action.collectionId) };
    case "toggleInCollection":
      return {
        ...state,
        collections: state.collections.map((item) =>
          item.id !== action.collectionId
            ? item
            : { ...item, listingIds: item.listingIds.includes(action.listingId) ? item.listingIds.filter((id) => id !== action.listingId) : [...item.listingIds, action.listingId] },
        ),
      };
    case "saveSearch": {
      const query = action.query.trim();
      if (!query || state.savedSearches.some((item) => item.query.toLowerCase() === query.toLowerCase())) return state;
      const at = new Date().toISOString();
      return {
        ...state,
        savedSearches: [{ createdAt: at, id: nextId("ss"), query }, ...state.savedSearches],
        notifications: [{ id: nextId("n"), title: "Search saved", body: `We'll tell you when new listings match "${query}".`, createdAt: at, read: false }, ...state.notifications],
      };
    }
    case "removeSavedSearch":
      return { ...state, savedSearches: state.savedSearches.filter((item) => item.id !== action.searchId) };
    case "startGroup": {
      const name = action.name.trim();
      if (name.length < 2 || (state.group && state.group.status !== "placed")) return state;
      const hostName = state.profile?.fullName.split(" ")[0] || "You";
      return {
        ...state,
        group: {
          code: groupCode(name, Date.now()),
          id: nextId("grp"),
          lines: [],
          members: [{ id: nextId("gm"), isHost: true, name: hostName }],
          name,
          status: "open",
        },
      };
    }
    case "addGroupMember": {
      const group = state.group;
      const name = action.name.trim();
      if (!group || group.status !== "open" || name.length < 2 || group.members.length >= MAX_GROUP_MEMBERS) return state;
      if (group.members.some((member) => member.name.toLowerCase() === name.toLowerCase())) return state;
      return { ...state, group: { ...group, members: [...group.members, { id: nextId("gm"), isHost: false, name }] } };
    }
    case "removeGroupMember": {
      const group = state.group;
      const member = group?.members.find((item) => item.id === action.memberId);
      if (!group || group.status !== "open" || !member || member.isHost) return state;
      return {
        ...state,
        group: { ...group, lines: group.lines.filter((line) => line.memberId !== member.id), members: group.members.filter((item) => item.id !== member.id) },
      };
    }
    case "addGroupItem": {
      const group = state.group;
      if (!group || group.status !== "open" || !group.members.some((member) => member.id === action.memberId) || !getListing(action.listingId)) return state;
      if (isSoldOut(action.listingId)) return state;
      const quantity = Math.max(1, action.quantity ?? 1);
      const existing = group.lines.find((line) => line.memberId === action.memberId && line.listingId === action.listingId && line.optionId === action.optionId);
      return {
        ...state,
        group: {
          ...group,
          lines: existing
            ? group.lines.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line))
            : [...group.lines, { id: nextId("gl"), listingId: action.listingId, memberId: action.memberId, optionId: action.optionId, quantity }],
        },
      };
    }
    case "removeGroupItem": {
      const group = state.group;
      if (!group || group.status !== "open") return state;
      return { ...state, group: { ...group, lines: group.lines.filter((line) => line.id !== action.lineId) } };
    }
    case "groupCheckout": {
      const group = state.group;
      if (!group || group.status !== "open" || group.lines.length === 0) return state;
      // the group's items replace the cart, so checkout shows exactly what everyone added
      const cart: CartLine[] = group.lines.map((line) => ({ id: nextId("line"), listingId: line.listingId, optionId: line.optionId, quantity: line.quantity }));
      return { ...state, cart, group: { ...group, status: "checkout" } };
    }
    case "cancelGroup":
      return { ...state, group: null };
    case "createSplit": {
      const order = state.orders.find((item) => item.id === action.orderId);
      const names = action.names.map((name) => name.trim()).filter(Boolean);
      if (!order || names.length === 0 || state.splits.some((item) => item.orderId === order.id)) return state;
      const shares = splitShares(order.totalCents, names.length + 1);
      return {
        ...state,
        splits: [
          {
            createdAt: new Date().toISOString(),
            id: nextId("split"),
            members: names.map((name, index) => ({ id: nextId("sm"), name, shareCents: shares[index + 1]!, status: "pending" as const })),
            orderId: order.id,
            totalCents: order.totalCents,
          },
          ...state.splits,
        ],
      };
    }
    case "markSplitPaid": {
      const split = state.splits.find((item) => item.id === action.splitId);
      const member = split?.members.find((item) => item.id === action.memberId);
      if (!split || !member || member.status === "paid") return state;
      const at = new Date().toISOString();
      return {
        ...state,
        splits: state.splits.map((item) =>
          item.id === split.id ? { ...item, members: item.members.map((m) => (m.id === member.id ? { ...m, status: "paid" as const } : m)) } : item,
        ),
        wallet: {
          balanceCents: state.wallet.balanceCents + member.shareCents,
          transactions: [{ id: nextId("tx"), label: `${member.name} paid their share`, amountCents: member.shareCents, createdAt: at, kind: "other" as const, orderId: split.orderId }, ...state.wallet.transactions],
        },
      };
    }
    case "addSwap": {
      if (action.have.trim().length < 3 || action.want.trim().length < 3) return state;
      return { ...state, swaps: [{ author: state.profile?.fullName || "You", createdAt: new Date().toISOString(), have: action.have.trim(), id: nextId("swap"), mine: true, want: action.want.trim() }, ...state.swaps] };
    }
    case "removeSwap":
      return { ...state, swaps: state.swaps.filter((item) => item.id !== action.swapId) };
    case "addLostFound": {
      if (action.title.trim().length < 3) return state;
      return { ...state, lostFound: [{ author: state.profile?.fullName || "You", createdAt: new Date().toISOString(), id: nextId("lf"), kind: action.kind, mine: true, place: action.place.trim(), resolved: false, title: action.title.trim() }, ...state.lostFound] };
    }
    case "resolveLostFound":
      return { ...state, lostFound: state.lostFound.map((item) => (item.id === action.postId ? { ...item, resolved: true } : item)) };
    case "bookTutor": {
      const listing = getListing(action.listingId);
      if (!listing || listing.categoryId !== "services") return state;
      const seller = getSeller(listing.sellerId);
      return {
        ...state,
        bookings: [
          {
            durationMinutes: 60,
            id: nextId("booking"),
            location: listing.location,
            priceCents: effectivePrice(listing),
            provider: seller?.name ?? "Tutor",
            startsAt: action.startsAt,
            status: "upcoming",
            title: listing.title,
          },
          ...state.bookings,
        ],
      };
    }
    case "setInterests":
      return { ...state, interests: action.interests };
    case "acceptTerms":
      return { ...state, termsAcceptedAt: new Date().toISOString() };
    case "markNotificationRead":
      return { ...state, notifications: state.notifications.map((item) => (item.id === action.notificationId ? { ...item, read: true } : item)) };
    case "advanceOrder": {
      const order = state.orders.find((item) => item.id === action.orderId);
      const rank = { placed: 0, accepted: 1, preparing: 2, ready: 3, "on-the-way": 3, delivered: 4, cancelled: -1 } as const;
      if (!order || order.status === "cancelled" || order.status === "delivered" || rank[action.status] <= rank[order.status]) return state;
      const seller = getSeller(order.sellerId)?.name ?? "The seller";
      const at = new Date().toISOString();
      const copy = {
        accepted: { body: `${seller} accepted order ${order.number} and will start on it.`, title: "Order accepted" },
        "on-the-way": { body: `Linda M. picked up order ${order.number} from ${seller} and is on the way.`, title: "Your order is on the way" },
        preparing: { body: `${seller} is preparing order ${order.number}.`, title: "Order being prepared" },
        ready: { body: `Order ${order.number} is ready to collect at ${seller}.`, title: "Order ready to collect" },
      }[action.status];
      return {
        ...state,
        orders: state.orders.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: action.status,
                ...(action.status === "on-the-way" ? { courier: { name: "Linda M.", rating: 4.9, vehicle: "Vossie courier · Bicycle" }, etaMinutes: item.etaMinutes ?? 12 } : {}),
              }
            : item,
        ),
        notifications: [{ id: nextId("n"), title: copy.title, body: copy.body, createdAt: at, read: false, href: `/activity/order/${order.id}` }, ...state.notifications],
      };
    }
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
    case "enableTwoFactor":
      return { ...state, twoFactor: true, twoFactorSecret: action.secret };
    case "disableTwoFactor":
      return { ...state, twoFactor: false, twoFactorSecret: null };
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

/** The demo store's reducer. Seller actions go to the seller side; a placed order is also offered to the seller who runs that store. */
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type.startsWith("seller")) return applySellerAction(state, action as SellerAction, baseDemoReducer);
  const next = baseDemoReducer(state, action);
  return action.type === "placeOrder" ? routeNewOrdersToSeller(state, next) : next;
}

export function isCampusId(value: string): value is CampusId {
  return [
    "midrand-head-office", "bedfordview", "pretoria", "potchefstroom",
    "vaal-vanderbijlpark", "bloemfontein", "durban-umhlanga", "east-london",
    "nelson-mandela-bay-gqeberha", "cape-town-mowbray", "tyger-valley-cape-town",
    "nelspruit-mbombela",
  ].includes(value);
}
