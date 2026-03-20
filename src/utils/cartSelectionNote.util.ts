import type { IceLevel, SugarLevel, Topping } from "@/types/menu.types";
import { ICE_LEVELS, SUGAR_LEVELS, TOPPINGS } from "@/types/menu.types";

export type ParsedCartSelectionNote = {
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppings?: Array<{ name: string; quantity: number }>;
  userNote?: string;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function aggregateToppings(toppings: Topping[]) {
  const map = new Map<string, { topping: Topping; quantity: number }>();
  for (const t of toppings) {
    const prev = map.get(t.id);
    if (prev) prev.quantity += 1;
    else map.set(t.id, { topping: t, quantity: 1 });
  }
  return Array.from(map.values());
}

export function buildCartSelectionNote(opts: {
  sugar: SugarLevel;
  ice: IceLevel;
  toppings?: Topping[];
  userNote?: string;
}) {
  const toppings = opts.toppings ?? [];
  const toppingAgg = aggregateToppings(toppings);
  const toppingStr =
    toppingAgg.length > 0
      ? toppingAgg
          .map(({ topping, quantity }) => `${topping.name} x${quantity}`)
          .join("; ")
      : "";

  const parts: string[] = [];
  parts.push(`Lượng đá: ${opts.ice}`);
  parts.push(`Lượng đường: ${opts.sugar}`);
  if (toppingStr) parts.push(`Topping: ${toppingStr}`);
  if (opts.userNote?.trim()) parts.push(`Ghi chú: ${opts.userNote.trim()}`);
  return parts.join(" | ");
}

function parseFromPrefixedSegments(note: string): ParsedCartSelectionNote {
  const segments = note
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const result: ParsedCartSelectionNote = {};
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    if (lower.startsWith("lượng đường:".toLowerCase())) {
      const v = seg.replace(/lượng đường:\s*/i, "").trim();
      const match = SUGAR_LEVELS.find((s) => s === v);
      if (match) result.sugar = match;
      continue;
    }
    if (lower.startsWith("lượng đá:".toLowerCase())) {
      const v = seg.replace(/lượng đá:\s*/i, "").trim();
      const match = ICE_LEVELS.find((s) => s === v);
      if (match) result.ice = match;
      continue;
    }
    if (lower.startsWith("topping:".toLowerCase())) {
      const raw = seg.replace(/topping:\s*/i, "").trim();
      // raw example: "Trân châu x2; Thạch x1"
      const found: Array<{ name: string; quantity: number }> = [];
      for (const t of TOPPINGS) {
        const qtyMatch = raw.match(new RegExp(`${escapeRegExp(t.name)}\\s*x\\s*(\\d+)`, "i"));
        if (qtyMatch) {
          found.push({ name: t.name, quantity: Number(qtyMatch[1]) });
        } else {
          // If topping name exists without "xN", assume 1.
          if (raw.toLowerCase().includes(t.name.toLowerCase())) found.push({ name: t.name, quantity: 1 });
        }
      }
      if (found.length > 0) result.toppings = found;
      continue;
    }
    if (lower.startsWith("ghi chú:".toLowerCase())) {
      result.userNote = seg.replace(/ghi chú:\s*/i, "").trim();
    }
  }
  return result;
}

export function parseCartSelectionNote(note?: string | null): ParsedCartSelectionNote {
  if (!note) return {};
  const n = String(note).trim();
  if (!n) return {};

  // If note contains our newer formatted prefixes, parse strictly first.
  const hasAnyPrefix = /lượng đá\s*:|lượng đường\s*:|topping\s*:|ghi chú\s*:/i.test(n);
  if (hasAnyPrefix) {
    return parseFromPrefixedSegments(n);
  }

  // Fallback: try to detect sugar/ice by inclusion, then toppings by known names.
  const result: ParsedCartSelectionNote = {};
  for (const ice of ICE_LEVELS) {
    if (n.toLowerCase().includes(ice.toLowerCase())) {
      result.ice = ice;
      break;
    }
  }
  for (const sugar of SUGAR_LEVELS) {
    if (n.includes(sugar)) {
      result.sugar = sugar;
      break;
    }
  }

  const toppingMatches: Array<{ name: string; quantity: number }> = [];
  for (const t of TOPPINGS) {
    const qtyMatch = n.match(new RegExp(`${escapeRegExp(t.name)}\\s*x\\s*(\\d+)`, "i"));
    if (qtyMatch) toppingMatches.push({ name: t.name, quantity: Number(qtyMatch[1]) });
    else if (n.toLowerCase().includes(t.name.toLowerCase())) toppingMatches.push({ name: t.name, quantity: 1 });
  }
  if (toppingMatches.length > 0) result.toppings = toppingMatches;

  // If we can't reliably split user note, keep it as userNote.
  result.userNote = n;
  return result;
}

export function formatToppingsSummary(toppings?: Array<{ name: string; quantity: number }>) {
  if (!toppings || toppings.length === 0) return "";
  return toppings
    .map((t) => (t.quantity > 1 ? `${t.name} x${t.quantity}` : `${t.name}`))
    .join(", ");
}

