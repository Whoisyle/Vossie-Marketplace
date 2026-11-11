/**
 * Demo data for Vossie Operations, the staff side of the marketplace. Nothing here is connected to a database yet: it is the
 * picture of what Campus Hub, Transfers, Incubation and the activity log will show once staff accounts exist.
 */

export type HubItemStatus = "waiting" | "ready" | "collected";
export type HubItem = { id: string; item: string; seller: string; buyer: string; hub: string; status: HubItemStatus; code: string; since: string };

export const HUBS = ["Main Campus Hub", "Library Hub", "Residence Hub"] as const;

export const HUB_ITEMS: HubItem[] = [
  { buyer: "Lerato M.", code: "4821", hub: "Main Campus Hub", id: "h1", item: "Casio scientific calculator", seller: "Kamo Threads", since: "10 min ago", status: "waiting" },
  { buyer: "Sipho D.", code: "7305", hub: "Main Campus Hub", id: "h2", item: "Denim jacket, size M", seller: "Kamo Threads", since: "32 min ago", status: "ready" },
  { buyer: "Naledi P.", code: "1190", hub: "Library Hub", id: "h3", item: "Statistics textbook", seller: "Bookworm Corner", since: "1 h ago", status: "ready" },
  { buyer: "Thabo K.", code: "6642", hub: "Residence Hub", id: "h4", item: "Wireless headphones", seller: "Tech Nook", since: "2 h ago", status: "waiting" },
  { buyer: "Ayanda Z.", code: "2058", hub: "Library Hub", id: "h5", item: "Lunch box set", seller: "Home Bites", since: "3 h ago", status: "collected" },
];

export type TransferStage = "listed" | "at_hub" | "with_courier" | "delivered" | "issue";
export type Transfer = { id: string; item: string; from: string; to: string; courier: string; stage: TransferStage; when: string };

export const TRANSFERS: Transfer[] = [
  { courier: "Tebogo K.", from: "Kamo Threads", id: "t1", item: "Denim jacket", stage: "with_courier", to: "Sipho D.", when: "On the way, 6 min" },
  { courier: "Unassigned", from: "Tech Nook", id: "t2", item: "Wireless headphones", stage: "at_hub", to: "Thabo K.", when: "At Residence Hub" },
  { courier: "Palesa R.", from: "Bookworm Corner", id: "t3", item: "Statistics textbook", stage: "delivered", to: "Naledi P.", when: "Delivered 11:42" },
  { courier: "Unassigned", from: "Home Bites", id: "t4", item: "Lunch box set", stage: "listed", to: "Ayanda Z.", when: "Waiting for a courier" },
  { courier: "Tebogo K.", from: "Kamo Threads", id: "t5", item: "Calculator", stage: "issue", to: "Lerato M.", when: "Buyer not at the hub" },
];

export const STAGE_LABEL: Record<TransferStage, string> = {
  at_hub: "At hub",
  delivered: "Delivered",
  issue: "Needs attention",
  listed: "Listed",
  with_courier: "With courier",
};

export type Founder = { id: string; name: string; business: string; stage: "idea" | "building" | "selling"; progress: number; next: string; mentor: string };

export const FOUNDERS: Founder[] = [
  { business: "Kamo Threads", id: "f1", mentor: "Ms. Dlamini", name: "Kamo Mokoena", next: "First ten sales", progress: 0.72, stage: "selling" },
  { business: "Bookworm Corner", id: "f2", mentor: "Mr. Naidoo", name: "Zinhle Ndlovu", next: "Photograph all stock", progress: 0.48, stage: "building" },
  { business: "Home Bites", id: "f3", mentor: "Ms. Dlamini", name: "Ayanda Zulu", next: "Food safety check", progress: 0.3, stage: "building" },
  { business: "Print and Go", id: "f4", mentor: "Unassigned", name: "Lwazi Sithole", next: "Choose a name and logo", progress: 0.1, stage: "idea" },
];

export type LogKind = "approval" | "transfer" | "support" | "system";
export type LogEntry = { id: string; kind: LogKind; text: string; by: string; when: string };

export const LOG: LogEntry[] = [
  { by: "Staff: Naidoo", id: "l1", kind: "approval", text: "Approved seller Kamo Threads: ID, student card and proof of address verified.", when: "09:12" },
  { by: "System", id: "l2", kind: "transfer", text: "Transfer t3 delivered to Naledi P. at Library Hub.", when: "11:42" },
  { by: "Staff: Dlamini", id: "l3", kind: "support", text: "Opened a case: buyer not at the hub for the calculator. Courier asked to wait 10 minutes.", when: "12:05" },
  { by: "System", id: "l4", kind: "transfer", text: "Courier Tebogo K. collected the denim jacket from Kamo Threads.", when: "12:20" },
  { by: "Staff: Naidoo", id: "l5", kind: "approval", text: "Approved courier Palesa R.: licence and vehicle checked.", when: "13:01" },
  { by: "System", id: "l6", kind: "system", text: "Daily payout run prepared for 14 sellers.", when: "14:00" },
];
