/**
 * Group orders: you and your housemates or classmates fill one shared basket, check out together, and the bill
 * splits by what each person added (delivery and discounts are shared equally). Demo only: friends are added by
 * name on this phone; real invites need their accounts and the backend.
 */
export type GroupMember = { id: string; name: string; isHost: boolean };
export type GroupLine = { id: string; memberId: string; listingId: string; optionId?: string; quantity: number };
export type GroupStatus = "open" | "checkout" | "placed";
export type GroupOrder = { id: string; name: string; code: string; members: GroupMember[]; lines: GroupLine[]; status: GroupStatus; orderId?: string };

export const MAX_GROUP_MEMBERS = 8;

/** "Flat 4B" becomes GRP-FLAT4B-xx; the last two characters keep codes from different groups apart. */
export function groupCode(name: string, seed: number): string {
  const base = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6).padEnd(4, "X");
  const tail = (seed % 1296).toString(36).toUpperCase().padStart(2, "0");
  return `GRP-${base}-${tail}`;
}

/**
 * What each member owes. Everyone pays for their own items; delivery and discounts are shared equally, with any
 * leftover cents going to the host, so the shares always add up to the order total.
 */
export function memberShares(input: {
  memberIds: string[];
  hostId: string;
  itemCentsByMember: Record<string, number>;
  deliveryCents: number;
  discountCents: number;
}): Record<string, number> {
  const count = Math.max(1, input.memberIds.length);
  const shared = input.deliveryCents - input.discountCents;
  const base = Math.trunc(shared / count);
  const remainder = shared - base * count;
  const result: Record<string, number> = {};
  for (const id of input.memberIds) {
    result[id] = (input.itemCentsByMember[id] ?? 0) + base + (id === input.hostId ? remainder : 0);
  }
  return result;
}
