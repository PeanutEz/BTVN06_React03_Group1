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
