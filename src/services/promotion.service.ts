import apiClient from "./api.client"
import type {
    Promotion,
    SearchPromotionDto,
    PromotionSearchResponse,
    CreatePromotionDto,
    UpdatePromotionDto
} from "../models/promotion.model"

export const promotionService = {

    // ─────────────────────────────
    // SEARCH PROMOTIONS
    // POST /api/promotions/search
    // ─────────────────────────────
    async searchPromotions(
        body: SearchPromotionDto
    ): Promise<PromotionSearchResponse> {

        const res = await apiClient.post<PromotionSearchResponse>(
            "/promotions/search",
            body
        )

        return res.data
    },

    // ─────────────────────────────
    // CREATE PROMOTION
    // POST /api/promotions
    // ─────────────────────────────
    async createPromotion(data: CreatePromotionDto) {

        const res = await apiClient.post(
            "/promotions",
            data
        )

        return res.data
    },

    // ─────────────────────────────
    // GET PROMOTION DETAIL
    // GET /api/promotions/:id
    // ─────────────────────────────
    async getPromotionById(id: string): Promise<Promotion> {

        const res = await apiClient.get(
            `/promotions/${id}`
        )

        return res.data
    },

    // ─────────────────────────────
    // UPDATE PROMOTION
    // PUT /api/promotions/:id
    // ─────────────────────────────
    async updatePromotion(
        id: string,
        data: UpdatePromotionDto
    ) {

        const res = await apiClient.put(
            `/promotions/${id}`,
            data
        )

        return res.data
    },

    // ─────────────────────────────
    // CHANGE STATUS
    // PATCH /api/promotions/:id/status
    // ─────────────────────────────
    async changeStatus(id: string, is_active: boolean) {

        const res = await apiClient.patch(
            `/promotions/${id}/status`,
            { is_active }
        )

        return res.data
    },

    // ─────────────────────────────
    // DELETE PROMOTION
    // DELETE /api/promotions/:id
    // ─────────────────────────────
    async deletePromotion(id: string) {

        const res = await apiClient.delete(
            `/promotions/${id}`
        )

        return res.data
    },

    // ─────────────────────────────
    // RESTORE PROMOTION
    // POST /api/promotions/:id/restore
    // ─────────────────────────────
    async restorePromotion(id: string) {

        const res = await apiClient.patch(
            `/promotions/${id}/restore`
        )

        return res.data
    }

}