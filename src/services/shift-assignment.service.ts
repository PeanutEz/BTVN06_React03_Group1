import apiClient from "./api.client";
import type {
    ShiftAssignmentApiResponse,
    CreateShiftAssignmentDto,
    BulkShiftAssignmentDto,
    ShiftAssignmentDetailResponse,
    StatusType,
} from "../models/shift-assignment.model";

const API_URL = "/shift-assignments";

export interface ShiftAssignmentSearchCondition {
    shift_id?: string;
    user_id?: string;
    work_date?: string;
    assigned_by?: string;
    status?: string;
    is_deleted?: boolean;
}

export const shiftAssignmentService = {
    // =====================
    // SEARCH
    // =====================
    search: async (page = 1, size = 10, condition: ShiftAssignmentSearchCondition = {}) => {
        const res = await apiClient.post<ShiftAssignmentApiResponse>(
            `${API_URL}/search`,
            {
                searchCondition: {
                    shift_id: condition.shift_id || "",
                    user_id: condition.user_id || "",
                    work_date: condition.work_date || "",
                    assigned_by: condition.assigned_by || "",
                    status: condition.status || "",
                    is_deleted: condition.is_deleted ?? false,
                },
                pageInfo: {
                    pageNum: page,
                    pageSize: size,
                },
            }
        );
        return res.data;
    },

    // =====================
    // CREATE ONE
    // =====================
    create: async (data: CreateShiftAssignmentDto) => {
        const res = await apiClient.post(API_URL, data);
        return res.data;
    },

    // =====================
    // BULK CREATE
    // =====================
    bulkCreate: async (data: BulkShiftAssignmentDto) => {
        const res = await apiClient.post(`${API_URL}/bulk`, data);
        return res.data;
    },

    // =====================
    // GET DETAIL
    // =====================
    getById: async (id: string) => {
        const res = await apiClient.get<ShiftAssignmentDetailResponse>(
            `${API_URL}/${id}`
        );
        return res.data.data;
    },

    // =====================
    // CHANGE STATUS
    // =====================
    changeStatus: async (id: string, status: StatusType) => {
        const res = await apiClient.patch(
            `${API_URL}/${id}/status`,
            { status }
        );
        return res.data;
    },
};