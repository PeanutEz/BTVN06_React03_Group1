import type { PaymentMethod } from "@/types/delivery.types";

interface StaticQrPayload {
  provider: PaymentMethod;
  amount: number;
  orderRef: string;
  bankName?: string;
}

const PROVIDER_META: Record<Exclude<PaymentMethod, "CASH">, { label: string; icon: string; accent: string }> = {
  MOMO: { label: "Ví MoMo", icon: "🟣", accent: "#a50064" },
  ZALOPAY: { label: "Ví ZaloPay", icon: "🔵", accent: "#0068ff" },
  SHOPEEPAY: { label: "Ví ShopeePay", icon: "🟠", accent: "#ee4d2d" },
  BANK: { label: "Thẻ NH / Chuyển khoản", icon: "🏦", accent: "#d97706" },
};

export function getPaymentMethodMeta(provider: PaymentMethod, bankName?: string) {
  if (provider === "CASH") {
    return { label: "Tiền mặt (COD)", icon: "💵", accent: "#16a34a" };
  }

  if (provider === "BANK") {
    return {
      ...PROVIDER_META.BANK,
      label: bankName ? `${PROVIDER_META.BANK.label} · ${bankName}` : PROVIDER_META.BANK.label,
    };
  }

  return PROVIDER_META[provider];
}

function hashSeed(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function drawFinderPattern(cells: boolean[][], startRow: number, startCol: number) {
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      cells[startRow + r][startCol + c] = isBorder || isInner;
    }
  }
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildStaticPaymentQr({ provider, amount, orderRef, bankName }: StaticQrPayload) {
  if (provider === "CASH") return undefined;

  const meta = getPaymentMethodMeta(provider, bankName);
  const seedText = `${provider}|${amount}|${orderRef}|${bankName ?? ""}`;
  const seed = hashSeed(seedText);
  const gridSize = 29;
  const cellSize = 7;
  const qrSize = gridSize * cellSize;
  const qrOffset = Math.round((320 - qrSize) / 2);
  const cells = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => false));

  drawFinderPattern(cells, 0, 0);
  drawFinderPattern(cells, 0, gridSize - 7);
  drawFinderPattern(cells, gridSize - 7, 0);

  for (let r = 0; r < gridSize; r += 1) {
    for (let c = 0; c < gridSize; c += 1) {
      const reserved = (r < 8 && c < 8)
        || (r < 8 && c >= gridSize - 8)
        || (r >= gridSize - 8 && c < 8);

      if (reserved) continue;

      const mix = Math.abs(Math.sin(seed + r * 17 + c * 31) * 10000);
      cells[r][c] = mix % 1 > 0.46;
    }
  }

  let rects = "";
  cells.forEach((row, r) => {
    row.forEach((filled, c) => {
      if (filled) {
        rects += `<rect x="${qrOffset + c * cellSize}" y="${qrOffset + r * cellSize}" width="${cellSize}" height="${cellSize}" rx="1.5" />`;
      }
    });
  });

  const amountLabel = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

  const providerLabel = bankName && provider === "BANK"
    ? `${meta.icon} ${bankName}`
    : `${meta.icon} ${meta.label}`;

  const footerLabel = provider === "BANK"
    ? `${amountLabel} · ${orderRef}`
    : `${meta.label} · ${orderRef}`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <rect width="320" height="320" rx="28" fill="#ffffff" />
    <rect x="10" y="10" width="300" height="300" rx="22" fill="#ffffff" stroke="#fde7c2" stroke-width="2" />
    <rect x="26" y="26" width="268" height="268" rx="24" fill="#ffffff" stroke="#f3f4f6" stroke-width="2" />
    <g fill="#111827">${rects}</g>
    <rect x="128" y="128" width="64" height="64" rx="18" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" />
    <circle cx="160" cy="160" r="21" fill="${meta.accent}" opacity="0.16" />
    <text x="160" y="168" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24">${escapeXml(meta.icon)}</text>
    <rect x="32" y="250" width="256" height="40" rx="14" fill="#fffaf3" stroke="#fde7c2" stroke-width="1.5" />
    <text x="160" y="267" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#111827">${escapeXml(providerLabel)}</text>
    <text x="160" y="282" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#6b7280">${escapeXml(footerLabel)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
