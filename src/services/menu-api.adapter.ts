/**
 * Adapter functions to convert Client API response types to
 * the existing MenuCategory / MenuProduct types used by UI components.
 */
import type { ClientCategoryByFranchiseItem } from "@/models/store.model";
import type { ClientProductListItem } from "@/models/product.model.tsx";
import type { MenuCategory, MenuProduct } from "@/types/menu.types";

// Emoji map for common Vietnamese category names
const CATEGORY_ICON_MAP: Record<string, string> = {
    "cà phê": "☕",
    "cafe": "☕",
    "coffee": "☕",
    "trà": "🍵",
    "tea": "🍵",
    "freeze": "🧊",
    "phindi": "🥛",
    "phin": "🥛",
    "bánh mì": "🥖",
    "bánh ngọt": "🍰",
    "pastry": "🍰",
    "cake": "🍰",
    "trà sữa": "🧋",
    "milk tea": "🧋",
    "nước ép": "🧃",
    "juice": "🧃",
    "sinh tố": "🥤",
    "smoothie": "🥤",
    "topping": "🫧",
};

function getCategoryIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const [keyword, icon] of Object.entries(CATEGORY_ICON_MAP)) {
        if (lower.includes(keyword)) return icon;
    }
    return "🍽️";
}

/**
 * Convert a ClientCategoryByFranchiseItem (from CLIENT-02 API) to a MenuCategory.
 */
export function mapClientCategoryToMenuCategory(
    item: ClientCategoryByFranchiseItem,
): MenuCategory {
    return {
        id: hashStringToNumber(item.category_id),
        slug: slugify(item.category_name),
        name: item.category_name,
        icon: getCategoryIcon(item.category_name),
        description: item.category_name,
        // Keep the original API id for API calls
        _apiCategoryId: item.category_id,
    } as MenuCategory & { _apiCategoryId: string };
}

/**
 * Convert a ClientProductListItem (from CLIENT-04 API) to a MenuProduct.
 * Uses the lowest-price available size as the display price.
 */
export function mapClientProductToMenuProduct(
    item: ClientProductListItem,
    franchiseId: string,
): MenuProduct {
    const availableSizes = item.sizes.filter((s) => s.is_available);
    const cheapest = availableSizes.length > 0
        ? availableSizes.reduce((min, s) => (s.price < min.price ? s : min), availableSizes[0])
        : item.sizes[0];

    return {
        id: hashStringToNumber(item.product_id),
        sku: item.SKU,
        name: item.name,
        description: item.description,
        content: item.description, // API doesn't return full content in list view
        price: cheapest?.price ?? 0,
        image: item.image_url,
        categoryId: hashStringToNumber(item.category_id),
        rating: 4.5 + Math.random() * 0.5, // placeholder since API doesn't provide ratings
        reviewCount: Math.floor(100 + Math.random() * 400),
        isAvailable: availableSizes.length > 0,
        isFeatured: false,
        // Store API-specific data for later use
        _apiProductId: item.product_id,
        _apiFranchiseId: franchiseId,
        _apiCategoryId: item.category_id,
        _apiCategoryName: item.category_name,
        _apiSizes: item.sizes,
    } as MenuProduct & {
        _apiProductId: string;
        _apiFranchiseId: string;
        _apiCategoryId: string;
        _apiCategoryName: string;
        _apiSizes: typeof item.sizes;
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic hash of a UUID string to a positive integer (for use as numeric id) */
export function hashStringToNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

/** Simple slugify for Vietnamese text */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

// Extended types that include API-specific fields
export interface MenuCategoryWithApi extends MenuCategory {
    _apiCategoryId: string;
}

export interface MenuProductWithApi extends MenuProduct {
    _apiProductId: string;
    _apiFranchiseId: string;
    _apiCategoryId: string;
    _apiCategoryName: string;
    _apiSizes: {
        product_franchise_id: string;
        size: string;
        price: number;
        is_available: boolean;
    }[];
}
