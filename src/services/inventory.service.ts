import apiClient from "@/services/api.client";
import type {
  CreateInventoryDto,
  InventoryApiResponse,
  SearchInventoryDto,
  InventorySearchResponse,
  AdjustInventoryDto,
  LowStockInventoryItem,
} from "@/models/inventory.model";

export const adminInventoryService = {
  // INVENTORY-01 — Create Item
  // POST /api/inventories  |  Role: ADMIN, MANAGER  |  Token: required
  // NOTE: alert_threshold: cảnh báo sắp hết quantity
  createInventory: async (dto: CreateInventoryDto): Promise<InventoryApiResponse> => {
    const payload: CreateInventoryDto = {
      product_franchise_id: dto.product_franchise_id,
      quantity: dto.quantity,
      alert_threshold: dto.alert_threshold,
    };
    const response = await apiClient.post<{
      success: boolean;
      data: InventoryApiResponse;
    }>("/inventories", payload);
    return response.data.data;
  },

  // INVENTORY-02 — Search Items by Conditions
  // POST /api/inventories/search  |  Role: SYSTEM & FRANCHISE  |  Token: required
  searchInventories: async (dto: SearchInventoryDto): Promise<InventorySearchResponse> => {
    const response = await apiClient.post<{
      success: boolean;
      data: InventorySearchResponse;
    }>("/inventories/search", dto);
    return response.data.data;
  },

  // INVENTORY-03 — Get Item
  // GET /api/inventories/:id  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getInventoryById: async (id: string): Promise<InventoryApiResponse> => {
    const response = await apiClient.get<{ success: boolean; data: InventoryApiResponse }>(
      `/inventories/${id}`,
    );
    return response.data.data;
  },

  // INVENTORY-04 — Delete Item
  // DELETE /api/inventories/:id  |  Role: ADMIN, MANAGER  |  Token: required
  deleteInventory: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(`/inventories/${id}`);
  },

  // INVENTORY-05 — Restore Item
  // PATCH /api/inventories/restore  |  Role: ADMIN, MANAGER  |  Token: required
  restoreInventory: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>("/inventories/restore", { id });
  },

  // INVENTORY-06 — Edit Quantity
  // POST /api/inventories/adjust  |  Role: ADMIN, MANAGER  |  Token: required
  adjustInventory: async (dto: AdjustInventoryDto): Promise<void> => {
    await apiClient.post<{ success: boolean; data: null }>("/inventories/adjust", {
      product_franchise_id: dto.product_franchise_id,
      change: dto.change,
      reason: dto.reason ?? "",
    });
  },

  // INVENTORY-07 — Get Low Stock by Franchise
  // GET /api/inventories/low-stock/franchise/:franchiseId  |  Role: SYSTEM & FRANCHISE  |  Token: required
  getLowStockByFranchise: async (franchiseId: string): Promise<LowStockInventoryItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: LowStockInventoryItem[] }>(
      `/inventories/low-stock/franchise/${franchiseId}`,
    );
    return response.data.data;
  },
};