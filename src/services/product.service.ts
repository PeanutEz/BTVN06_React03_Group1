import type { Product, Category, Banner, Voucher } from "@/models/product.model";
// @ts-ignore
import apiClient from "./api.client";

// Toggle this to true to use real API
// @ts-ignore
const USE_REAL_API = false;

// Mock Categories
export const categories: Category[] = [
    {
        id: 1,
        code: "coffee",
        name: "Cà Phê",
        description: "Các loại cà phê đặc biệt từ Việt Nam và thế giới",
        image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400",
        isActive: true,
    },
    {
        id: 2,
        code: "tea",
        name: "Trà",
        description: "Trà xanh, trà ô long, trà hoa các loại",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
        isActive: true,
    },
    {
        id: 3,
        code: "smoothie",
        name: "Sinh Tố",
        description: "Sinh tố trái cây tươi ngon, bổ dưỡng",
        image: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400",
        isActive: true,
    },
    {
        id: 4,
        code: "pastry",
        name: "Bánh Ngọt",
        description: "Bánh ngọt, bánh mì, dessert các loại",
        image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400",
        isActive: true,
    },
];

// Mock Products
export const products: Product[] = [
    // Coffee
    {
        id: 1,
        sku: "CF001",
        name: "Cà Phê Sữa Đá",
        description: "Cà phê phin truyền thống với sữa đặc",
        content: "Cà phê được pha từ hạt Robusta Buôn Ma Thuột, kết hợp với sữa đặc Ông Thọ tạo nên hương vị đậm đà, ngọt ngào đặc trưng Việt Nam.",
        price: 29000,
        originalPrice: 35000,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400",
        images: [
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
            "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800",
        ],
        categoryId: 1,
        stock: 100,
        isActive: true,
        isFeatured: true,
        rating: 4.8,
        reviewCount: 234,
    },
    {
        id: 2,
        sku: "CF002",
        name: "Bạc Xỉu",
        description: "Cà phê với nhiều sữa, vị nhẹ nhàng",
        content: "Bạc Xỉu - thức uống hoàn hảo cho những ai yêu thích vị cà phê nhẹ nhàng, ngọt ngào với tỷ lệ sữa đặc nhiều hơn.",
        price: 32000,
        image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400",
        categoryId: 1,
        stock: 80,
        isActive: true,
        isFeatured: true,
        rating: 4.6,
        reviewCount: 189,
    },
    {
        id: 3,
        sku: "CF003",
        name: "Americano",
        description: "Espresso pha loãng với nước nóng",
        content: "Americano được pha từ 2 shot espresso với nước nóng, mang đến hương vị cà phê thuần khiết và đậm đà.",
        price: 39000,
        image: "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=400",
        categoryId: 1,
        stock: 60,
        isActive: true,
        rating: 4.5,
        reviewCount: 156,
    },
    {
        id: 4,
        sku: "CF004",
        name: "Cappuccino",
        description: "Espresso với sữa tươi và foam mịn",
        content: "Cappuccino chuẩn Ý với tỷ lệ hoàn hảo 1/3 espresso, 1/3 sữa nóng và 1/3 foam mịn như nhung.",
        price: 45000,
        image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400",
        categoryId: 1,
        stock: 50,
        isActive: true,
        isFeatured: true,
        rating: 4.7,
        reviewCount: 312,
    },
    {
        id: 5,
        sku: "CF005",
        name: "Latte",
        description: "Espresso với sữa tươi béo ngậy",
        content: "Latte với espresso đậm đà hòa quyện cùng sữa tươi béo ngậy, tạo nên thức uống mượt mà và thơm ngon.",
        price: 49000,
        image: "https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=400",
        categoryId: 1,
        stock: 45,
        isActive: true,
        rating: 4.8,
        reviewCount: 278,
    },
    // Tea
    {
        id: 6,
        sku: "TE001",
        name: "Trà Sen Vàng",
        description: "Trà ướp hương sen thanh mát",
        content: "Trà sen vàng được ướp từ hoa sen Tây Hồ, hương thơm thanh nhã, vị trà ngọt hậu.",
        price: 35000,
        image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400",
        categoryId: 2,
        stock: 70,
        isActive: true,
        isFeatured: true,
        rating: 4.6,
        reviewCount: 145,
    },
    {
        id: 7,
        sku: "TE002",
        name: "Trà Đào Cam Sả",
        description: "Trà đào thơm mát với cam và sả",
        content: "Sự kết hợp hoàn hảo giữa trà đào ngọt ngào, cam tươi thanh mát và sả thơm dịu.",
        price: 45000,
        originalPrice: 55000,
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
        categoryId: 2,
        stock: 60,
        isActive: true,
        isFeatured: true,
        rating: 4.9,
        reviewCount: 423,
    },
    {
        id: 8,
        sku: "TE003",
        name: "Trà Ô Long Sữa",
        description: "Trà ô long đậm đà với sữa tươi",
        content: "Trà ô long rang vừa, hương thơm đặc trưng kết hợp với sữa tươi béo ngậy.",
        price: 42000,
        image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400",
        categoryId: 2,
        stock: 55,
        isActive: true,
        rating: 4.5,
        reviewCount: 198,
    },
    // Smoothie
    {
        id: 9,
        sku: "SM001",
        name: "Sinh Tố Bơ",
        description: "Sinh tố bơ sáp béo ngậy",
        content: "Bơ sáp Đắk Lắk xay nhuyễn với sữa đặc và đá, tạo nên ly sinh tố béo ngậy, bổ dưỡng.",
        price: 45000,
        image: "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=400",
        categoryId: 3,
        stock: 40,
        isActive: true,
        isFeatured: true,
        rating: 4.7,
        reviewCount: 267,
    },
    {
        id: 10,
        sku: "SM002",
        name: "Sinh Tố Xoài",
        description: "Sinh tố xoài chín ngọt lịm",
        content: "Xoài cát Hòa Lộc chín mọng, xay nhuyễn với sữa và đá, ngọt tự nhiên không cần thêm đường.",
        price: 42000,
        image: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400",
        categoryId: 3,
        stock: 35,
        isActive: true,
        rating: 4.6,
        reviewCount: 189,
    },
    {
        id: 11,
        sku: "SM003",
        name: "Sinh Tố Dâu",
        description: "Sinh tố dâu tây tươi mát",
        content: "Dâu tây Đà Lạt tươi ngon, xay cùng sữa chua và mật ong, vị chua ngọt hài hòa.",
        price: 48000,
        image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400",
        categoryId: 3,
        stock: 30,
        isActive: true,
        rating: 4.8,
        reviewCount: 234,
    },
    // Pastry
    {
        id: 12,
        sku: "PA001",
        name: "Bánh Croissant",
        description: "Bánh sừng bò bơ Pháp",
        content: "Croissant nướng giòn với 27 lớp bơ Anchor, thơm lừng và tan trong miệng.",
        price: 35000,
        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
        categoryId: 4,
        stock: 25,
        isActive: true,
        isFeatured: true,
        rating: 4.9,
        reviewCount: 345,
    },
    {
        id: 13,
        sku: "PA002",
        name: "Bánh Tiramisu",
        description: "Tiramisu Ý nguyên bản",
        content: "Tiramisu làm từ mascarpone Ý, cà phê espresso và rượu Marsala, hương vị đậm đà.",
        price: 55000,
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
        categoryId: 4,
        stock: 20,
        isActive: true,
        rating: 4.8,
        reviewCount: 287,
    },
    {
        id: 14,
        sku: "PA003",
        name: "Bánh Cheesecake",
        description: "Cheesecake mềm mịn kiểu Nhật",
        content: "Japanese cheesecake mềm như bông, tan ngay khi chạm lưỡi với vị phô mai thanh nhẹ.",
        price: 52000,
        image: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=400",
        categoryId: 4,
        stock: 15,
        isActive: true,
        rating: 4.7,
        reviewCount: 198,
    },
];

// Mock Banners
export const banners: Banner[] = [
    {
        id: 1,
        title: "Khuyến Mãi Mùa Hè",
        subtitle: "Giảm 20% tất cả đồ uống đá",
        image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200",
        link: "/products?sale=true",
    },
    {
        id: 2,
        title: "Thành Viên Mới",
        subtitle: "Đăng ký ngay - Tặng 50.000đ",
        image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200",
        link: "/register",
    },
    {
        id: 3,
        title: "Cà Phê Việt Nam",
        subtitle: "Hương vị đậm đà từ Tây Nguyên",
        image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200",
        link: "/products?category=coffee",
    },
];

// Mock Vouchers
export const vouchers: Voucher[] = [
    {
        id: 1,
        code: "WELCOME",
        description: "Giảm 50K cho đơn hàng đầu tiên",
        discountAmount: 50000,
        discountType: "FIXED",
        minOrderValue: 100000,
        expiryDate: "2025-12-31",
    },
    {
        id: 2,
        code: "SUMMER10",
        description: "Giảm 10% tối đa 30K",
        discountAmount: 10,
        discountType: "PERCENT",
        minOrderValue: 0,
        expiryDate: "2025-08-31",
    },
    {
        id: 3,
        code: "FREESHIP",
        description: "Miễn phí vận chuyển đơn từ 150K",
        discountAmount: 15000,
        discountType: "FIXED",
        minOrderValue: 150000,
        expiryDate: "2025-12-31",
    },
];

// Simulated API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Product Service - Mock API calls
export const productService = {
    getCategories: async (): Promise<Category[]> => {
        if (USE_REAL_API) {
            // return await apiClient.get('/categories');
            return []; // Placeholder
        }
        await delay(300);
        return categories.filter((c) => c.isActive);
    },

    getCategoryById: async (id: number): Promise<Category | undefined> => {
        if (USE_REAL_API) {
            // return await apiClient.get(`/categories/${id}`);
            return undefined;
        }
        await delay(200);
        return categories.find((c) => c.id === id && c.isActive);
    },

    getCategoryByCode: async (code: string): Promise<Category | undefined> => {
        if (USE_REAL_API) {
            // return await apiClient.get(`/categories/code/${code}`);
            return undefined;
        }
        await delay(200);
        return categories.find((c) => c.code === code && c.isActive);
    },

    getProducts: async (categoryId?: number): Promise<Product[]> => {
        if (USE_REAL_API) {
            // const url = categoryId ? `/products?categoryId=${categoryId}` : '/products';
            // return await apiClient.get(url);
            return [];
        }
        await delay(400);
        let result = products.filter((p) => p.isActive);
        if (categoryId) {
            result = result.filter((p) => p.categoryId === categoryId);
        }
        return result;
    },

    getProductById: async (id: number): Promise<Product | undefined> => {
        if (USE_REAL_API) {
            // return await apiClient.get(`/products/${id}`);
            return undefined;
        }
        await delay(300);
        return products.find((p) => p.id === id && p.isActive);
    },

    getFeaturedProducts: async (): Promise<Product[]> => {
        if (USE_REAL_API) {
            // return await apiClient.get('/products/featured');
            return [];
        }
        await delay(300);
        return products.filter((p) => p.isActive && p.isFeatured);
    },

    searchProducts: async (query: string): Promise<Product[]> => {
        if (USE_REAL_API) {
            // return await apiClient.get(`/products/search?q=${query}`);
            return [];
        }
        await delay(400);
        const lowerQuery = query.toLowerCase();
        return products.filter(
            (p) =>
                p.isActive &&
                (p.name.toLowerCase().includes(lowerQuery) ||
                    p.description.toLowerCase().includes(lowerQuery))
        );
    },

    getBanners: async (): Promise<Banner[]> => {
        if (USE_REAL_API) {
            // return await apiClient.get('/banners');
            return [];
        }
        await delay(200);
        return banners;
    },

    getVouchers: async (): Promise<Voucher[]> => {
        if (USE_REAL_API) {
            // return await apiClient.get('/vouchers');
            return [];
        }
        await delay(300);
        return vouchers;
    },
};
