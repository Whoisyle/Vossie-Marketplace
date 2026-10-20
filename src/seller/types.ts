/**
 * Seller mode: the shapes behind the seller screens (owner designs, 2026-10-20). The same shapes are used by the demo
 * store and by the live Supabase services, so the screens do not care which one is behind them.
 */

import type { StoreLocation } from "./places";

/** What kind of seller: a student selling their own things, a campus business, or a registered company. */
export type SellerKind = "student" | "campus-business" | "registered";

/** The documents a seller is asked for. The student card is checked against the Eduvos record. */
export type DocKind = "student-card" | "id" | "address" | "cipc";

/** Where a document is: not given yet, handed in, being reviewed by Vossie Operations, accepted, or turned down. */
export type DocStatus = "required" | "uploaded" | "in-review" | "verified" | "rejected";

export type SellerDocument = { kind: DocKind; status: DocStatus; fileName?: string; uploadedAt?: string; note?: string; /** The chosen file, so it can be looked at, replaced or taken back. */ uri?: string; fileKind?: "image" | "pdf" | "file" };

/**
 * Where the seller is in becoming a seller: not started, filling in the setup, waiting for review, or approved.
 * Approved sellers can accept orders and publish listings.
 */
export type SellerStatus = "none" | "setup" | "pending" | "approved";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: readonly DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = { fri: "Fri", mon: "Mon", sat: "Sat", sun: "Sun", thu: "Thu", tue: "Tue", wed: "Wed" };

export type BankAccount = { bankName: string; accountHolder: string; last4: string };

export type SellerProfile = {
  kind: SellerKind | null;
  /** The store in the catalogue this seller runs. In the demo it is CampusBites. */
  storeId: string;
  storeName: string;
  phone: string;
  logoUri?: string;
  /** The wide picture at the top of the store page. */
  bannerUri?: string;
  description: string;
  location: string;
  days: DayKey[];
  opens: string;
  closes: string;
  bank?: BankAccount;
  /** The real place where orders are handed over, with its position on the map. */
  place?: StoreLocation;
  /** Tax or VAT number, for a registered business. */
  taxNumber?: string;
};

export type SellerOrderStatus = "new" | "accepted" | "preparing" | "ready" | "done" | "declined" | "cancelled";

export type ParcelSize = "small" | "medium" | "large";

export type SellerOrderLine = { title: string; optionLabel?: string; quantity: number; unitPriceCents: number };

/** An order as the seller sees it. When it came from a buyer in this app, `buyerOrderId` links it to their order. */
export type SellerOrder = {
  id: string;
  number: string;
  buyerOrderId?: string;
  buyerName: string;
  buyerVerified: boolean;
  lines: SellerOrderLine[];
  subtotalCents: number;
  totalCents: number;
  paymentLabel: string;
  fulfilment: "collection" | "delivery";
  /** "Campus collection" or "Delivery to res". */
  fulfilmentLabel: string;
  /** Where to hand it over: the pickup point or the delivery address. */
  place: string;
  /** "Student Center by 11:30" for a collection. */
  by?: string;
  status: SellerOrderStatus;
  placedAt: string;
  /** The six digits the buyer reads out when they collect (demo: shown on the order). */
  handoffCode: string;
  declineReason?: string;
  /** What the buyer paid for delivery. It goes to the courier, not the seller. */
  deliveryFeeCents: number;
  /** Vossie's platform fee on the items. The seller earns the subtotal less this. */
  feeCents: number;
  /** Four digits the seller reads out to the courier at pickup, so the right person takes the parcel. */
  courierCode: string;
  parcelSize?: ParcelSize;
  courierNote?: string;
  /** Arrived while the store was closed and waited in the queue. */
  queued?: boolean;
  /** Set once a courier has taken the delivery job. */
  courier?: { name: string; vehicle: string; rating: number; arrivesInMin: number };
};

export type SellerListingStatus = "published" | "paused" | "draft" | "under-review" | "archived";

export type SellerListing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  /** Units in stock; ignored when `unlimited`. */
  onHand: number;
  unlimited: boolean;
  status: SellerListingStatus;
  category: "food" | "books" | "electronics" | "fashion" | "services";
  /** Which of our product drawings to show, when there is one. */
  artId?: string;
  /** The database option that holds this listing's price and stock (live mode). */
  optionId?: string;
  /** Shown in Inventory, like VM-0231. */
  sku: string;
  /** Names like "Black" and "Blue". */
  variants: string[];
  /** Pictures the seller added, up to six. */
  photos: string[];
  updatedAt: string;
};

export type LedgerKind = "sale" | "payout" | "refund";

export type LedgerEntry = {
  id: string;
  label: string;
  /** The second line, like "Sale · fee R17" or "Damaged item". */
  note?: string;
  amountCents: number;
  /** Vossie's fee on a sale, so Payouts can say how much has been paid in fees. */
  feeCents?: number;
  createdAt: string;
  kind: LedgerKind;
  sellerOrderId?: string;
};

export type PromotionKind = "percent" | "rand-off" | "free-delivery" | "buy-x-get-y" | "bundle";

/** An offer for buyers. Everything after `redemptions` is optional so a simple offer stays simple. */
export type SellerPromotion = {
  id: string;
  kind: PromotionKind;
  title: string;
  /** The line buyers read, made from the other fields by `promotionDetail`. */
  detail: string;
  /** What buyers type at checkout. Left out when the offer applies by itself. */
  code?: string;
  active: boolean;
  scheduled?: boolean;
  ended?: boolean;
  redemptions: number;
  /** Percent for "percent", cents for "rand-off" and "bundle". */
  value?: number;
  /** Buy this many, get this many free (for "buy-x-get-y"). */
  buyX?: number;
  getY?: number;
  /** What it covers: the whole store, chosen products, or a category. */
  appliesTo?: "store" | "products" | "category";
  listingIds?: string[];
  category?: SellerListing["category"];
  minSpendCents?: number;
  firstOrderOnly?: boolean;
  /** YYYY-MM-DD. No end date means it runs until it is switched off. */
  startsAt?: string;
  endsAt?: string;
  /** Most uses in total, and per student. Left out for no limit. */
  maxUses?: number;
  perStudent?: number;
};

export type SellerReview = { id: string; author: string; rating: 1 | 2 | 3 | 4 | 5; text: string; createdAt: string; reply?: string };

export type CaseKind = "return" | "dispute";

/** A return or a dispute a buyer has opened on one of the seller's orders. */
export type SellerCase = {
  id: string;
  orderNumber: string;
  title: string;
  kind: CaseKind;
  reason: string;
  amountCents: number;
  photos: number;
  status: "open" | "resolved";
  resolution?: string;
  createdAt: string;
};

export type TicketTopic = "payout" | "order" | "account" | "store" | "technical" | "safety" | "other";

export const TICKET_TOPICS: { key: TicketTopic; label: string }[] = [
  { key: "payout", label: "Payout or money" },
  { key: "order", label: "An order" },
  { key: "account", label: "My account" },
  { key: "store", label: "My store" },
  { key: "technical", label: "App problem" },
  { key: "safety", label: "Safety" },
  { key: "other", label: "Something else" },
];

export type TicketAttachment = { name: string; uri?: string; kind: "image" | "pdf" | "file" };

export type TicketMessage = { id: string; from: "you" | "support"; body: string; at: string };

/** A request to Vossie support, with how the seller wants to be reached and what was said back. */
export type SupportTicket = {
  id: string;
  ref: string;
  topic: TicketTopic;
  subject: string;
  details: string;
  /** The order number the problem is about, like #VM-2041. */
  orderNumber?: string;
  attachments: TicketAttachment[];
  contact: "chat" | "email" | "phone";
  phone?: string;
  bestTime: "morning" | "afternoon" | "evening" | "anytime";
  urgency: "normal" | "urgent";
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  messages: TicketMessage[];
};

export type TeamMember = { id: string; name: string; email: string; role: "owner" | "packer" };

export type DayHours = { open: boolean; from: string; to: string };

/** A lecture the seller sits in, so the store can open around it. */
export type Lecture = { id: string; day: DayKey; from: string; to: string; label: string };

/** Days the store is shut (exam week, a holiday). Both dates are included, as YYYY-MM-DD. */
export type Closure = { id: string; from: string; to: string; label: string };

/** When the store is open. The system works the hours out from a preset or the lectures, and the seller can change any day. */
export type SellerSchedule = {
  hours: Record<DayKey, DayHours>;
  lectures: Lecture[];
  closures: Closure[];
  /** Queue new orders instead of taking them while the store is closed. */
  autoPause: boolean;
  /** How long a pickup slot is. */
  slotMinutes: 30 | 60;
  /** How long before closing, or before now, an order is still taken for pickup. */
  cutoffMinutes: number;
  /** The seller shut the store by hand. */
  closedNow: boolean;
  preset: "weekdays" | "every-day" | "timetable" | "custom";
};

export type ReelStatus = "draft" | "published" | "hidden";

/** A short video the seller posted about one of their products, with how it is doing. */
export type SellerReel = {
  id: string;
  caption: string;
  /** The product the reel sells. Taps on the reel open it. */
  listingId?: string;
  /** The picked video, kept on the phone until real upload exists. */
  videoUri?: string;
  status: ReelStatus;
  createdAt: string;
  views: number;
  likes: number;
  saves: number;
  /** Taps through to the product. */
  taps: number;
  /** Orders that started from the reel, and what they came to. */
  orders: number;
  salesCents: number;
};

export type NotifyKind = "orders" | "messages" | "stock" | "money" | "reviews" | "promotions";

export const NOTIFY_KINDS: readonly NotifyKind[] = ["orders", "messages", "stock", "money", "reviews", "promotions"];

export type NotifyPrefs = {
  channels: Record<NotifyKind, { push: boolean; email: boolean }>;
  quiet: { on: boolean; from: string; to: string };
  sound: boolean;
};

export type SellerSettings = { orderNotifications: boolean };

export type SellerAlert = { id: string; title: string; body: string; createdAt: string; read: boolean; href?: string; kind: "order" | "stock" | "message" | "account" | "money" | "review" | "promo" };

export type SellerState = {
  status: SellerStatus;
  /** The step of the three-step setup the seller is on. */
  step: 1 | 2 | 3;
  /** True once the three steps have been completed. */
  setupDone: boolean;
  submittedAt?: string;
  approvedAt?: string;
  profile: SellerProfile;
  documents: SellerDocument[];
  orders: SellerOrder[];
  listings: SellerListing[];
  ledger: LedgerEntry[];
  alerts: SellerAlert[];
  promotions: SellerPromotion[];
  reviews: SellerReview[];
  /** How many reviews of each star count the store has, five stars first, so the bars show all of them, not just the ones listed. */
  reviewCounts: [number, number, number, number, number];
  cases: SellerCase[];
  team: TeamMember[];
  settings: SellerSettings;
  schedule: SellerSchedule;
  notify: NotifyPrefs;
  reels: SellerReel[];
  tickets: SupportTicket[];
};

export type SellerAction =
  | { type: "sellerStart" }
  | { type: "sellerSetKind"; kind: SellerKind }
  | { type: "sellerSetBasics"; storeName: string; phone: string }
  | { type: "sellerGoToStep"; step: 1 | 2 | 3 }
  | { type: "sellerUploadDocument"; kind: DocKind; fileName: string; /** The picked file, which the live backend uploads. */ uri?: string; fileKind?: "image" | "pdf" | "file" }
  | { type: "sellerRemoveDocument"; kind: DocKind }
  | { type: "sellerSubmitVerification" }
  | { type: "sellerReviewTick" }
  | { type: "sellerSaveStore"; patch: Partial<Pick<SellerProfile, "logoUri" | "bannerUri" | "place" | "storeName" | "description" | "location" | "days" | "opens" | "closes" | "taxNumber">> }
  | { type: "sellerFinishSetup" }
  | { type: "sellerReceiveOrder"; order: SellerOrder }
  | { type: "sellerRespondOrder"; id: string; accept: boolean; reason?: string }
  | { type: "sellerAdvanceOrder"; id: string; to: "preparing" | "ready" }
  | { type: "sellerCompleteOrder"; id: string }
  | { type: "sellerSaveListing"; listing: SellerListing }
  | { type: "sellerAdjustStock"; id: string; delta: number }
  | { type: "sellerArchiveListing"; id: string; archived: boolean }
  | { type: "sellerSetParcel"; id: string; size?: ParcelSize; note?: string }
  | { type: "sellerAssignCourier"; id: string }
  | { type: "sellerHandToCourier"; id: string }
  | { type: "sellerCreatePromotion"; promotion: SellerPromotion }
  | { type: "sellerUpdatePromotion"; promotion: SellerPromotion }
  | { type: "sellerDeletePromotion"; id: string }
  | { type: "sellerCreateTicket"; ticket: SupportTicket }
  | { type: "sellerReplyTicket"; id: string; body: string }
  | { type: "sellerResolveTicket"; id: string }
  /** Demo only: Vossie support answers a ticket a few seconds after it is sent. */
  | { type: "sellerSupportReply"; id: string }
  | { type: "sellerTogglePromotion"; id: string; active: boolean }
  | { type: "sellerReplyReview"; id: string; text: string }
  | { type: "sellerResolveCase"; id: string; decision: "approve" | "decline" | "respond"; text?: string }
  | { type: "sellerInviteTeam"; name: string; email: string }
  | { type: "sellerRemoveTeam"; id: string }
  | { type: "sellerSetSetting"; key: keyof SellerSettings; value: boolean }
  | { type: "sellerSetSchedule"; schedule: SellerSchedule }
  | { type: "sellerSaveReel"; reel: SellerReel }
  | { type: "sellerSetReelStatus"; id: string; status: ReelStatus }
  | { type: "sellerDeleteReel"; id: string }
  /** Demo only: a few more people watch the live reels. `n` is the count of ticks so far. */
  | { type: "sellerReelTick"; n: number }
  | { type: "sellerSetNotify"; notify: NotifyPrefs }
  | { type: "sellerMarkAlertRead"; id: string }
  | { type: "sellerPauseListing"; id: string; paused: boolean }
  | { type: "sellerRestock"; id: string; quantity: number }
  | { type: "sellerDeleteListing"; id: string }
  | { type: "sellerSaveBank"; bank: BankAccount }
  | { type: "sellerWithdraw"; amountCents: number }
  | { type: "sellerMarkAlertsRead" }
  /** Live mode: replace what the screens show with what the database holds. */
  | { type: "sellerHydrate"; patch: Partial<SellerState> };
