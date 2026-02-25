import type { Store } from "../models/store.model";

// Mock data - WBS_Coffee Franchise Stores
const mockStores: Store[] = [
  {
    id: "STORE001",
    name: "WBS Coffee Nguyễn Huệ",
    code: "WBS-NH",
    address: "135 Nguyễn Huệ, Quận 1",
    city: "TP. Hồ Chí Minh",
    phone: "028-3822-5678",
    email: "nguyenhue@wbscoffee.vn",
    manager: "Nguyễn Văn Minh",
    status: "ACTIVE",
    openingHours: "07:00 - 22:00",
    createDate: "2024-01-15T00:00:00Z",
    totalOrders: 1250,
    totalRevenue: 125000000,
  },
  {
    id: "STORE002",
    name: "WBS Coffee Lê Lợi",
    code: "WBS-LL",
    address: "89 Lê Lợi, Quận 1",
    city: "TP. Hồ Chí Minh",
    phone: "028-3825-9999",
    email: "leloi@wbscoffee.vn",
    manager: "Trần Thị Hương",
    status: "ACTIVE",
    openingHours: "06:30 - 23:00",
    createDate: "2024-02-20T00:00:00Z",
    totalOrders: 980,
    totalRevenue: 98000000,
  },
  {
    id: "STORE003",
    name: "WBS Coffee Thảo Điền",
    code: "WBS-TD",
    address: "12 Xuân Thủy, Thảo Điền, Quận 2",
    city: "TP. Hồ Chí Minh",
    phone: "028-3744-5566",
    email: "thaodien@wbscoffee.vn",
    manager: "Lê Quang Hải",
    status: "ACTIVE",
    openingHours: "07:00 - 22:30",
    createDate: "2024-03-10T00:00:00Z",
    totalOrders: 750,
    totalRevenue: 85000000,
  },
  {
    id: "STORE004",
    name: "WBS Coffee Phú Mỹ Hưng",
    code: "WBS-PMH",
    address: "15 Nguyễn Lương Bằng, Quận 7",
    city: "TP. Hồ Chí Minh",
    phone: "028-5412-3344",
    email: "phumyhung@wbscoffee.vn",
    manager: "Phạm Thu Thảo",
    status: "MAINTENANCE",
    openingHours: "07:00 - 22:00",
    createDate: "2024-05-01T00:00:00Z",
    totalOrders: 420,
    totalRevenue: 42000000,
  },
];

export const fetchStores = async (): Promise<Store[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockStores;
};

export const fetchStoreById = async (id: string): Promise<Store | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockStores.find((store) => store.id === id) || null;
};

export const fetchActiveStores = async (): Promise<Store[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockStores.filter((store) => store.status === "ACTIVE");
};
