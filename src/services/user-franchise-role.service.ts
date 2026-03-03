import apiClient from "./api.client";
import type { ApiResponse } from "./auth.service";

// ==================== Types ====================

/** User-Franchise-Role item trả về từ API */
export interface UserFranchiseRole {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	franchise_id: string;
	franchise_code: string;
	franchise_name: string;
	role_id: string;
	role_code: string;
	role_name: string;
	user_id: string;
	user_name: string;
	user_email: string;
	note: string;
}

// ==================== USER-FRANCHISE-ROLE-01: Create Item ====================
// POST /api/user-franchise-roles — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { user_id, franchise_id, role_id, note? }
// Output: { success: true, data: UserFranchiseRole }

export interface CreateUserFranchiseRolePayload {
	user_id: string;
	franchise_id: string;
	role_id: string;
	note?: string;
}

export async function createUserFranchiseRole(
	payload: CreateUserFranchiseRolePayload,
): Promise<UserFranchiseRole> {
	const response = await apiClient.post<ApiResponse<UserFranchiseRole>>(
		"/user-franchise-roles",
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Tạo user-franchise-role thất bại");
	}
	return (result as { data: UserFranchiseRole }).data;
}

// ==================== USER-FRANCHISE-ROLE-02: Search Items by Conditions ====================
// POST /api/user-franchise-roles/search — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { searchCondition: { keyword?, user_id?, franchise_id?, role_id?, is_deleted? }, pageInfo: { pageNum, pageSize } }
// Output: { success, data: UserFranchiseRole[], pageInfo }

export interface SearchUserFranchiseRolePayload {
	searchCondition: {
		keyword?: string;
		user_id?: string;
		franchise_id?: string;
		role_id?: string;
		is_deleted?: boolean;
	};
	pageInfo: {
		pageNum: number;
		pageSize: number;
	};
}

export interface SearchUserFranchiseRoleResponse {
	success: boolean;
	data?: UserFranchiseRole[];
	pageData?: UserFranchiseRole[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
}

export async function searchUserFranchiseRoles(
	payload: SearchUserFranchiseRolePayload,
): Promise<SearchUserFranchiseRoleResponse & { data: UserFranchiseRole[] }> {
	const response = await apiClient.post<SearchUserFranchiseRoleResponse>(
		"/user-franchise-roles/search",
		{
			...payload,
			searchCondition: {
				keyword: "",
				...payload.searchCondition,
			},
		},
	);
	const result = response.data as unknown as Record<string, unknown>;
	if (!result.success) {
		throw new Error("Tìm kiếm user-franchise-role thất bại");
	}
	// Backend có thể trả về `pageData` hoặc `data`
	const items = (result.pageData ?? result.data ?? []) as UserFranchiseRole[];
	return { ...(result as unknown as SearchUserFranchiseRoleResponse), data: items };
}

// ==================== USER-FRANCHISE-ROLE-03: Get Item ====================
// GET /api/user-franchise-roles/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: UserFranchiseRole }

export async function getUserFranchiseRoleById(id: string): Promise<UserFranchiseRole> {
	const response = await apiClient.get<ApiResponse<UserFranchiseRole>>(
		`/user-franchise-roles/${id}`,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy thông tin user-franchise-role thất bại");
	}
	return (result as { data: UserFranchiseRole }).data;
}

// ==================== USER-FRANCHISE-ROLE-04: Update Item ====================
// PUT /api/user-franchise-roles/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { role_id: string (required), note?: string }
// Output: { success: true, data: UserFranchiseRole }

export interface UpdateUserFranchiseRolePayload {
	role_id: string;
	note?: string;
}

export interface UpdateUserFranchiseRoleResponse {
	success: boolean;
	data: {
		id: string;
		is_active: boolean;
		is_deleted: boolean;
		created_at: string;
		updated_at: string;
		franchise_id: string;
		role_id: string;
		user_id: string;
		note: string;
	};
}

export async function updateUserFranchiseRole(
	id: string,
	payload: UpdateUserFranchiseRolePayload,
): Promise<UpdateUserFranchiseRoleResponse["data"]> {
	const response = await apiClient.put<UpdateUserFranchiseRoleResponse>(
		`/user-franchise-roles/${id}`,
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Cập nhật user-franchise-role thất bại");
	}
	return result.data;
}

// ==================== USER-FRANCHISE-ROLE-05: Delete Item ====================
// DELETE /api/user-franchise-roles/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Soft delete
// Output: { success: true }

export async function deleteUserFranchiseRole(id: string): Promise<void> {
	const response = await apiClient.delete<ApiResponse>(`/user-franchise-roles/${id}`);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Xóa user-franchise-role thất bại");
	}
}

// ==================== USER-FRANCHISE-ROLE-06: Restore Item ====================
// PUT /api/user-franchise-roles/:id/restore — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true }

export async function restoreUserFranchiseRole(id: string): Promise<void> {
	const response = await apiClient.put<ApiResponse>(`/user-franchise-roles/${id}/restore`);
	const result = response.data;
	if (!result.success) {
		throw new Error((result as { message?: string }).message || "Khôi phục user-franchise-role thất bại");
	}
}

// ==================== USER-FRANCHISE-ROLE-07: Get by User ID ====================
// GET /api/user-franchise-roles/user/:userId — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success: true, data: UserFranchiseRole[] }

export async function getUserFranchiseRolesByUserId(userId: string): Promise<UserFranchiseRole[]> {
	const response = await apiClient.get<ApiResponse<UserFranchiseRole[]>>(
		`/user-franchise-roles/user/${userId}`,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy danh sách vai trò của user thất bại");
	}
	return (result as { data: UserFranchiseRole[] }).data;
}
