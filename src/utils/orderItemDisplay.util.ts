import { parseCartSelectionNote } from "@/utils/cartSelectionNote.util";

type ToppingEntry = { name: string; quantity: number };

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function parseToppingText(raw: string): ToppingEntry[] {
  const text = raw.trim();
  if (!text) return [];

  return text
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*(?:x\s*(\d+))?$/i);
      const name = (match?.[1] ?? part).trim();
      const quantity = Number(match?.[2] ?? "1");
      return {
        name,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      };
    })
    .filter((entry) => entry.name);
}

function collectToppings(input: unknown): ToppingEntry[] {
  if (!input) return [];

  if (typeof input === "string") {
    return parseToppingText(input);
  }

  if (Array.isArray(input)) {
    return input
      .map((value) => {
        if (!value) return null;
        if (typeof value === "string") {
          const parsed = parseToppingText(value);
          return parsed.length > 0 ? parsed[0] : null;
        }
        if (typeof value === "object") {
          const name = firstText(
            (value as any)?.name,
            (value as any)?.label,
            (value as any)?.topping_name,
            (value as any)?.product_name,
            (value as any)?.product_name_snapshot,
            (value as any)?.option_name,
          );
          const quantityRaw = Number(
            (value as any)?.quantity ?? (value as any)?.qty ?? (value as any)?.count ?? 1,
          );
          return name
            ? {
                name,
                quantity: Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1,
              }
            : null;
        }
        return null;
      })
      .filter(Boolean) as ToppingEntry[];
  }

  return [];
}

function mergeToppings(...groups: ToppingEntry[][]): ToppingEntry[] {
  const map = new Map<string, ToppingEntry>();
  for (const group of groups) {
    for (const topping of group) {
      const key = topping.name.trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        // Same topping can come from duplicated payload shapes; keep the highest quantity.
        existing.quantity = Math.max(existing.quantity, topping.quantity);
      } else {
        map.set(key, { name: topping.name.trim(), quantity: topping.quantity });
      }
    }
  }
  return Array.from(map.values());
}

function normalizeSugarLabel(raw: string): string {
  const sugar = raw.trim();
  if (!sugar) return "";
  return /đường/i.test(sugar) ? sugar : `${sugar} đường`;
}

function normalizeSizeLabel(raw: string): string {
  const size = raw.trim();
  if (!size) return "";
  if (/^size\s+/i.test(size)) return size;
  if (/^(s|m|l)$/i.test(size)) return size.toUpperCase();
  return size;
}

function detectSizeFromText(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  const explicit = text.match(/size\s*[:\-]?\s*(s|m|l)/i);
  if (explicit?.[1]) return explicit[1].toUpperCase();

  if (/\bsize\s*s\b/i.test(text) || /\bnh[oỏ]\b/i.test(text)) return "S";
  if (/\bsize\s*m\b/i.test(text) || /\bv[ừa]\b/i.test(text)) return "M";
  if (/\bsize\s*l\b/i.test(text) || /\bl[ớo]n\b/i.test(text)) return "L";

  const compactToken = text.match(/(?:^|\s|\(|\[)(s|m|l)(?:\s|$|\)|\])/i);
  if (compactToken?.[1]) return compactToken[1].toUpperCase();

  return "";
}

function detectSizeFromOptionLabels(labels: string[]): string {
  for (const label of labels) {
    const parsed = detectSizeFromText(label);
    if (parsed) return parsed;
  }
  return "";
}

function cleanNote(raw: string, toppings: ToppingEntry[]): string {
  const note = raw.replace(/\s+/g, " ").trim();
  if (!note) return "";

  // Ignore orphan quantity markers that are usually broken wraps from payload text.
  if (/^x\s*\d+$/i.test(note)) return "";
  // Ignore note lines that only repeat topping content header.
  if (/^topping\s*:/i.test(note)) return "";

  if (toppings.length > 0) {
    const normalized = note.toLowerCase();
    const includesAllToppings = toppings.every((entry) => normalized.includes(entry.name.toLowerCase()));
    if (includesAllToppings) return "";
  }

  return note;
}

function getOptionLabels(options: unknown): string[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((opt) => {
      if (!opt) return "";
      if (typeof opt === "string") return opt.trim();
      if (typeof opt === "object") {
        return firstText((opt as any)?.name, (opt as any)?.option_name, (opt as any)?.label);
      }
      return "";
    })
    .filter(Boolean);
}

export function getOrderItemDisplayMeta(item: Record<string, unknown>) {
  const options = item?.options;
  const optionObj =
    options && typeof options === "object" && !Array.isArray(options)
      ? (options as Record<string, unknown>)
      : undefined;

  const rawNote = firstText(
    item?.note,
    item?.message,
    item?.note_snapshot,
    item?.selection_note,
    item?.special_instruction,
  );
  const parsedNote = parseCartSelectionNote(rawNote || undefined);

  const optionLabels = getOptionLabels(options).filter((label) => {
    const normalized = label.toLowerCase();
    return !normalized.includes("topping") && !normalized.includes("đường") && !normalized.includes("đá");
  });

  const size = firstText(
    item?.size,
    item?.size_snapshot,
    item?.option_size,
    item?.size_name,
    item?.size_label,
    item?.variant_size,
    optionObj?.size,
    optionObj?.size_name,
    optionObj?.size_label,
    detectSizeFromOptionLabels(optionLabels),
    detectSizeFromText(rawNote),
    detectSizeFromText(
      [
        firstText(item?.product_name_snapshot, item?.product_name, item?.name),
        optionLabels.join(" "),
      ].join(" "),
    ),
  );
  const sugar = firstText(
    item?.sugar,
    item?.sugar_level,
    item?.sugar_snapshot,
    optionObj?.sugar,
    parsedNote.sugar,
  );
  const ice = firstText(
    item?.ice,
    item?.ice_level,
    item?.ice_snapshot,
    optionObj?.ice,
    parsedNote.ice,
  );

  const toppings = mergeToppings(
    collectToppings(item?.toppings),
    collectToppings(item?.toppings_snapshot),
    collectToppings(item?.toppings_text),
    collectToppings(item?.topping_text),
    collectToppings(optionObj?.toppings),
    collectToppings(optionObj?.options),
    collectToppings(options),
    (parsedNote.toppings ?? []).map((entry) => ({
      name: entry.name,
      quantity: entry.quantity,
    })),
  );

  const inlineParts = [
    normalizeSizeLabel(size),
    normalizeSugarLabel(sugar),
    ice,
    ...optionLabels,
  ].filter(Boolean);

  const hasStructuredNote = /lượng đá\s*:|lượng đường\s*:|topping\s*:|ghi chú\s*:/i.test(rawNote);
  const noteCandidate = hasStructuredNote
    ? asText(parsedNote.userNote)
    : asText(parsedNote.userNote || rawNote);
  const noteText = cleanNote(noteCandidate, toppings);

  const toppingsText = toppings.length
    ? toppings.map((entry) => `${entry.name} x${entry.quantity}`).join(", ")
    : "";

  return {
    size: normalizeSizeLabel(size),
    sugar: normalizeSugarLabel(sugar),
    ice,
    inlineMeta: inlineParts.join(" • "),
    toppings,
    toppingsText,
    noteText,
  };
}
