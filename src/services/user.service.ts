import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";

// ==================== Types ====================

/** User trả về từ API (USER-01, USER-02, etc.) */
export interface ApiUser {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	email: string;
	name: string;
	phone: string;
	avatar_url: string;
	is_verified: boolean;
	role?: string;
	[key: string]: unknown;
}

/** Payload tạo user — USER-01: POST /api/users */
export interface CreateUserPayload {
	email: string;        // required
	password: string;     // required
	name?: string;        // optional, default ""
	phone?: string;       // optional, default ""
	avatar_url?: string;  // optional, default ""
}

/** Điều kiện tìm kiếm — USER-02: POST /api/users/search */
export interface SearchCondition {
	keyword?: string;           // default ""
	is_active?: string | boolean;  // default ""
	is_deleted?: boolean;       // default false
}

/** Thông tin phân trang — USER-02 */
export interface PageInfo {
	pageNum: number;   // default 1
	pageSize: number;  // default 10
}

/** Payload search users — USER-02 */
export interface SearchUsersPayload {
	searchCondition: SearchCondition;
	pageInfo: PageInfo;
}

/** Response data từ search — USER-02
 * Cấu trúc thực tế: { success: true, data: ApiUser[], pageInfo: { pageNum, pageSize, totalItems, totalPages } }
 * Lưu ý: `data` là mảng user, `pageInfo` nằm cùng cấp với `data` (không nested bên trong)
 */
export interface SearchUsersResponse {
	success: boolean;
	data: ApiUser[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
	message?: string;
	errors?: unknown[];
}

/** Kết quả search đã parse — trả về cho UI */
export interface SearchUsersResult {
	pageData: ApiUser[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
}

// ==================== USER-01: Create Item ====================
// POST /api/users — Token: YES — Role: ADMIN
// Input: { email, password, name?, phone?, avatar_url? }
// Output: { success: true, data: ApiUser }
export async function createUser(data: CreateUserPayload): Promise<ApiUser> {
	const response = await apiClient.post<ApiResponse<ApiUser>>("/users", {
		email: data.email,
		password: data.password,
		...(data.name && { name: data.name }),
		...(data.phone && { phone: data.phone }),
		...(data.avatar_url && { avatar_url: data.avatar_url }),
	});
	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Tạo user thất bại";
		throw new Error(errorMsg);
	}
	return (result as { data: ApiUser }).data;
}

// ==================== USER-02: Search Items by Conditions ====================
// POST /api/users/search — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { searchCondition: { keyword?, is_active?, is_deleted? }, pageInfo: { pageNum, pageSize } }
// Output: { success: true, data: ApiUser[], pageInfo: { pageNum, pageSize, totalItems, totalPages } }
export async function searchUsers(payload: SearchUsersPayload): Promise<SearchUsersResult> {
	const response = await apiClient.post<SearchUsersResponse>("/users/search", {
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
		const errorMsg = result.message || "Tìm kiếm user thất bại";
		throw new Error(errorMsg);
	}

	return {
		pageData: result.data ?? [],
		pageInfo: result.pageInfo,
	};
}

// ==================== Fetch Users (dùng USER-02 search) ====================
// Wrapper tiện dụng — gọi searchUsers với điều kiện mặc định
export async function fetchUsers(
	keyword = "",
	pageNum = 1,
	pageSize = 10
): Promise<SearchUsersResult> {
	return searchUsers({
		searchCondition: { keyword, is_active: "", is_deleted: false },
		pageInfo: { pageNum, pageSize },
	});
}

// ==================== Delete User (chưa có API doc, giữ tạm) ====================
export async function deleteUser(id: string): Promise<void> {
	const response = await apiClient.delete<ApiResponse>(`/users/${id}`);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Xóa user thất bại");
	}
}

// ==================== Update User (chưa có API doc, giữ tạm) ====================
export async function updateUserProfile(
	id: string,
	data: Partial<ApiUser>
): Promise<ApiUser> {
	const response = await apiClient.put<ApiResponse<ApiUser>>(`/users/${id}`, data);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Cập nhật user thất bại");
	}
	return (result as { data: ApiUser }).data;
}