import { bestSellers, collectionsOf, ongoingOrders, orderProgress, orderTitle, searchSeller, setupChecklist, teamPeople, todayVsYesterday } from "./homeData";
import { emptySellerState } from "./state";
import type { SellerOrder } from "./types";

const order = (over: Partial<SellerOrder>): SellerOrder => ({
  buyerName: "Thabo",
  buyerVerified: true,
  courierCode: "1234",
  deliveryFeeCents: 0,
  feeCents: 0,
  fulfilment: "collection",
  fulfilmentLabel: "Campus collection",
  handoffCode: "123456",
  id: "so-1",
  lines: [{ quantity: 1, title: "Calculator", unitPriceCents: 15_000 }],
  number: "#VM-1",
  paymentLabel: "Card",
  place: "Library",
  placedAt: "2026-11-18T08:00:00.000Z",
  status: "new",
  subtotalCents: 15_000,
  totalCents: 15_000,
  ...over,
});

describe("order progress", () => {
  it("moves from a tenth when new to nearly full when ready, and has none for cancelled orders", () => {
    expect([orderProgress("new"), orderProgress("accepted"), orderProgress("preparing"), orderProgress("ready")]).toEqual([10, 35, 60, 85]);
    expect(orderProgress("cancelled")).toBe(0);
    expect(orderProgress("done")).toBe(100);
  });

  it("lists only orders in progress, new ones first and then the oldest", () => {
    const list = ongoingOrders([
      order({ id: "a", placedAt: "2026-11-18T09:00:00.000Z", status: "ready" }),
      order({ id: "b", placedAt: "2026-11-18T10:00:00.000Z", status: "new" }),
      order({ id: "c", placedAt: "2026-11-18T07:00:00.000Z", status: "accepted" }),
      order({ id: "d", status: "done" }),
      order({ id: "e", status: "declined" }),
    ]);
    expect(list.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("names an order by its first item and how many more there are", () => {
    expect(orderTitle(order({}))).toBe("Calculator");
    const lines = [
      { quantity: 1, title: "Calculator", unitPriceCents: 1 },
      { quantity: 2, title: "Cover", unitPriceCents: 1 },
      { quantity: 1, title: "Pen", unitPriceCents: 1 },
    ];
    expect(orderTitle(order({ lines }))).toBe("Calculator +2 more");
  });
});

describe("today against yesterday", () => {
  const bars = (yesterday: number, today: number) => [
    ...Array.from({ length: 5 }, () => ({ cents: 0, isToday: false, label: "Mon" })),
    { cents: yesterday, isToday: false, label: "Tue" },
    { cents: today, isToday: true, label: "Wed" },
  ];
  it("gives the change in percent, and null when yesterday had no sales", () => {
    expect(todayVsYesterday(bars(10_000, 15_000))).toEqual({ changePercent: 50, todayCents: 15_000, yesterdayCents: 10_000 });
    expect(todayVsYesterday(bars(10_000, 5_000)).changePercent).toBe(-50);
    expect(todayVsYesterday(bars(0, 5_000)).changePercent).toBeNull();
  });
});

describe("the shop checklist", () => {
  it("counts what is done and points at the next step", () => {
    const seller = emptySellerState();
    const start = setupChecklist(seller);
    expect(start.steps).toHaveLength(6);
    expect(start.next).toBeDefined();
    const profile = { ...seller.profile, bank: { accountHolder: "V", bankName: "Capitec", last4: "1234" }, bannerUri: "file:///b.jpg", description: "Books and notes for students", logoUri: "file:///l.jpg" };
    const later = setupChecklist({ ...seller, profile });
    expect(later.done).toBeGreaterThan(start.done);
    expect(later.steps.find((step) => step.key === "bank")?.done).toBe(true);
    expect(later.percent).toBe(Math.round((later.done / 6) * 100));
  });
});

describe("best sellers and search", () => {
  const orders = [
    order({ id: "1", lines: [{ quantity: 3, title: "Desk lamp", unitPriceCents: 1 }, { quantity: 1, title: "Pen", unitPriceCents: 1 }] }),
    order({ id: "2", lines: [{ quantity: 2, title: "Desk lamp", unitPriceCents: 1 }] }),
    order({ id: "3", lines: [{ quantity: 9, title: "Cancelled thing", unitPriceCents: 1 }], status: "cancelled" }),
  ];
  it("ranks products by units sold and ignores cancelled orders", () => {
    const list = bestSellers(orders, []);
    expect(list.map((item) => [item.title, item.sold])).toEqual([
      ["Desk lamp", 5],
      ["Pen", 1],
    ]);
  });

  it("finds orders by number, buyer or item, and nothing for an empty search", () => {
    const seller = { listings: [], orders };
    expect(searchSeller(seller, "lamp").orders.map((item) => item.id)).toEqual(["1", "2"]);
    expect(searchSeller(seller, "thabo").orders).toHaveLength(3);
    expect(searchSeller(seller, "  ").orders).toHaveLength(0);
    expect(searchSeller(seller, "nope").orders).toHaveLength(0);
  });
});

describe("collections and the team", () => {
  const listing = (id: string, category: "food" | "books" | "electronics", status: "published" | "archived" = "published") => ({ artId: undefined, category, description: "", id, onHand: 1, optionId: undefined, photos: [], priceCents: 100, sku: id, status, title: id, unlimited: false, updatedAt: "", variants: [] });
  it("groups products by category, biggest first, and leaves archived ones out", () => {
    const list = collectionsOf([listing("a", "food"), listing("b", "books"), listing("c", "books"), listing("d", "electronics", "archived")]);
    expect(list.map((item) => [item.label, item.count])).toEqual([
      ["Books", 2],
      ["Food", 1],
    ]);
  });

  it("lists the owner and helpers, then the couriers who took the seller's orders by how many", () => {
    const team = [{ email: "me@vossie.net", id: "t1", name: "Vumisa", role: "owner" as const }];
    const courier = (name: string) => ({ arrivesInMin: 5, name, rating: 5, vehicle: "Scooter" });
    const orders = [order({ courier: courier("Linda M"), id: "a" }), order({ courier: courier("Linda M"), id: "b" }), order({ courier: courier("Sipho K"), id: "c" }), order({ courier: courier("Ignored"), id: "d", status: "cancelled" })];
    const people = teamPeople({ orders, team });
    expect(people.map((person) => [person.name, person.role])).toEqual([
      ["Vumisa", "Owner"],
      ["Linda M", "Courier"],
      ["Sipho K", "Courier"],
    ]);
    expect(people[1]!.detail).toBe("2 deliveries for you");
    expect(people[2]!.detail).toBe("1 delivery for you");
  });
});
