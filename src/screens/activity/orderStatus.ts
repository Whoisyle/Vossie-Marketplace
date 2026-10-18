import type { Order, OrderStatus } from "@/data/types";

export const ORDER_STEPS = 4;

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

const statuses: Record<OrderStatus, { label: string; tone: Tone; step: number }> = {
  placed: { label: "Placed", tone: "info", step: 0 },
  accepted: { label: "Accepted", tone: "info", step: 1 },
  preparing: { label: "Preparing", tone: "warning", step: 2 },
  ready: { label: "Ready", tone: "success", step: 3 },
  "on-the-way": { label: "On the way", tone: "info", step: 3 },
  delivered: { label: "Delivered", tone: "success", step: 4 },
  cancelled: { label: "Cancelled", tone: "danger", step: 0 },
};

export function statusInfo(status: OrderStatus) {
  return statuses[status];
}

/** Zero-based progress dot (of ORDER_STEPS + 1 dots) for an order. */
export function progressStep(order: Pick<Order, "status">): number {
  return statuses[order.status].step;
}

export function isActive(order: Pick<Order, "status">): boolean {
  return order.status !== "delivered" && order.status !== "cancelled";
}

export function orderSummary(order: Pick<Order, "lines">): string {
  const [first, ...rest] = order.lines;
  if (!first) return "Order";
  return rest.length ? `${first.title} +${rest.length} more` : first.title;
}
