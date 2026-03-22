export type StoreStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  manager: string;
  status: StoreStatus;
  openingHours: string;
  createDate: string;
  totalOrders?: number;
  totalRevenue?: number;
}

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngưng hoạt động",
  MAINTENANCE: "Bảo trì",
};

export const STORE_STATUS_COLORS: Record<StoreStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-gray-50 text-gray-700 border-gray-200",
  MAINTENANCE: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

// ─── CLIENT APIs ──────────────────────────────────────────────────────────────

// Response item for CLIENT-01 — Get All Franchises (GET /api/clients/franchises)
export interface ClientFranchiseItem {
  id: string;
  code: string;
  name: string;
}

// Response item for CLIENT-02 — Get All Categories By Franchise
// GET /api/clients/franchises/:franchiseId/categories
export interface ClientCategoryByFranchiseItem {
  category_id: string;
  category_name: string;
  category_code: string;
  franchise_id: string;
  franchise_name: string;
  franchise_code: string;
  display_order: number;
}
