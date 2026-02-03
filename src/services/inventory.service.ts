import type { InventoryItem } from "../models/inventory.model";

const mockInventory: InventoryItem[] = [
  {
    id: "INV-1",
    storeId: "STORE001",
    storeName: "WBS Coffee Nguyễn Huệ",
    productId: "P001",
    productName: "Espresso",
    sku: "CF-ESP-01",
    category: "Cà phê",
    stock: 20,
    minStock: 10,
    unit: "ly",
    updatedAt: "2024-06-01T08:30:00Z",
  },
  {
    id: "INV-2",
    storeId: "STORE001",
    storeName: "WBS Coffee Nguyễn Huệ",
    productId: "P002",
    productName: "Latte",
    sku: "CF-LAT-01",
    category: "Cà phê",
    stock: 8,
    minStock: 15,
    unit: "ly",
    updatedAt: "2024-06-01T08:35:00Z",
  },
  {
    id: "INV-3",
    storeId: "STORE002",
    storeName: "WBS Coffee Lê Lợi",
    productId: "P001",
    productName: "Espresso",
    sku: "CF-ESP-01",
    category: "Cà phê",
    stock: 30,
    minStock: 10,
    unit: "ly",
    updatedAt: "2024-06-01T08:40:00Z",
  },
  {
    id: "INV-4",
    storeId: "STORE003",
    storeName: "WBS Coffee Thảo Điền",
    productId: "P003",
    productName: "Cold Brew",
    sku: "CF-CB-01",
    category: "Cold Brew",
    stock: 5,
    minStock: 10,
    unit: "ly",
    updatedAt: "2024-06-01T08:45:00Z",
  },
];

export const fetchInventoryByStore = async (storeId?: string): Promise<InventoryItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (!storeId) return mockInventory;
  return mockInventory.filter((item) => item.storeId === storeId);
};

export const updateInventoryStock = async (id: string, stock: number): Promise<InventoryItem | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockInventory.findIndex((i) => i.id === id);
  if (index === -1) return null;
  mockInventory[index] = {
    ...mockInventory[index],
    stock,
    updatedAt: new Date().toISOString(),
  };
  return mockInventory[index];
};

