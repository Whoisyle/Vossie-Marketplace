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

export type Campus = { id: CampusId; name: string };

export type CategoryId = "food" | "books" | "electronics" | "fashion" | "services";

export type Category = { id: CategoryId; name: string; icon: string };

export type Role = "buyer" | "seller" | "service_provider";

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  campusId: CampusId;
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
  images: number[];
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

export type PaymentMethod = "apple-pay" | "google-pay" | "card" | "wallet";

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
  courier?: { name: string; vehicle: string; rating: number };
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
};

export type Conversation = {
  id: string;
  name: string;
  kind: "buyer" | "seller" | "support";
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

export type WalletTransaction = {
  id: string;
  label: string;
  amountCents: number;
  createdAt: string;
};

export type SavedCard = {
  id: string;
  brand: "visa" | "mastercard";
  last4: string;
  expiry: string;
  holder: string;
  isDefault: boolean;
};

export type Reel = {
  id: string;
  seller: string;
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
