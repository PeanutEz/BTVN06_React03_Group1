// ─────────────────────────────────────────────
// Promotion Type
// ─────────────────────────────────────────────

export type PromotionType = "PERCENT" | "FIXED"

// ─────────────────────────────────────────────
// Promotion Entity
// ─────────────────────────────────────────────

export interface Promotion {

    id: string

    name: string

    franchise_id: string
    franchise_name?: string

    product_franchise_id?: string
    product_id?: string
    product_name?: string

    type: PromotionType
    value: number

    start_date: string
    end_date: string

    is_active: boolean
    is_deleted: boolean

    created_at: string
    updated_at: string
}

// ─────────────────────────────────────────────
// PROMOTION API
// ─────────────────────────────────────────────

// DTO for PROMOTION-01 — Create Promotion
// POST /api/promotions

export interface CreatePromotionDto {

    name: string

    franchise_id: string

    product_franchise_id?: string

    type: PromotionType

    value: number

    start_date: string

    end_date: string
}

// DTO for PROMOTION-02 — Update Promotion
// PUT /api/promotions/:id

export interface UpdatePromotionDto {

    name: string

    type: PromotionType

    value: number

    start_date: string

    end_date: string
}

// ─────────────────────────────────────────────
// PROMOTION SEARCH
// ─────────────────────────────────────────────

// DTO for PROMOTION-03 — Search Promotions
// POST /api/promotions/search

export interface SearchPromotionDto {

    searchCondition: {

        franchise_id?: string

        product_franchise_id?: string

        type?: PromotionType

        value?: number

        start_date?: string

        end_date?: string

        is_active?: boolean

        is_deleted?: boolean
    }

    pageInfo: {

        pageNum: number
        pageSize: number
    }
}

// ─────────────────────────────────────────────
// SEARCH RESPONSE
// ─────────────────────────────────────────────

export interface PromotionSearchResponse {

    data: Promotion[]

    pageInfo: {

        pageNum: number
        pageSize: number
        totalItems: number
        totalPages: number
    }
}

// ─────────────────────────────────────────────
// SIMPLE RESPONSE
// ─────────────────────────────────────────────

export interface PromotionApiResponse {

    id: string
    is_active: boolean
    is_deleted: boolean

    created_at: string
    updated_at: string

    name: string

    franchise_id: string
    product_franchise_id?: string

    type: PromotionType
    value: number

    start_date: string
    end_date: string
}