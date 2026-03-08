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

/** Role item từ API ROLE-01: GET /api/roles/select */
export interface RoleSelectItem {
	value: string;   // role id
	code: string;    // e.g. "ADMIN", "MANAGER", "STAFF", "SHIPPER", "USER"
	name: string;    // e.g. "Admin", "Manager", "Staff", "Shipper", "User"
	scope: string;   // "GLOBAL" | "FRANCHISE"
}

/** Payload tạo user — USER-01: POST /api/users */
export interface CreateUserPayload {
	email: string;        // required
	password: string;     // required
	name?: string;        // optional, default ""
	phone?: string;       // optional, default ""
	avatar_url?: string;  // optional, default ""
	role_id?: string;     // optional, role id from ROLE-01
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

// ==================== ROLE-01: Get Select Items ====================
// GET /api/roles/select — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: RoleSelectItem[] }
export async function fetchRoles(): Promise<RoleSelectItem[]> {
	const response = await apiClient.get<ApiResponse<RoleSelectItem[]>>("/roles/select");
	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Lấy danh sách role thất bại";
		throw new Error(errorMsg);
	}
	return (result as { data: RoleSelectItem[] }).data;
}

// ==================== USER-01: Create Item ====================
// POST /api/users — Token: YES — Role: ADMIN
// Input: { email, password, name?, phone?, avatar_url?, role_id? }
// Output: { success: true, data: ApiUser }
export async function createUser(data: CreateUserPayload): Promise<ApiUser> {
	let response;
	try {
		response = await apiClient.post<ApiResponse<ApiUser>>("/users", {
			email: data.email,
			password: data.password,
			...(data.name && { name: data.name }),
			...(data.phone && { phone: data.phone }),
			...(data.avatar_url && { avatar_url: data.avatar_url }),
			...(data.role_id && { role_id: data.role_id }),
		});
	} catch (err: unknown) {
		console.log("[createUser] ERROR caught:", err);
		if (err && typeof err === "object" && "response" in err) {
			console.log("[createUser] error.response:", (err as { response: unknown }).response);
			console.log("[createUser] error.response.data:", (err as { response: { data: unknown } }).response.data);
		}
		throw err;
	}
	console.log("[createUser] response:", response);
	console.log("[createUser] response.data:", response.data);
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
	console.log("[searchUsers] REQUEST payload:", JSON.stringify({
		searchCondition: {
			keyword: payload.searchCondition.keyword ?? "",
			is_active: payload.searchCondition.is_active ?? "",
			is_deleted: payload.searchCondition.is_deleted ?? false,
		},
		pageInfo: {
			pageNum: payload.pageInfo.pageNum,
			pageSize: payload.pageInfo.pageSize,
		},
	}, null, 2));

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

	console.log("[searchUsers] RAW response.status:", response.status);
	console.log("[searchUsers] RAW response.headers:", response.headers);
	console.log("[searchUsers] RAW response.data:", response.data);

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
	pageSize = 10,
	is_active: string | boolean = ""
): Promise<SearchUsersResult> {
	return searchUsers({
		searchCondition: { keyword, is_active, is_deleted: false },
		pageInfo: { pageNum, pageSize },
	});
}

// ==================== USER-03: Get Item ====================
// GET /api/users/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: ApiUser }
export async function fetchUserById(id: string): Promise<ApiUser> {
	const response = await apiClient.get<ApiResponse<ApiUser>>(`/users/${id}`);
	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Lấy thông tin user thất bại";
		throw new Error(errorMsg);
	}
	return (result as { data: ApiUser }).data;
}

// ==================== USER-06: Change Status ====================
// PATCH /api/users/status — Token: YES — Role: ADMIN
// Input: { id, is_active: boolean }
// Output: { success: true, data: null }
export async function changeUserStatus(id: string, isActive: boolean): Promise<void> {
	const response = await apiClient.patch<ApiResponse>("/users/status", { id, is_active: isActive });
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Đổi trạng thái user thất bại");
	}
}

// ==================== USER-05: Delete Item ====================
// DELETE /api/users/:id — Token: YES — Role: ADMIN
// Output: { success: true, data: null }
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