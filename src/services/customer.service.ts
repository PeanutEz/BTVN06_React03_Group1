import type { Customer, CustomerFranchise, CustomerDisplay } from "../models/customer.model";
import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";

// ==================== Types ====================

/** Raw customer từ API response */
export interface ApiCustomer {
  id: string;
  phone: string;
  email?: string;
  name: string;
  avatar_url?: string;
  address?: string;
  is_verified?: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  franchises?: CustomerFranchise[];
  [key: string]: unknown;
}

/** Search condition — CUSTOMER-01: POST /api/customers/search */
export interface CustomerSearchCondition {
  keyword?: string;
  is_active?: boolean | string;
  is_deleted?: boolean;
}

export interface CustomerPageInfo {
  pageNum: number;
  pageSize: number;
}

export interface SearchCustomersPayload {
  searchCondition: CustomerSearchCondition;
  pageInfo: CustomerPageInfo;
}

export interface SearchCustomersResponse {
  success: boolean;
  data: ApiCustomer[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  message?: string;
  errors?: unknown[];
}

export interface SearchCustomersResult {
  pageData: CustomerDisplay[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ==================== Helpers ====================

function normalizeCustomer(c: ApiCustomer): CustomerDisplay {
  return {
    id: c.id,
    phone: c.phone,
    email: c.email,
    name: c.name,
    avatar_url: c.avatar_url,
    address: c.address,
    is_verified: c.is_verified,
    is_active: c.is_active,
    is_deleted: c.is_deleted,
    created_at: c.created_at,
    updated_at: c.updated_at,
    franchises: c.franchises ?? [],
  };
}

// ==================== CUSTOMER-01: Search Items by Conditions ====================
// POST /api/customers/search — Token: YES — Role: ADMIN
export async function searchCustomersPaged(
  payload: SearchCustomersPayload,
): Promise<SearchCustomersResult> {
  const response = await apiClient.post<SearchCustomersResponse>("/customers/search", {
    searchCondition: {
      keyword: payload.searchCondition.keyword ?? "",
      is_active: payload.searchCondition.is_active ?? "",
      is_deleted: payload.searchCondition.is_deleted ?? false,
    },
    pageInfo: {
      pageNum: payload.pageInfo.pageNum,
      pageSize: payload.pageInfo.pageSize,
    },
  });

  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Tìm kiếm khách hàng thất bại");
  }

  return {
    pageData: (result.data ?? []).map(normalizeCustomer),
    pageInfo: result.pageInfo ?? {
      pageNum: payload.pageInfo.pageNum,
      pageSize: payload.pageInfo.pageSize,
      totalItems: 0,
      totalPages: 0,
    },
  };
}

export async function fetchCustomers(): Promise<CustomerDisplay[]> {
  const result = await searchCustomersPaged({
    searchCondition: { keyword: "", is_active: "", is_deleted: false },
    pageInfo: { pageNum: 1, pageSize: 100 },
  });
  return result.pageData;
}

export async function searchCustomers(query: string): Promise<CustomerDisplay[]> {
  const result = await searchCustomersPaged({
    searchCondition: { keyword: query, is_active: "", is_deleted: false },
    pageInfo: { pageNum: 1, pageSize: 100 },
  });
  return result.pageData;
}

// ==================== CUSTOMER-01B: Find Customers By Keyword ====================
// GET /api/customers/find?keyword=... — Token: YES — Role: STAFF/ADMIN
// ==================== CUSTOMER-02: Get Item ====================
// GET /api/customers/:id — Token: YES — Role: ADMIN
export async function fetchCustomerById(id: string | number): Promise<CustomerDisplay | null> {
  try {
    const response = await apiClient.get<ApiResponse<ApiCustomer>>(`/customers/${id}`);
    const result = response.data;
    if (!result.success) return null;
    return normalizeCustomer((result as { data: ApiCustomer }).data);
  } catch {
    return null;
  }
}

// ==================== CUSTOMER-03: Create Item ====================
// POST /api/customers — Token: YES — Role: ADMIN
export async function createCustomer(
  data: Omit<Customer, "id" | "created_at" | "updated_at"> & { password?: string },
): Promise<Customer> {
  const response = await apiClient.post<ApiResponse<ApiCustomer>>("/customers", {
    phone: data.phone,
    ...(data.email && { email: data.email }),
    name: data.name,
    password: data.password,
    is_active: data.is_active,
    ...(data.address && { address: data.address }),
    ...(data.avatar_url && { avatar_url: data.avatar_url }),
  });
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Tạo khách hàng thất bại");
  }
  return normalizeCustomer((result as { data: ApiCustomer }).data);
}

// ==================== CUSTOMER-04: Update Item ====================
// PUT /api/customers/:id — Token: YES — Role: ADMIN
export async function updateCustomer(
  id: string | number,
  data: Partial<Customer>,
): Promise<Customer | null> {
  const response = await apiClient.put<ApiResponse<null>>(`/customers/${id}`, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: data.email }),
    ...(data.phone !== undefined && { phone: data.phone }),
    ...(data.is_active !== undefined && { is_active: data.is_active }),
  });
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Cập nhật khách hàng thất bại");
  }
  return fetchCustomerById(id);
}

// ==================== CUSTOMER-05: Delete Item ====================
// DELETE /api/customers/:id — Token: YES — Role: ADMIN
export async function deleteCustomer(id: string | number): Promise<boolean> {
  const response = await apiClient.delete<ApiResponse<null>>(`/customers/${id}`);
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Xóa khách hàng thất bại");
  }
  return true;
}

// ==================== CUSTOMER AUTH: Get Current Profile ====================
// GET /api/customer-auth — Token: YES — Role: CUSTOMER
export async function getCurrentCustomerProfile(): Promise<CustomerDisplay | null> {
  try {
    const response = await apiClient.get<ApiResponse<ApiCustomer>>("/customer-auth");
    const result = response.data;
    if (!result.success) return null;
    return normalizeCustomer((result as { data: ApiCustomer }).data);
  } catch {
    return null;
  }
}

// ==================== CUSTOMER AUTH: Update Current Profile ====================
// Backend-compatible flow:
// 1) GET /api/customer-auth to fetch current profile and id
// 2) PUT /api/customers/:id to update fields
export async function updateCurrentCustomerProfile(data: {
  name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
}): Promise<CustomerDisplay | null> {
  try {
    const profileResponse = await apiClient.get<ApiResponse<ApiCustomer>>("/customer-auth");
    const profileResult = profileResponse.data;
    if (!profileResult.success) {
      throw new Error(profileResult.message || "Không lấy được profile hiện tại");
    }

    const current = (profileResult as { data: ApiCustomer }).data;
    const customerId = String((current as unknown as { _id?: string })._id ?? current.id ?? "").trim();
    if (!customerId) {
      throw new Error("Thiếu customer id để cập nhật profile");
    }

    const mergedPayload = {
      email: String(current.email ?? "").trim(),
      phone: String(data.phone ?? current.phone ?? "").trim(),
      name: String(data.name ?? current.name ?? "").trim(),
      address: String(data.address ?? current.address ?? "").trim(),
      avatar_url: String(data.avatar_url ?? current.avatar_url ?? "").trim(),
    };

    if (!mergedPayload.email || !mergedPayload.phone) {
      throw new Error("Thiếu email hoặc số điện thoại để cập nhật profile");
    }

    const updateResponse = await apiClient.put<ApiResponse<ApiCustomer>>(
      `/customers/${customerId}`,
      mergedPayload,
    );
    const updateResult = updateResponse.data;
    if (!updateResult.success) {
      throw new Error(updateResult.message || "Cập nhật profile thất bại");
    }

    return normalizeCustomer((updateResult as { data: ApiCustomer }).data);
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
}

// ==================== fetchCustomerFranchises ====================
export async function fetchCustomerFranchises(customerId: number): Promise<CustomerFranchise[]> {
  try {
    const response = await apiClient.get<ApiResponse<CustomerFranchise[]>>(
      `/customers/${customerId}/franchises`,
    );
    const result = response.data;
    if (!result.success) return [];
    return (result as { data: CustomerFranchise[] }).data ?? [];
  } catch {
    return [];
  }
}

// ==================== CUSTOMER-06: Update Loyalty ====================
export async function updateCustomerLoyalty(
  customerFranchiseId: number,
  pointChange: number,
): Promise<CustomerFranchise | null> {
  try {
    const response = await apiClient.patch<ApiResponse<CustomerFranchise>>(
      `/customer-franchises/${customerFranchiseId}/loyalty`,
      { point_change: pointChange },
    );
    const result = response.data;
    if (!result.success) return null;
    return (result as { data: CustomerFranchise }).data;
  } catch {
    return null;
  }
}

// ==================== CUSTOMER-07: Restore Item ====================
// PATCH /api/customers/:id/restore — Token: YES — Role: ADMIN
export async function restoreCustomer(id: string | number): Promise<void> {
  const response = await apiClient.patch<ApiResponse<null>>(`/customers/${id}/restore`);
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Khôi phục khách hàng thất bại");
  }
}
// ==================== CUSTOMER-08: Change Status Item ====================
// PATCH /api/customers/:id/status — Token: YES — Role: ADMIN
export async function changeCustomerStatus(
  id: string | number,
  isActive: boolean,
): Promise<void> {
  const response = await apiClient.patch<ApiResponse<null>>(`/customers/${id}/status`, {
    is_active: isActive,
  });
  const result = response.data;
  if (!result.success) {
    throw new Error(result.message || "Thay đổi trạng thái khách hàng thất bại");
  }
}
