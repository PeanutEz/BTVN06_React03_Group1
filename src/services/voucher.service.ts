import apiClient from "@/services/api.client";
import type {
  CreateVoucherDto,
  UpdateVoucherDto,
  SearchVoucherDto,
  VoucherSearchResponse,
  VoucherApiResponse,
  VoucherListResponse
} from "@/models/voucher.model";

export const voucherService = {
  // VOUCHER-01 Create Item: POST /api/vouchers
  createVoucher: async (data: CreateVoucherDto): Promise<VoucherApiResponse> => {
    const response = await apiClient.post<{ success: boolean; data: VoucherApiResponse }>("/vouchers", data);
    return response.data.data;
  },

  // VOUCHER-02 Search Items by Conditions: POST /api/vouchers/search
  searchVouchers: async (params: {
    page: number;
    limit: number;
    code?: string;
    franchise_id?: string;
    type?: "PERCENT" | "FIXED" | "";
    is_active?: boolean | "";
    is_deleted?: boolean;
    start_date?: string;
    end_date?: string;
  }): Promise<VoucherListResponse> => {
    const payload: SearchVoucherDto = {
      searchCondition: {
        code: params.code ?? "",
        franchise_id: params.franchise_id || undefined,
        type: params.type ?? "",
        is_active: params.is_active !== undefined ? params.is_active : "",
        is_deleted: params.is_deleted ?? false,
        start_date: params.start_date ?? "",
        end_date: params.end_date ?? ""
      },
      pageInfo: {
        pageNum: params.page,
        pageSize: params.limit
      }
    };

    const response = await apiClient.post<{ success: boolean; data: VoucherApiResponse[]; pageInfo: VoucherSearchResponse["pageInfo"] }>("/vouchers/search", payload);
    return {
      data: response.data.data || [],
      total: response.data.pageInfo?.totalItems ?? 0,
      page: response.data.pageInfo?.pageNum ?? 1,
      limit: response.data.pageInfo?.pageSize ?? 10
    };
  },

  // VOUCHER-03 Get Item: GET /api/vouchers/:id
  getVoucherById: async (id: string): Promise<VoucherApiResponse> => {
    const response = await apiClient.get<{ success: boolean; data: VoucherApiResponse }>(`/vouchers/${id}`);
    return response.data.data;
  },

  // VOUCHER-04 Update Item: PUT /api/vouchers/:id
  updateVoucher: async (id: string, data: UpdateVoucherDto): Promise<VoucherApiResponse> => {
    const response = await apiClient.put<{ success: boolean; data: VoucherApiResponse }>(`/vouchers/${id}`, data);
    return response.data.data;
  },

  // VOUCHER-05 Delete Item: DELETE /api/vouchers/:id
  deleteVoucher: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; data: null }>(`/vouchers/${id}`);
  },

  // VOUCHER-06 Restore Item: PATCH /api/vouchers/:id/restore
  restoreVoucher: async (id: string): Promise<void> => {
    await apiClient.patch<{ success: boolean; data: null }>(`/vouchers/${id}/restore`);
  },

  // Toggle Active Status
  toggleVoucherStatus: async (id: string, currentStatus: boolean): Promise<{ isActive: boolean }> => {
    const newStatus = !currentStatus;
    
    // Sử dụng RESTful chuẩn: PATCH /api/vouchers/:id/status
    await apiClient.patch<{ success: boolean; data: null }>(`/vouchers/${id}/status`, {
      is_active: newStatus
    });
    
    return { isActive: newStatus };
  }
};
