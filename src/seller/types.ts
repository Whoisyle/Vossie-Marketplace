/**
 * Seller mode: the shapes behind the seller screens (owner designs, 2026-10-20). The same shapes are used by the demo
 * store and by the live Supabase services, so the screens do not care which one is behind them.
 */

/** What kind of seller: a student selling their own things, a campus business, or a registered company. */
export type SellerKind = "student" | "campus-business" | "registered";

/** The documents a seller is asked for. The student card is checked against the Eduvos record. */
export type DocKind = "student-card" | "id" | "address" | "cipc";

/** Where a document is: not given yet, handed in, being reviewed by Vossie Operations, accepted, or turned down. */
export type DocStatus = "required" | "uploaded" | "in-review" | "verified" | "rejected";

export type SellerDocument = { kind: DocKind; status: DocStatus; fileName?: string; uploadedAt?: string; note?: string };

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
  description: string;
  location: string;
  days: DayKey[];
  opens: string;
  closes: string;
  bank?: BankAccount;
};

export type SellerOrderStatus = "new" | "accepted" | "preparing" | "ready" | "done" | "declined" | "cancelled";

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
  /** The six digits the buyer reads out at hand-over (demo: shown on the order). */
  handoffCode: string;
  declineReason?: string;
};

export type SellerListingStatus = "published" | "paused" | "draft" | "under-review";

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
  updatedAt: string;
};

export type LedgerKind = "sale" | "payout" | "refund";

export type LedgerEntry = { id: string; label: string; amountCents: number; createdAt: string; kind: LedgerKind; sellerOrderId?: string };

export type SellerAlert = { id: string; title: string; body: string; createdAt: string; read: boolean; href?: string; kind: "order" | "stock" | "message" | "account" | "money" };

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
};

export type SellerAction =
  | { type: "sellerStart" }
  | { type: "sellerSetKind"; kind: SellerKind }
  | { type: "sellerSetBasics"; storeName: string; phone: string }
  | { type: "sellerGoToStep"; step: 1 | 2 | 3 }
  | { type: "sellerUploadDocument"; kind: DocKind; fileName: string; /** The picked file, which the live backend uploads. */ uri?: string }
  | { type: "sellerSubmitVerification" }
  | { type: "sellerReviewTick" }
  | { type: "sellerSaveStore"; patch: Partial<Pick<SellerProfile, "logoUri" | "storeName" | "description" | "location" | "days" | "opens" | "closes">> }
  | { type: "sellerFinishSetup" }
  | { type: "sellerReceiveOrder"; order: SellerOrder }
  | { type: "sellerRespondOrder"; id: string; accept: boolean; reason?: string }
  | { type: "sellerAdvanceOrder"; id: string; to: "preparing" | "ready" }
  | { type: "sellerCompleteOrder"; id: string }
  | { type: "sellerSaveListing"; listing: SellerListing }
  | { type: "sellerPauseListing"; id: string; paused: boolean }
  | { type: "sellerRestock"; id: string; quantity: number }
  | { type: "sellerDeleteListing"; id: string }
  | { type: "sellerSaveBank"; bank: BankAccount }
  | { type: "sellerWithdraw"; amountCents: number }
  | { type: "sellerMarkAlertsRead" }
  /** Live mode: replace what the screens show with what the database holds. */
  | { type: "sellerHydrate"; patch: Partial<SellerState> };
