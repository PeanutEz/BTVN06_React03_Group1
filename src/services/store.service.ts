import type { Store } from "../models/store.model";
import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";
import { AxiosError } from "axios";

// ==================== Types ====================

/** Franchise trả về từ API */
export interface ApiFranchise {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	code: string;
	name: string;
	hotline: string;
	logo_url: string;
	address: string;
	opened_at: string;
	closed_at: string;
}

/** Payload tạo franchise — FRANCHISE-01: POST /api/franchises */
export interface CreateFranchisePayload {
	code: string;       // required
	name: string;       // required
	opened_at: string;   // required, e.g. "10:00"
	closed_at: string;   // required, e.g. "23:30"
	hotline: string;     // required, default ""
	logo_url?: string;   // optional, default ""
	address?: string;    // optional, default ""
}

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

// ==================== FRANCHISE-02: Search Items by Conditions ====================
// POST /api/franchises/search — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { searchCondition: { keyword, opened_at, closed_at, is_active, is_deleted }, pageInfo: { pageNum, pageSize } }
// Output: { success, data: ApiFranchise[], pageInfo: { pageNum, pageSize, totalItems, totalPages } }

export interface SearchFranchisePayload {
	searchCondition: {
		keyword?: string;
		opened_at?: string;
		closed_at?: string;
		is_active?: string | boolean;
		is_deleted?: string | boolean;
	};
	pageInfo: {
		pageNum: number;
		pageSize: number;
	};
}

export interface SearchFranchiseResponse {
	success: boolean;
	data: ApiFranchise[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
}

export async function searchFranchises(payload: SearchFranchisePayload): Promise<SearchFranchiseResponse> {
	const response = await apiClient.post<SearchFranchiseResponse>("/franchises/search", payload);
	const result = response.data;
	if (!result.success) {
		throw new Error("Tìm kiếm franchise thất bại");
	}
	return result;
}

// ==================== FRANCHISE-01: Create Item ====================
// POST /api/franchises — Token: YES — Role: ADMIN
// Input: { code, name, opened_at, closed_at, hotline, logo_url?, address? }
// Output: { success: true, data: ApiFranchise }
export async function createFranchise(data: CreateFranchisePayload): Promise<ApiFranchise> {
	try {
		const response = await apiClient.post<ApiResponse<ApiFranchise>>("/franchises", {
			code: data.code,
			name: data.name,
			opened_at: data.opened_at,
			closed_at: data.closed_at,
			hotline: data.hotline,
			logo_url: data.logo_url ?? "",
			address: data.address ?? "",
		});
		const result = response.data;
		if (!result.success) {
			const errorMsg = result.message || "Tạo franchise thất bại";
			throw new Error(errorMsg);
		}
		return (result as { data: ApiFranchise }).data;
	} catch (error) {
		if (error instanceof AxiosError && error.response?.data?.message) {
			throw new Error(error.response.data.message);
		}
		throw error;
	}
}

// ==================== FRANCHISE-03: Get Item ====================
// GET /api/franchises/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: ApiFranchise }
export async function getFranchiseById(id: string): Promise<ApiFranchise> {
	const response = await apiClient.get<ApiResponse<ApiFranchise>>(`/franchises/${id}`);
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy thông tin franchise thất bại");
	}
	return (result as { data: ApiFranchise }).data;
}

// ==================== FRANCHISE-04: Update Item ====================
// PUT /api/franchises/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { code, name, opened_at, closed_at, hotline, logo_url?, address? }
// Output: { success: true, data: ApiFranchise }
export async function updateFranchise(id: string, data: CreateFranchisePayload): Promise<ApiFranchise> {
	try {
		const response = await apiClient.put<ApiResponse<ApiFranchise>>(`/franchises/${id}`, {
			code: data.code,
			name: data.name,
			opened_at: data.opened_at,
			closed_at: data.closed_at,
			hotline: data.hotline,
			logo_url: data.logo_url ?? "",
			address: data.address ?? "",
		});
		const result = response.data;
		if (!result.success) {
			const errorMsg = result.message || "Cập nhật franchise thất bại";
			throw new Error(errorMsg);
		}
		return (result as { data: ApiFranchise }).data;
	} catch (error) {
		if (error instanceof AxiosError && error.response?.data?.message) {
			throw new Error(error.response.data.message);
		}
		throw error;
	}
}

// ==================== FRANCHISE-05: Delete Item ====================
// DELETE /api/franchises/:id — Token: YES — Role: ADMIN
// Output: { success: true, data: null }
export async function deleteFranchise(id: string): Promise<void> {
	const response = await apiClient.delete<ApiResponse<null>>(`/franchises/${id}`);
	const result = response.data;
	if (!result.success) {
		throw new Error("Xóa franchise thất bại");
	}
}

// ==================== FRANCHISE-06: Restore Item ====================
// PATCH /api/franchises/:id/restore — Token: YES — Role: ADMIN
// Output: { success: true, data: null }
export async function restoreFranchise(id: string): Promise<void> {
	const response = await apiClient.patch<ApiResponse<null>>(`/franchises/${id}/restore`);
	const result = response.data;
	if (!result.success) {
		throw new Error("Khôi phục franchise thất bại");
	}
}

// ==================== FRANCHISE-07: Change Status Item ====================
// PATCH /api/franchises/:id/status — Token: YES — Role: ADMIN
// Input: { is_active: boolean }
// Output: { success: true, data: null }
export async function changeFranchiseStatus(id: string, isActive: boolean): Promise<void> {
	const response = await apiClient.patch<ApiResponse<null>>(`/franchises/${id}/status`, {
		is_active: isActive,
	});
	const result = response.data;
	if (!result.success) {
		throw new Error("Thay đổi trạng thái franchise thất bại");
	}
}

// ==================== FRANCHISE-08: Get Select Items ====================
// GET /api/franchises/select — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: FranchiseSelectItem[] }

export interface FranchiseSelectItem {
	value: string;
	code: string;
	name: string;
}

export async function fetchFranchiseSelect(): Promise<FranchiseSelectItem[]> {
	const response = await apiClient.get<ApiResponse<FranchiseSelectItem[]>>("/franchises/select");
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy danh sách franchise select thất bại");
	}
	return (result as { data: FranchiseSelectItem[] }).data;
}
