import apiClient from "./api.client";
import type {
    ShiftAssignmentApiResponse,
    CreateShiftAssignmentDto,
    BulkShiftAssignmentDto,
    ShiftAssignmentDetailResponse,
    StatusType,
} from "../models/shift-assignment.model";

const API_URL = "/shift-assignments";

export const shiftAssignmentService = {
    // =====================
    // SEARCH (FIX 400 ERROR)
    // =====================
    search: async (page = 1, size = 10) => {
        const res = await apiClient.post<ShiftAssignmentApiResponse>(
            `${API_URL}/search`,
            {
                pageInfo: {
                    pageNum: page,
                    pageSize: size,
                },
                searchCondition: {}, // 👈 bắt buộc (fix lỗi 400)
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