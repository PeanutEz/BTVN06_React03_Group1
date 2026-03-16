import apiClient from "./api.client";

// ==================== Types ====================

/** Shift item trả về từ API */
export interface Shift {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	name: string;
	franchise_id: string;
	start_time: string;
	end_time: string;
}

// ==================== SHIFT-01: Create Item ====================
// POST /api/shifts — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { franchise_id, name, start_time, end_time }
// Output: { success, data: Shift }

export interface CreateShiftPayload {
	franchise_id: string;
	name: string;
	start_time: string;
	end_time: string;
}

export async function createShift(payload: CreateShiftPayload): Promise<Shift> {
	const response = await apiClient.post<{ success: boolean; data: Shift }>(
		"/shifts",
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Tạo ca làm việc thất bại");
	}
	return result.data;
}

// ==================== SHIFT-02: Search Items by Conditions ====================
// POST /api/shifts/search — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { searchCondition: { name, franchise_id, start_time, end_time, is_active, is_deleted }, pageInfo: { pageNum, pageSize } }
// Output: { success, data: Shift[], pageInfo }

export interface SearchShiftPayload {
	searchCondition: {
		name?: string;
		franchise_id?: string;
		start_time?: string;
		end_time?: string;
		is_active?: boolean | string;
		is_deleted?: boolean;
	};
	pageInfo: {
		pageNum: number;
		pageSize: number;
	};
}

export interface SearchShiftResponse {
	success: boolean;
	data: Shift[];
	pageInfo: {
		pageNum: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
}

export async function searchShifts(
	payload: SearchShiftPayload,
): Promise<SearchShiftResponse> {
	const response = await apiClient.post<SearchShiftResponse>(
		"/shifts/search",
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Tìm kiếm ca làm việc thất bại");
	}
	return result;
}

// ==================== SHIFT-03: Get Item ====================
// GET /api/shifts/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success, data: Shift }

export async function getShiftById(id: string): Promise<Shift> {
	const response = await apiClient.get<{ success: boolean; data: Shift }>(
		`/shifts/${id}`,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Lấy thông tin ca làm việc thất bại");
	}
	return result.data;
}

// ==================== SHIFT-04: Update Item ====================
// PUT /api/shifts/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Input: { name, start_time, end_time }
// Output: { success, data: Shift }

export interface UpdateShiftPayload {
	name?: string;
	start_time?: string;
	end_time?: string;
}

export async function updateShift(
	id: string,
	payload: UpdateShiftPayload,
): Promise<Shift> {
	const response = await apiClient.put<{ success: boolean; data: Shift }>(
		`/shifts/${id}`,
		payload,
	);
	const result = response.data;
	if (!result.success) {
		throw new Error("Cập nhật ca làm việc thất bại");
	}
	return result.data;
}

// ==================== SHIFT-05: Delete Item ====================
// DELETE /api/shifts/:id — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success, data: null }

export async function deleteShift(id: string): Promise<void> {
	const response = await apiClient.delete<{ success: boolean; data: null }>(
		`/shifts/${id}`,
	);
	if (!response.data.success) {
		throw new Error("Xóa ca làm việc thất bại");
	}
}

// ==================== SHIFT-06: Restore Item ====================
// PATCH /api/shifts/:id/restore — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success, data: null }

export async function restoreShift(id: string): Promise<void> {
	const response = await apiClient.patch<{ success: boolean; data: null }>(
		`/shifts/${id}/restore`,
	);
	if (!response.data.success) {
		throw new Error("Khôi phục ca làm việc thất bại");
	}
}

// ==================== SHIFT-07: Change Status Item ====================
// PATCH /api/shifts/:id/status — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success, data: null }

export async function changeShiftStatus(id: string, is_active: boolean): Promise<void> {
	const response = await apiClient.patch<{ success: boolean; data: null }>(
		`/shifts/${id}/status`,
		{ is_active },
	);
	if (!response.data.success) {
		throw new Error("Đổi trạng thái ca làm việc thất bại");
	}
}

// ==================== SHIFT-08: Get Select Items By Franchise ====================
// GET /api/shifts/select?franchise_id=:franchiseId — Token: YES — Role: SYSTEM & FRANCHISE
// Output: { success, data: ShiftSelectItem[] }

export interface ShiftSelectItem {
	value: string;
	name: string;
	franchise_id: string;
}

export async function getSelectShiftsByFranchise(
	franchiseId: string,
): Promise<ShiftSelectItem[]> {
	const response = await apiClient.get<{ success: boolean; data: ShiftSelectItem[] }>(
		"/shifts/select",
		{ params: { franchise_id: franchiseId } },
	);
	if (!response.data.success) {
		throw new Error("Lấy danh sách ca làm việc thất bại");
	}
	return response.data.data;
}
