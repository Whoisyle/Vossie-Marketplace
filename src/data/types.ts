/**
 * Demo domain types for the frontend phase. Money is stored as integer ZAR
 * cents. These shapes are intentionally close to the Supabase contracts so the
 * repository can later switch from mock data to live queries.
 */

export type CampusId =
  | "midrand-head-office"
  | "bedfordview"
  | "pretoria"
  | "potchefstroom"
  | "vaal-vanderbijlpark"
  | "bloemfontein"
  | "durban-umhlanga"
  | "east-london"
  | "nelson-mandela-bay-gqeberha"
  | "cape-town-mowbray"
  | "tyger-valley-cape-town"
  | "nelspruit-mbombela";

export type Campus = { id: CampusId; name: string; region: string };

export type CategoryId = "food" | "books" | "electronics" | "fashion" | "services";

export type Category = { id: CategoryId; name: string; icon: string };

export type Role = "buyer" | "seller" | "service_provider";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  campusId: CampusId;
  /** Pulled from the Eduvos student record (mock for now, see data/studentRecord.ts). */
  studentNumber?: string;
  avatarUri?: string;
  isVerifiedStudent: boolean;
  role: Role;
};

export type Seller = {
  id: string;
  name: string;
  campusId: CampusId;
  location: string;
  bio: string;
  rating: number;
  ratingCount: number;
  followers: number;
};

export type ListingOption = { id: string; label: string; priceCents: number };

export type Listing = {
  id: string;
  title: string;
  categoryId: CategoryId;
  sellerId: string;
  campusId: CampusId;
  priceCents: number;
  rating: number;
  ratingCount: number;
  description: string;
  /** Photos, or `art:<id>` for one of our own drawings (see components/art). */
  images: (number | string)[];
  options: ListingOption[];
  pickupTime: string;
  openHours: string;
  location: string;
  popular: boolean;
  createdDaysAgo: number;
};

export type CartLine = {
  id: string;
  listingId: string;
  optionId?: string;
  quantity: number;
};

export type Fulfilment = "delivery" | "collection";

export type PaymentMethod = "apple-pay" | "google-pay" | "card" | "wallet" | "eft";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "on-the-way"
  | "ready"
  | "delivered"
  | "cancelled";

export type OrderLine = {
  listingId: string;
  title: string;
  optionLabel?: string;
  quantity: number;
  unitPriceCents: number;
};

export type Order = {
  id: string;
  number: string;
  sellerId: string;
  lines: OrderLine[];
  status: OrderStatus;
  fulfilment: Fulfilment;
  address: string;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
  placedAt: string;
  etaMinutes?: number;
  /** Chosen with Order for later: the time the student wants it. */
  scheduledFor?: string;
  deliveredAt?: string;
  /** 2 for Vossie Plus members at the time of ordering; points are earned times this. */
  pointsMultiplier?: number;
  /** Orders paid together share a group, so one receipt can show them all. */
  groupId?: string;
  /** The student's rating of the courier (1 to 5) and the tip they added after delivery. */
  courierRating?: 1 | 2 | 3 | 4 | 5;
  tipCents?: number;
  /** Where the delivery goes, when the student pinned it on the map. */
  destination?: { latitude: number; longitude: number };
  /** How it gets to the student; older orders without one are treated as campus courier or collection. */
  deliveryMode?: import("./delivery").DeliveryMode;
  /** phone is the number the Call button dials; empty until couriers are set up with real numbers. */
  courier?: { name: string; vehicle: string; rating: number; phone?: string };
};

export type BookingStatus = "upcoming" | "completed" | "cancelled";

export type Booking = {
  id: string;
  title: string;
  provider: string;
  location: string;
  startsAt: string;
  durationMinutes: number;
  priceCents: number;
  status: BookingStatus;
};

export type Message = {
  id: string;
  fromMe: boolean;
  body: string;
  sentAt: string;
  /** A suggested place to meet or hand over, shown as a card instead of plain text. */
  place?: string;
};

export type Conversation = {
  id: string;
  name: string;
  kind: "buyer" | "seller" | "support" | "courier";
  unread: boolean;
  orderId?: string;
  messages: Message[];
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export type ActivityItem = {
  id: string;
  actor: string;
  text: string;
  listingId: string;
  createdAt: string;
};

export type WalletTransactionKind = "top-up" | "purchase" | "refund" | "tip" | "points" | "withdrawal" | "subscription" | "other";

export type WalletTransaction = {
  id: string;
  label: string;
  amountCents: number;
  createdAt: string;
  kind?: WalletTransactionKind;
  /** The order this payment was for, so the receipt can be opened again. */
  orderId?: string;
  /** A withdrawal stays pending until the card provider confirms it. */
  status?: "completed" | "pending";
  detail?: string;
};

export type SavedCard = {
  id: string;
  brand: "visa" | "mastercard";
  last4: string;
  expiry: string;
  holder: string;
  isDefault: boolean;
  /** Id of the bank that issued the card (see `data/cardBrands.ts`); the card is drawn in that bank's colours. */
  issuer?: string;
};

export type Reel = {
  id: string;
  seller: string;
  sellerId?: string;
  caption: string;
  listingId?: string;
  likes: number;
  comments: { id: string; author: string; body: string }[];
  tint: string;
};

export type Faq = { id: string; question: string; answer: string };

export type LoginEvent = {
  id: string;
  device: string;
  location: string;
  at: string;
  current: boolean;
};

export type Review = {
  id: string;
  listingId: string;
  sellerId: string;
  /** Display name shown with the review. */
  author: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
  /** True for reviews written by the signed-in student on this device. */
  mine?: boolean;
};

/** Who can see the student's profile and listings. */
export type ProfileVisibility = "campus" | "followers" | "private";

export type AppSettings = {
  /** Ask for Face ID or Touch ID before payments and wallet actions. */
  biometric: boolean;
  profileVisibility: ProfileVisibility;
  showCampus: boolean;
  personalised: boolean;
  shareTracking: boolean;
  notifyOrders: boolean;
  notifyMessages: boolean;
  notifyPromos: boolean;
  notifyAlerts: boolean;
  haptics: boolean;
  sounds: boolean;
};

export type BlockedUser = { id: string; name: string; blockedAt: string };

/** One line in the Vossie Points history. Earning on orders is worked out from delivered orders; these are the rest. */
export type PointsEntry = { id: string; label: string; points: number; createdAt: string };
