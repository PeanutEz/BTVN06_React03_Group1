import type { IceLevel, SugarLevel, Topping } from "@/types/menu.types";
import { ICE_LEVELS, SUGAR_LEVELS, TOPPINGS } from "@/types/menu.types";

export type ParsedCartSelectionNote = {
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppings?: Array<{ name: string; quantity: number }>;
  userNote?: string;
};


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
    }    if (lower.startsWith("topping:".toLowerCase())) {
      const raw = seg.replace(/topping:\s*/i, "").trim();
      // raw example: "Trân Châu Đen x2; Thạch Dừa x1"
      // Strategy: extract all "SomeName xN" and "SomeName" tokens from raw,
      // then map each token back to the closest TOPPINGS entry by substring match.
      const found: Array<{ name: string; quantity: number }> = [];

      // Split by ; or , to get individual topping tokens
      const tokens = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
      const normalize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      for (const token of tokens) {
        // Try to extract "Name xN" or just "Name"
        const qtyMatch = token.match(/^(.*?)\s*x\s*(\d+)\s*$/i);
        const tokenName = qtyMatch ? qtyMatch[1].trim() : token.trim();
        const quantity = qtyMatch ? Number(qtyMatch[2]) : 1;
        if (!tokenName) continue;

        const normToken = normalize(tokenName);
        // Find the best matching TOPPINGS entry: prefer exact, then longest prefix match
        const sortedToppings = [...TOPPINGS].sort((a, b) => b.name.length - a.name.length);
        const matched = sortedToppings.find((t) => {
          const normT = normalize(t.name);
          return normToken === normT || normToken.startsWith(normT) || normT.startsWith(normToken);
        });
        if (matched) {
          // Merge with existing entry for same topping
          const existing = found.find((f) => f.name === matched.name);
          if (existing) existing.quantity += quantity;
          else found.push({ name: matched.name, quantity });
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
  }  const toppingMatches: Array<{ name: string; quantity: number }> = [];
  // Token-based approach: split remaining by ; or , then map each token to TOPPINGS by substring match.
  // This correctly handles API names like "Trân Châu Đen x2" when TOPPINGS only has "Trân châu".
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const sortedToppings = [...TOPPINGS].sort((a, b) => b.name.length - a.name.length);
  const tokens = n.split(/[;,|]+/).map((s) => s.trim()).filter(Boolean);
  for (const token of tokens) {
    const qtyMatch = token.match(/^(.*?)\s*x\s*(\d+)\s*$/i);
    const tokenName = qtyMatch ? qtyMatch[1].trim() : token.trim();
    const quantity = qtyMatch ? Number(qtyMatch[2]) : 1;
    if (!tokenName) continue;
    const normToken = normalize(tokenName);
    const matched = sortedToppings.find((t) => {
      const normT = normalize(t.name);
      return normToken === normT || normToken.startsWith(normT) || normT.startsWith(normToken);
    });
    if (matched) {
      const existing = toppingMatches.find((f) => f.name === matched.name);
      if (existing) existing.quantity += quantity;
      else toppingMatches.push({ name: matched.name, quantity });
    }
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

