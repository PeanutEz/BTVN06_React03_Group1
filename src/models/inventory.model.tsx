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

export const isLowStock = (item: InventoryItem): boolean =>
  item.stock <= item.minStock;

// ─── INVENTORY API ────────────────────────────────────────────────────────────

// DTO for INVENTORY-01 — Create Item (POST /api/inventories)
// NOTE: alert_threshold: cảnh báo sắp hết quantity
export interface CreateInventoryDto {
  product_franchise_id: string; // required
  quantity: number; // required
  alert_threshold: number; // required — warning threshold for low stock
}

// API response shape returned by POST /api/inventories
export interface InventoryApiResponse {
  id: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  product_franchise_id: string;
  product_id: string;
  product_name?: string; // present in search results
  franchise_id: string;
  franchise_name?: string; // present in search results
  quantity: number;
  alert_threshold: number;
}

// DTO for INVENTORY-02 — Search Items by Conditions (POST /api/inventories/search)
export interface SearchInventoryDto {
  searchCondition: {
    product_franchise_id?: string;
    franchise_id?: string;
    product_id?: string;
    quantity?: string | number;
    is_active?: string | boolean;
    is_deleted?: string | boolean; // default FALSE
  };
  pageInfo: {
    pageNum: number; // default 1
    pageSize: number; // default 10
  };
}

export interface InventorySearchResponse {
  data: InventoryApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// DTO for INVENTORY-06 — Edit Quantity (POST /api/inventories/adjust)
export interface AdjustInventoryDto {
  product_franchise_id: string; // required
  change: number; // required — positive to add, negative to subtract
  alert_threshold: number; // required by backend validation
  reason?: string; // optional, default ""
}

// Response item for INVENTORY-07 — Get Low Stock by Franchise
export interface LowStockInventoryItem {
  _id: string;
  product_franchise_id: string;
  quantity: number;
  reserved_quantity: number;
  alert_threshold: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  __v?: number;
  product_franchise?: {
    _id: string;
    product_id: string;
    franchise_id: string;
    price_base: number;
    size: string;
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    __v?: number;
  };
}

// Response item for INVENTORY-08 — Get Inventory Logs by inventoryId
// GET api/inventories/logs/:inventoryId
export interface InventoryLog {
  _id: string;
  inventory_id: string;
  product_franchise_id: string;
  change: number;
  type: string; // e.g. "ADJUST"
  reference_type: string; // e.g. "MANUAL"
  created_by: string;
  created_at: string;
  __v?: number;
}
