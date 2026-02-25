import type { Branch, AddressValidationResult, GeoCoord } from "@/types/delivery.types";

// ─── Haversine distance (km) ─────────────────────────────────────────────────
export function haversineKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng),
      Math.sqrt(1 - sinDLat * sinDLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinDLng * sinDLng),
    );
  return R * c;
}

// ─── Better haversine (cleaner) ───────────────────────────────────────────────
export function distanceKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(hav));
}

// ─── Branches ─────────────────────────────────────────────────────────────────
export const branches: Branch[] = [
  {
    id: "HN-001",
    name: "Hylux Hoàn Kiếm",
    address: "26 Lý Thường Kiệt, Hoàn Kiếm",
    district: "Hoàn Kiếm",
    city: "Hà Nội",
    phone: "024 3825 1234",
    coord: { lat: 21.0285, lng: 105.8542 },
    deliveryRadiusKm: 4.5,
    baseDeliveryFee: 20000,
    extraFeePerKm: 5000,
    freeShippingThreshold: 200000,
    prepTimeMins: 12,
    deliveryTimeMins: 20,
    openingHours: { open: "07:00", close: "22:30", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
    isActive: true,
  },
  {
    id: "HN-002",
    name: "Hylux Cầu Giấy",
    address: "15 Trần Thái Tông, Cầu Giấy",
    district: "Cầu Giấy",
    city: "Hà Nội",
    phone: "024 3764 5678",
    coord: { lat: 21.0347, lng: 105.7961 },
    deliveryRadiusKm: 5.0,
    baseDeliveryFee: 20000,
    extraFeePerKm: 4000,
    freeShippingThreshold: 180000,
    prepTimeMins: 10,
    deliveryTimeMins: 18,
    openingHours: { open: "07:00", close: "22:00", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600",
    isActive: true,
  },
  {
    id: "HN-003",
    name: "Hylux Đống Đa",
    address: "88 Tây Sơn, Đống Đa",
    district: "Đống Đa",
    city: "Hà Nội",
    phone: "024 3511 9012",
    coord: { lat: 21.0161, lng: 105.8412 },
    deliveryRadiusKm: 4.0,
    baseDeliveryFee: 20000,
    extraFeePerKm: 5000,
    freeShippingThreshold: 150000,
    prepTimeMins: 15,
    deliveryTimeMins: 22,
    openingHours: { open: "06:30", close: "21:30", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600",
    isActive: true,
  },
  {
    id: "HCM-001",
    name: "Hylux Quận 1",
    address: "45 Nguyễn Huệ, Quận 1",
    district: "Quận 1",
    city: "TP. Hồ Chí Minh",
    phone: "028 3822 3456",
    coord: { lat: 10.7769, lng: 106.7009 },
    deliveryRadiusKm: 5.0,
    baseDeliveryFee: 22000,
    extraFeePerKm: 5000,
    freeShippingThreshold: 200000,
    prepTimeMins: 12,
    deliveryTimeMins: 25,
    openingHours: { open: "07:00", close: "23:00", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600",
    isActive: true,
  },
  {
    id: "HCM-002",
    name: "Hylux Bình Thạnh",
    address: "203 Đinh Tiên Hoàng, Bình Thạnh",
    district: "Bình Thạnh",
    city: "TP. Hồ Chí Minh",
    phone: "028 3512 7890",
    coord: { lat: 10.8033, lng: 106.7185 },
    deliveryRadiusKm: 4.5,
    baseDeliveryFee: 20000,
    extraFeePerKm: 4000,
    freeShippingThreshold: 180000,
    prepTimeMins: 10,
    deliveryTimeMins: 20,
    openingHours: { open: "07:00", close: "22:30", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=600",
    isActive: true,
  },
  {
    id: "HCM-003",
    name: "Hylux Thủ Đức",
    address: "12 Võ Văn Ngân, Thủ Đức",
    district: "Thủ Đức",
    city: "TP. Hồ Chí Minh",
    phone: "028 3964 1234",
    coord: { lat: 10.8503, lng: 106.7717 },
    deliveryRadiusKm: 6.0,
    baseDeliveryFee: 25000,
    extraFeePerKm: 5000,
    freeShippingThreshold: 250000,
    prepTimeMins: 15,
    deliveryTimeMins: 30,
    openingHours: { open: "06:30", close: "22:00", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
    isActive: true,
  },
  {
    id: "DN-001",
    name: "Hylux Hải Châu",
    address: "89 Bạch Đằng, Hải Châu",
    district: "Hải Châu",
    city: "Đà Nẵng",
    phone: "0236 356 6789",
    coord: { lat: 16.0544, lng: 108.2022 },
    deliveryRadiusKm: 5.0,
    baseDeliveryFee: 18000,
    extraFeePerKm: 4000,
    freeShippingThreshold: 150000,
    prepTimeMins: 10,
    deliveryTimeMins: 20,
    openingHours: { open: "07:00", close: "22:00", days: "Thứ 2 – Chủ nhật" },
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600",
    isActive: true,
  },
  {
    id: "DN-002",
    name: "Hylux Sơn Trà",
    address: "34 Lê Duẩn, Sơn Trà",
    district: "Sơn Trà",
    city: "Đà Nẵng",
    phone: "0236 473 0000",
    coord: { lat: 16.0678, lng: 108.2244 },
    deliveryRadiusKm: 4.0,
    baseDeliveryFee: 18000,
    extraFeePerKm: 4000,
    freeShippingThreshold: 150000,
    prepTimeMins: 12,
    deliveryTimeMins: 22,
    openingHours: { open: "07:00", close: "21:30", days: "Thứ 2 – Thứ 7" },
    imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
    isActive: false, // closed branch example
  },
];

// ─── Branch helpers ────────────────────────────────────────────────────────────

export function getBranchById(id: string): Branch | undefined {
  return branches.find((b) => b.id === id);
}

export function getActiveBranches(): Branch[] {
  return branches.filter((b) => b.isActive);
}

/** Check if a branch is currently open based on wall-clock time */
export function isBranchOpen(branch: Branch): boolean {
  if (!branch.isActive) return false;
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;
  const [oh, om] = branch.openingHours.open.split(":").map(Number);
  const [ch, cm] = branch.openingHours.close.split(":").map(Number);
  return current >= oh * 60 + om && current < ch * 60 + cm;
}

/** Calculate delivery fee for a branch given a distance */
export function calcDeliveryFee(branch: Branch, distKm: number): number {
  if (distKm <= 1) return branch.baseDeliveryFee;
  const extra = Math.max(0, distKm - 1) * branch.extraFeePerKm;
  return Math.ceil((branch.baseDeliveryFee + extra) / 1000) * 1000;
}

/**
 * Validate a user coordinate against all branches.
 * Returns nearest branch within delivery radius if found.
 */
export function validateDeliveryAddress(
  userCoord: GeoCoord,
): AddressValidationResult {
  const active = getActiveBranches();
  if (!active.length) {
    return { isValid: false, nearestBranch: null, distanceKm: null, estimatedDeliveryFee: null, message: "Hiện chưa có chi nhánh nào hoạt động." };
  }

  // Compute distance to all branches
  const withDist = active.map((b) => ({ branch: b, dist: distanceKm(userCoord, b.coord) }));
  withDist.sort((a, b) => a.dist - b.dist);

  const closest = withDist[0];
  const inRadius = withDist.filter((x) => x.dist <= x.branch.deliveryRadiusKm);

  if (inRadius.length === 0) {
    return {
      isValid: false,
      nearestBranch: closest.branch,
      distanceKm: closest.dist,
      estimatedDeliveryFee: null,
      message: `Địa chỉ của bạn nằm ngoài vùng giao hàng. Chi nhánh gần nhất cách bạn ${closest.dist.toFixed(1)} km (bán kính giao hàng ${closest.branch.deliveryRadiusKm} km).`,
    };
  }

  const best = inRadius[0];
  const fee = calcDeliveryFee(best.branch, best.dist);
  return {
    isValid: true,
    nearestBranch: best.branch,
    distanceKm: best.dist,
    estimatedDeliveryFee: fee,
    message: undefined,
  };
}

/**
 * Geocode a Vietnamese address string → approximate GeoCoord.
 * Uses a simple keyword-based heuristic mapped to city centre coords.
 * In production this would call Google Maps / Mapbox Geocoding API.
 */
export function geocodeAddress(address: string): GeoCoord | null {
  const lower = address.toLowerCase();
  // HCM districts
  if (lower.includes("quận 1") || lower.includes("q.1") || lower.includes("nguyễn huệ") || lower.includes("đồng khởi")) return { lat: 10.7769, lng: 106.7009 };
  if (lower.includes("bình thạnh") || lower.includes("đinh tiên hoàng")) return { lat: 10.8033, lng: 106.7185 };
  if (lower.includes("thủ đức") || lower.includes("võ văn ngân")) return { lat: 10.8503, lng: 106.7717 };
  if (lower.includes("quận 2") || lower.includes("q.2") || lower.includes("thảo điền")) return { lat: 10.8012, lng: 106.7342 };
  if (lower.includes("quận 3") || lower.includes("q.3")) return { lat: 10.7849, lng: 106.6876 };
  if (lower.includes("quận 7") || lower.includes("phú mỹ hưng")) return { lat: 10.7302, lng: 106.7132 };
  if (lower.includes("hồ chí minh") || lower.includes("hcm") || lower.includes("sài gòn")) return { lat: 10.7769, lng: 106.7009 };
  // Hanoi
  if (lower.includes("hoàn kiếm") || lower.includes("hàng bông") || lower.includes("lý thường kiệt")) return { lat: 21.0285, lng: 105.8542 };
  if (lower.includes("cầu giấy") || lower.includes("trần thái tông")) return { lat: 21.0347, lng: 105.7961 };
  if (lower.includes("đống đa") || lower.includes("tây sơn")) return { lat: 21.0161, lng: 105.8412 };
  if (lower.includes("ba đình") || lower.includes("kim mã")) return { lat: 21.0359, lng: 105.8429 };
  if (lower.includes("tây hồ") || lower.includes("hồ tây")) return { lat: 21.0634, lng: 105.8263 };
  if (lower.includes("hà nội") || lower.includes("hanoi")) return { lat: 21.0285, lng: 105.8542 };
  // Da Nang
  if (lower.includes("hải châu") || lower.includes("bạch đằng")) return { lat: 16.0544, lng: 108.2022 };
  if (lower.includes("sơn trà") || lower.includes("lê duẩn")) return { lat: 16.0678, lng: 108.2244 };
  if (lower.includes("đà nẵng") || lower.includes("da nang")) return { lat: 16.0544, lng: 108.2022 };
  // Too vague or unknown city
  return null;
}

/** Estimate total time for an order */
export function estimateTotalTime(
  branch: Branch,
  mode: "DELIVERY" | "PICKUP",
  distKm?: number,
): { prepMins: number; deliveryMins: number; totalMins: number } {
  const prepMins = branch.prepTimeMins;
  const deliveryMins =
    mode === "DELIVERY"
      ? branch.deliveryTimeMins + Math.round((distKm ?? 0) * 2)
      : 0;
  return { prepMins, deliveryMins, totalMins: prepMins + deliveryMins };
}
