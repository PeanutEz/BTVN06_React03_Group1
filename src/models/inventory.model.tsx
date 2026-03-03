export interface InventoryItem {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  updatedAt: string;
}

export const isLowStock = (item: InventoryItem): boolean => item.stock <= item.minStock;

