import type { IceLevel, SugarLevel, Topping } from "@/types/menu.types";
import { ICE_LEVELS, SUGAR_LEVELS, TOPPINGS } from "@/types/menu.types";

export type ParsedCartSelectionNote = {
  sugar?: SugarLevel;
  ice?: IceLevel;
  toppings?: Array<{ name: string; quantity: number }>;
  userNote?: string;
};

type CartOptionLike = {
  quantity?: number;
  name?: string;
  product_name?: string;
  product_name_snapshot?: string;
};

const ICE_LABEL = "Lượng đá";
const SUGAR_LABEL = "Lượng đường";
const NOTE_LABEL = "Ghi chú";

const ICE_PREFIXES = [ICE_LABEL, "Luong da", "ICE", "LÆ°á»£ng Ä‘á", "LÃ†Â°Ã¡Â»Â£ng Ã„â€˜ÃƒÂ¡"];
const SUGAR_PREFIXES = [SUGAR_LABEL, "Luong duong", "SUGAR", "LÆ°á»£ng Ä‘Æ°á»ng", "LÃ†Â°Ã¡Â»Â£ng Ã„â€˜Ã†Â°Ã¡Â»Âng"];
const NOTE_PREFIXES = [NOTE_LABEL, "Ghi chu", "NOTE", "Ghi chÃº", "Ghi chÃƒÂº"];
const TOPPING_PREFIXES = ["Topping", "TOPPING"];

function startsWithAnyPrefix(segment: string, prefixes: string[]) {
  const trimmed = segment.trim();
  const lowered = trimmed.toLowerCase();

  return prefixes.some((prefix) => {
    const normalizedPrefix = prefix.trim().toLowerCase();
    return lowered.startsWith(`${normalizedPrefix}:`) || lowered.startsWith(`${normalizedPrefix} :`);
  });
}

function stripAnyPrefix(segment: string, prefixes: string[]) {
  const trimmed = segment.trim();
  const lowered = trimmed.toLowerCase();

  for (const prefix of prefixes) {
    const normalizedPrefix = prefix.trim().toLowerCase();
    if (lowered.startsWith(normalizedPrefix)) {
      return trimmed.slice(prefix.length).replace(/^[:\s-]+/, "").trim();
    }
  }

  const colonIndex = trimmed.indexOf(":");
  return (colonIndex >= 0 ? trimmed.slice(colonIndex + 1) : trimmed).trim();
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
  const parts: string[] = [];
  parts.push(`${ICE_LABEL}: ${opts.ice}`);
  parts.push(`${SUGAR_LABEL}: ${opts.sugar}`);
  if (opts.userNote?.trim()) parts.push(`${NOTE_LABEL}: ${opts.userNote.trim()}`);
  return parts.join(" | ");
}

function parseFromPrefixedSegments(note: string): ParsedCartSelectionNote {
  const segments = note
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const result: ParsedCartSelectionNote = {};
  for (const seg of segments) {
    if (startsWithAnyPrefix(seg, SUGAR_PREFIXES)) {
      const v = stripAnyPrefix(seg, SUGAR_PREFIXES);
      const match = SUGAR_LEVELS.find((s) => s === v);
      if (match) result.sugar = match;
      continue;
    }

    if (startsWithAnyPrefix(seg, ICE_PREFIXES)) {
      const v = stripAnyPrefix(seg, ICE_PREFIXES);
      const match = ICE_LEVELS.find((s) => s === v);
      if (match) result.ice = match;
      continue;
    }

    if (startsWithAnyPrefix(seg, TOPPING_PREFIXES)) {
      const raw = stripAnyPrefix(seg, TOPPING_PREFIXES);
      const found: Array<{ name: string; quantity: number }> = [];
      const tokens = raw.split(/[;,]+/).map((s) => s.trim()).filter(Boolean);
      const normalize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      for (const token of tokens) {
        const qtyMatch = token.match(/^(.*?)\s*x\s*(\d+)\s*$/i);
        const tokenName = qtyMatch ? qtyMatch[1].trim() : token.trim();
        const quantity = qtyMatch ? Number(qtyMatch[2]) : 1;
        if (!tokenName) continue;

        const normToken = normalize(tokenName);
        const sortedToppings = [...TOPPINGS].sort((a, b) => b.name.length - a.name.length);
        const matched = sortedToppings.find((t) => {
          const normT = normalize(t.name);
          return normToken === normT || normToken.startsWith(normT) || normT.startsWith(normToken);
        });
        if (matched) {
          const existing = found.find((f) => f.name === matched.name);
          if (existing) existing.quantity += quantity;
          else found.push({ name: matched.name, quantity });
        }
      }

      if (found.length > 0) result.toppings = found;
      continue;
    }

    if (startsWithAnyPrefix(seg, NOTE_PREFIXES)) {
      const cleaned = stripAnyPrefix(seg, NOTE_PREFIXES);
      if (cleaned) result.userNote = cleaned;
    }
  }
  return result;
}

export function parseCartSelectionNote(note?: string | null): ParsedCartSelectionNote {
  if (!note) return {};
  const n = String(note).trim();
  if (!n) return {};

  const hasAnyPrefix =
    startsWithAnyPrefix(n, ICE_PREFIXES) ||
    startsWithAnyPrefix(n, SUGAR_PREFIXES) ||
    startsWithAnyPrefix(n, TOPPING_PREFIXES) ||
    startsWithAnyPrefix(n, NOTE_PREFIXES) ||
    /luong da\s*:|luong duong\s*:|topping\s*:|ghi chu\s*:/i.test(
      n.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    );

  if (hasAnyPrefix) {
    return parseFromPrefixedSegments(n);
  }

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

  result.userNote = n;
  return result;
}

export function formatToppingsSummary(toppings?: Array<{ name: string; quantity: number }>) {
  if (!toppings || toppings.length === 0) return "";
  return toppings
    .map((t) => (t.quantity > 1 ? `${t.name} x${t.quantity}` : `${t.name}`))
    .join(", ");
}

function normalizeCompare(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCartOptionName(option: CartOptionLike): string {
  return String(
    option.product_name ??
      option.product_name_snapshot ??
      option.name ??
      "",
  ).trim();
}

export function formatCartOptionsSummary(options?: CartOptionLike[]) {
  if (!options || options.length === 0) return "";
  const aggregated = new Map<string, number>();

  for (const option of options) {
    const name = getCartOptionName(option);
    if (!name) continue;
    aggregated.set(name, (aggregated.get(name) ?? 0) + Math.max(1, option.quantity ?? 1));
  }

  if (aggregated.size === 0) return "";

  return Array.from(aggregated.entries())
    .map(([name, quantity]) => (quantity > 1 ? `${name} x${quantity}` : name))
    .join(", ");
}

export function stripGeneratedCartNote(note?: string | null) {
  if (!note) return undefined;
  const segments = String(note)
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return undefined;

  const kept = segments.flatMap((segment) => {
    const normalized = normalizeCompare(segment);

    if (startsWithAnyPrefix(segment, ICE_PREFIXES) || normalized.includes("luong da")) return [];
    if (startsWithAnyPrefix(segment, SUGAR_PREFIXES) || normalized.includes("luong duong")) return [];
    if (startsWithAnyPrefix(segment, TOPPING_PREFIXES) || normalized.startsWith("topping")) return [];
    if (startsWithAnyPrefix(segment, NOTE_PREFIXES) || normalized.startsWith("ghi chu")) {
      const cleaned = stripAnyPrefix(segment, NOTE_PREFIXES);
      return cleaned ? [cleaned] : [];
    }

    return [segment];
  });

  const joined = kept
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" | ")
    .trim();
  return joined || undefined;
}
