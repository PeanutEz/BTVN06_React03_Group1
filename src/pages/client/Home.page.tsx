import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../modules/product/components/ProductCard";
import CategoryCard from "../../modules/product/components/CategoryCard";
import VoucherCard from "../../modules/product/components/VoucherCard";
import { Button } from "../../components";
import { ROUTER_URL } from "../../routes/router.const";
import type { Product, Category, Voucher } from "../../modules/product/types/product.type";

// Mock data (you can replace with API calls)
const mockCategories: Category[] = [
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

const mockProducts: Product[] = [
	{
		id: 1,
		sku: "CF001",
		name: "Cà Phê Sữa Đá",
		description: "Cà phê phin truyền thống với sữa đặc",
		content: "Cà phê được pha từ hạt Robusta Buôn Ma Thuột",
		price: 29000,
		originalPrice: 35000,
		image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400",
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
		content: "Bạc Xỉu - thức uống hoàn hảo cho những ai yêu thích vị cà phê nhẹ",
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
		content: "Americano được pha từ 2 shot espresso",
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
		description: "Espresso với sữa nóng và bọt sữa mịn",
		content: "Cappuccino đậm đà với lớp bọt sữa mịn màng",
		price: 45000,
		image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400",
		categoryId: 1,
		stock: 70,
		isActive: true,
		isFeatured: true,
		rating: 4.9,
		reviewCount: 301,
	},
];

const mockVouchers: Voucher[] = [
	{
		id: 1,
		code: "WELCOME10",
		description: "Giảm giá cho đơn hàng đầu tiên từ 100k",
		discountAmount: 10,
		discountType: "PERCENT",
		minOrderValue: 100000,
		expiryDate: "2026-03-31",
	},
	{
		id: 2,
		code: "FREESHIP",
		description: "Miễn phí vận chuyển cho đơn hàng từ 200k",
		discountAmount: 20000,
		discountType: "FIXED",
		minOrderValue: 200000,
		expiryDate: "2026-02-28",
	},
	{
		id: 3,
		code: "FLASH50",
		description: "Giảm 50k cho đơn hàng từ 300k",
		discountAmount: 50000,
		discountType: "FIXED",
		minOrderValue: 300000,
		expiryDate: "2026-02-15",
	},
];

const HomePage = () => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
	const [vouchers, setVouchers] = useState<Voucher[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Simulate API call
		const loadData = async () => {
			setLoading(true);
			try {
				// Replace with actual API calls
				await new Promise(resolve => setTimeout(resolve, 500));
				setCategories(mockCategories);
				setFeaturedProducts(mockProducts);
				setVouchers(mockVouchers);
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-amber-500 text-white">
				<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200')] bg-cover bg-center opacity-20"></div>
				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
					<div className="max-w-3xl">
						<h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
							Khám Phá Hương Vị
							<span className="block text-amber-200">Đặc Biệt</span>
						</h1>
						<p className="text-lg md:text-xl mb-8 text-white/90 animate-slide-in">
							Thưởng thức những ly cà phê, trà và đồ uống đặc biệt được pha chế từ nguyên liệu cao cấp.
							Mang đến trải nghiệm tuyệt vời cho mỗi khách hàng.
						</p>
						<div className="flex flex-wrap gap-4 animate-slide-in-right">
							<Link to={ROUTER_URL.PRODUCTS}>
								<Button size="lg" className="bg-white text-primary-600 hover:bg-amber-50">
									Đặt Hàng Ngay
								</Button>
							</Link>
							<Link to={ROUTER_URL.CATEGORIES}>
								<Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
									Xem Danh Mục
								</Button>
							</Link>
						</div>
					</div>
				</div>

				{/* Decorative Elements */}
				<div className="absolute bottom-0 left-0 right-0">
					<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="rgb(248 250 252)" />
					</svg>
				</div>
			</section>

			{/* Categories Section */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
						Danh Mục Sản Phẩm
					</h2>
					<p className="text-slate-600 max-w-2xl mx-auto">
						Khám phá các danh mục sản phẩm đa dạng của chúng tôi
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{categories.map((category) => (
						<CategoryCard key={category.id} category={category} />
					))}
				</div>

				<div className="text-center mt-10">
					<Link to={ROUTER_URL.CATEGORIES}>
						<Button variant="outline" size="lg">
							Xem Tất Cả Danh Mục
						</Button>
					</Link>
				</div>
			</section>

			{/* Featured Products Section */}
			<section className="bg-gradient-to-b from-white to-slate-50 py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
							Sản Phẩm Nổi Bật
						</h2>
						<p className="text-slate-600 max-w-2xl mx-auto">
							Những sản phẩm được yêu thích nhất bởi khách hàng
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{featuredProducts.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>

					<div className="text-center mt-10">
						<Link to={ROUTER_URL.PRODUCTS}>
							<Button size="lg" className="bg-primary-600 hover:bg-primary-700">
								Xem Tất Cả Sản Phẩm
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Vouchers Section */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
						Ưu Đãi Đặc Biệt
					</h2>
					<p className="text-slate-600 max-w-2xl mx-auto">
						Sử dụng mã giảm giá để nhận ưu đãi tốt nhất
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{vouchers.map((voucher) => (
						<VoucherCard key={voucher.id} voucher={voucher} />
					))}
				</div>
			</section>

			{/* Features Section */}
			<section className="bg-slate-900 text-white py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-full mb-4">
								<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-2">Chất Lượng Đảm Bảo</h3>
							<p className="text-slate-300">Nguyên liệu cao cấp, quy trình sản xuất chuẩn</p>
						</div>

						<div className="text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-full mb-4">
								<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-2">Giao Hàng Nhanh</h3>
							<p className="text-slate-300">Giao hàng trong 30 phút hoặc miễn phí</p>
						</div>

						<div className="text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-full mb-4">
								<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-2">Hỗ Trợ 24/7</h3>
							<p className="text-slate-300">Đội ngũ hỗ trợ nhiệt tình, chuyên nghiệp</p>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="bg-gradient-to-r from-primary-600 to-amber-500 rounded-3xl overflow-hidden shadow-2xl">
					<div className="px-8 py-16 md:px-12 md:py-20 text-center">
						<h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
							Bắt Đầu Trải Nghiệm Ngay Hôm Nay
						</h2>
						<p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
							Đăng ký ngay để nhận ưu đãi 10% cho đơn hàng đầu tiên và cập nhật những chương trình khuyến mãi mới nhất
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link to={ROUTER_URL.REGISTER}>
								<Button size="lg" className="bg-white text-primary-600 hover:bg-amber-50">
									Đăng Ký Ngay
								</Button>
							</Link>
							<Link to={ROUTER_URL.PRODUCTS}>
								<Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
									Khám Phá Thêm
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default HomePage;
