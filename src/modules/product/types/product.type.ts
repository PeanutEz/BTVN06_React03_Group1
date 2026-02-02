export interface Category {
    id: number;
    code: string;
    name: string;
    description: string;
    image: string;
    isActive: boolean;
}

export interface Product {
    id: number;
    sku: string;
    name: string;
    description: string;
    content: string;
    price: number;
    originalPrice?: number;
    image: string;
    images?: string[];
    categoryId: number;
    stock: number;
    isActive: boolean;
    isFeatured?: boolean;
    rating?: number;
    reviewCount?: number;
}

export interface Banner {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    link: string;
}

export interface Voucher {
    id: number;
    code: string;
    description: string;
    discountAmount: number; // số tiền giảm hoặc %
    discountType: "PERCENT" | "FIXED";
    minOrderValue?: number;
    expiryDate: string;
}
