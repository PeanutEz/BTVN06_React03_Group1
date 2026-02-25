import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "@/store/product.store";
import ProductCard from "@/components/product/ProductCard";
import CategoryCard from "@/components/product/CategoryCard";
import VoucherCard from "@/components/product/VoucherCard";
import { ProductGrid, SectionHeader } from "@/components/ui";

export default function ClientHome() {
    const {
        banners,
        featuredProducts,
        categories,
        vouchers,
        isLoading,
        fetchBanners,
        fetchFeaturedProducts,
        fetchCategories,
        fetchVouchers
    } = useProductStore();

    useEffect(() => {
        fetchBanners();
        fetchFeaturedProducts();
        fetchCategories();
        fetchVouchers();
    }, [fetchBanners, fetchFeaturedProducts, fetchCategories, fetchVouchers]);

    return (
        <div className="space-y-16">
            {/* Hero Banner — breaks out of the page container to go full-bleed */}
            <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 sm:-mt-10 lg:-mt-12">
                {banners.length > 0 && (
                    <div className="relative h-[500px] overflow-hidden">
                        <img
                            src={banners[0].image}
                            alt={banners[0].title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                        <div className="absolute inset-0 flex items-center">
                            <div className="container mx-auto px-4">
                                <div className="max-w-xl">
                                    <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
                                        {banners[0].title}
                                    </h1>
                                    <p className="text-xl text-gray-200 mb-8">{banners[0].subtitle}</p>
                                    <Link
                                        to={banners[0].link}
                                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        Khám phá ngay
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Categories Section */}
            <section>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Danh Mục</h2>
                        <p className="text-gray-600 mt-1">Khám phá theo sở thích của bạn</p>
                    </div>
                    <Link
                        to="/categories"
                        className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                    >
                        Xem tất cả
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="aspect-[4/3] bg-gray-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {categories.map((category) => (
                            <CategoryCard key={category.id} category={category} />
                        ))}
                    </div>
                )}
            </section>

            {/* Featured Products Section */}
            <section>
                <SectionHeader
                    title="Sản Phẩm Nổi Bật"
                    subtitle="Những món được yêu thích nhất"
                    action={
                        <Link
                            to="/menu"
                            className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 text-sm"
                        >
                            Xem tất cả
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    }
                />

                {isLoading ? (
                    <ProductGrid>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
                        ))}
                    </ProductGrid>
                ) : (
                    <ProductGrid>
                        {featuredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </ProductGrid>
                )}
            </section>

            {/* Promo Banners */}
            {banners.length > 1 && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {banners.slice(1, 3).map((banner) => (
                        <Link
                            key={banner.id}
                            to={banner.link}
                            className="group relative overflow-hidden rounded-2xl h-64 shadow-lg"
                        >
                            <img
                                src={banner.image}
                                alt={banner.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h3 className="text-2xl font-bold text-white mb-1">{banner.title}</h3>
                                <p className="text-gray-200">{banner.subtitle}</p>
                            </div>
                        </Link>
                    ))}
                </section>
            )}

            {/* Vouchers Section */}
            <section>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Ưu Đãi Đặc Biệt</h2>
                        <p className="text-gray-600 mt-1">Dành tặng riêng cho bạn</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vouchers.map((voucher) => (
                            <VoucherCard key={voucher.id} voucher={voucher} />
                        ))}
                    </div>
                )}
            </section>

            {/* Why Choose Us */}
            <section className="bg-white rounded-3xl p-8 shadow-lg">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Tại Sao Chọn Chúng Tôi?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Chất Lượng Cao</h3>
                        <p className="text-gray-600">Nguyên liệu được chọn lọc kỹ càng từ những nguồn cung cấp uy tín nhất</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Giao Hàng Nhanh</h3>
                        <p className="text-gray-600">Đảm bảo giao hàng trong 30 phút để bạn thưởng thức đồ uống tươi ngon nhất</p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Giá Cả Hợp Lý</h3>
                        <p className="text-gray-600">Cam kết giá tốt nhất cùng nhiều chương trình ưu đãi hấp dẫn</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
