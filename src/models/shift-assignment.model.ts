// =====================
// ENUM
// =====================
export type StatusType =
    | "ASSIGNED"
    | "COMPLETED"
    | "ABSENT"
    | "CANCELED";

// =====================
// ITEM
// =====================
export interface ShiftAssignment {
    id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    shift_id: string;
    user_id: string;
    user_name: string;
    start_time: string;
    end_time: string;
    note: string;
    work_date: string;
    assigned_by: string;
    status: StatusType;
}

// =====================
// SEARCH RESPONSE
// =====================
export interface ShiftAssignmentApiResponse {
    data: ShiftAssignment[];
    pageInfo: {
        pageNum: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
    success: boolean;
}

// =====================
// CREATE ONE
// =====================
export interface CreateShiftAssignmentDto {
    user_id: string;
    shift_id: string;
    work_date: string;
    note?: string;
}

// =====================
// BULK CREATE
// =====================
export interface BulkShiftAssignmentItem {
    user_id: string;
    shift_id: string;
    work_date: string;
}

export interface BulkShiftAssignmentDto {
    items: BulkShiftAssignmentItem[];
}

// =====================
// GET DETAIL RESPONSE
// =====================
export interface ShiftAssignmentDetailResponse {
    success: boolean;
    data: ShiftAssignment;
}