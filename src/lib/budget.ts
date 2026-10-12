import type { ItemDTO } from "./schema";

export type Breakdown = { food: number; activities: number; lodging: number; transport: number; total: number };

/** Per-person USD split. Transport = fares to reach stops + any stop categorised as transit. */
export function breakdown(items: Pick<ItemDTO, "categoryTag" | "estimatedCost" | "transitCost">[]): Breakdown {
  const b: Breakdown = { food: 0, activities: 0, lodging: 0, transport: 0, total: 0 };
  for (const i of items) {
    b.transport += i.transitCost || 0;
    if (i.categoryTag === "food") b.food += i.estimatedCost;
    else if (i.categoryTag === "lodging") b.lodging += i.estimatedCost;
    else if (i.categoryTag === "transit") b.transport += i.estimatedCost;
    else b.activities += i.estimatedCost;
  }
  b.total = b.food + b.activities + b.lodging + b.transport;
  return b;
}
