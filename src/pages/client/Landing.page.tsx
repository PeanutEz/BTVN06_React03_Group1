import { Link } from "react-router-dom";
import { Button } from "../../components";
import { ROUTER_URL } from "../../routes/router.const";
import videoInfo from "../../assets/video-info.mp4";

const LandingPage = () => {
	return (
		<div className="min-h-screen">
			{/* Hero Section - Full Screen */}
			<section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
				{/* Background Image with Overlay */}
				<div 
					className="absolute inset-0 bg-cover bg-center opacity-20"
					style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920')" }}
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
				
				{/* Content */}
				<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 lg:py-0">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
						{/* Left Content */}
						<div className="animate-fade-in text-center lg:text-left">
							{/* Main Heading */}
							<h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-4 lg:mb-6 font-serif tracking-tight">
								Hylux
							</h1>
							<p className="text-xl sm:text-2xl lg:text-3xl text-amber-200 font-medium mb-6 lg:mb-8 tracking-wider uppercase">
								Premium Coffee Experience
							</p>
							<p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 lg:mb-12 leading-relaxed max-w-xl mx-auto lg:mx-0">
								Khám phá hương vị cà phê đặc biệt từ những vùng đất nổi tiếng nhất thế giới.
								Mỗi tách cà phê là một hành trình, mỗi hương thơm là một câu chuyện.
							</p>

							{/* CTA Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 lg:gap-6 mb-8 lg:mb-12 justify-center lg:justify-start">
								<Link to={ROUTER_URL.ORDER} className="w-full sm:w-auto">
									<Button 
										size="lg" 
										className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-bold shadow-2xl shadow-red-900/50 hover:scale-105 transition-all duration-300"
									>
										Đặt Hàng Ngay
									</Button>
								</Link>
								<Link to="#story" className="w-full sm:w-auto">
									<Button 
										size="lg" 
										variant="outline" 
										className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-red-900 px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-bold backdrop-blur-sm transition-all duration-300"
									>
										Khám Phá Thêm
									</Button>
								</Link>
							</div>

							{/* Stats */}
							<div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pt-8 lg:pt-12 border-t border-white/20 max-w-xl mx-auto lg:mx-0">
								<div>
									<p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400">15+</p>
									<p className="text-xs sm:text-sm lg:text-base text-slate-300 mt-1 lg:mt-2">Năm Kinh Nghiệm</p>
								</div>
								<div>
									<p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400">50+</p>
									<p className="text-xs sm:text-sm lg:text-base text-slate-300 mt-1 lg:mt-2">Loại Cà Phê</p>
								</div>
								<div>
									<p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-400">10K+</p>
									<p className="text-xs sm:text-sm lg:text-base text-slate-300 mt-1 lg:mt-2">Khách Hàng</p>
								</div>
							</div>
						</div>

						{/* Right Video */}
						<div className="animate-slide-in-right mt-8 lg:mt-0">
							<div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl shadow-red-900/50 border-2 lg:border-4 border-red-800/30 bg-slate-900">
								{/* Video */}
								<video 
									className="w-full aspect-video object-cover"
									autoPlay 
									muted 
									loop 
									playsInline
									preload="auto"
								>
									<source src={videoInfo} type="video/mp4" />
									Your browser does not support the video tag.
								</video>
								
								{/* Play Overlay */}
								<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
							</div>
						</div>
					</div>
				</div>

				{/* Scroll Indicator */}
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
					<svg className="w-8 h-8 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
					</svg>
				</div>
			</section>

			{/* Story Section */}
			<section id="story" className="py-24 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-2 gap-16 items-center">
						<div className="order-2 md:order-1">
							<h2 className="text-5xl font-bold text-slate-900 mb-6 font-serif">
								Câu Chuyện Của Chúng Tôi
							</h2>
							<div className="space-y-6 text-lg text-slate-700 leading-relaxed">
								<p>
									<strong className="text-red-900">Hylux Coffee</strong> được sinh ra từ niềm đam mê với hạt cà phê nguyên chất 
									và khát khao mang đến những trải nghiệm cà phê đẳng cấp cho người Việt.
								</p>
								<p>
									Chúng tôi tự hào là cầu nối giữa những nông trại cà phê hữu cơ trên khắp thế giới 
									với những tín đồ yêu cà phê tại Việt Nam. Mỗi hạt cà phê được chọn lọc kỹ càng, 
									rang xay theo phương pháp truyền thống kết hợp công nghệ hiện đại.
								</p>
								<p className="text-red-900 font-semibold italic">
									"Không chỉ là cà phê, đó là nghệ thuật trong từng tách"
								</p>
							</div>
							<div className="mt-8">
								<Link to={ROUTER_URL.ABOUT}>
									<Button variant="outline" size="lg" className="border-red-900 text-red-900 hover:bg-red-50">
										Tìm Hiểu Thêm
									</Button>
								</Link>
							</div>
						</div>
						<div className="order-1 md:order-2">
							<div className="relative">
								<img 
									src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800" 
									alt="Coffee Story" 
									className="rounded-3xl shadow-2xl"
								/>
								<div className="absolute -bottom-8 -left-8 w-64 h-64 bg-red-900 rounded-full opacity-10 blur-3xl" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Products Showcase */}
			<section id="products" className="py-24 bg-gradient-to-b from-slate-50 to-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-5xl font-bold text-slate-900 mb-4 font-serif">
							Sản Phẩm Đặc Biệt
						</h2>
						<p className="text-xl text-slate-600">
							Khám phá bộ sưu tập cà phê đặc sản của chúng tôi
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{/* Product Card 1 */}
						<div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
							<div className="aspect-square overflow-hidden">
								<img 
									src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600" 
									alt="Espresso"
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
								/>
							</div>
							<div className="p-6">
								<h3 className="text-2xl font-bold text-slate-900 mb-2">Espresso Premium</h3>
								<p className="text-slate-600 mb-4">Đậm đà, mạnh mẽ từ hạt Arabica nguyên chất</p>
								<div className="flex items-center justify-between">
									<span className="text-2xl font-bold text-red-900">39.000₫</span>
									<Button size="sm" className="bg-red-900 hover:bg-red-800">Đặt Ngay</Button>
								</div>
							</div>
						</div>

						{/* Product Card 2 */}
						<div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
							<div className="aspect-square overflow-hidden">
								<img 
									src="https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600" 
									alt="Cappuccino"
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
								/>
							</div>
							<div className="p-6">
								<h3 className="text-2xl font-bold text-slate-900 mb-2">Cappuccino Đặc Biệt</h3>
								<p className="text-slate-600 mb-4">Kết hợp hoàn hảo cà phê và sữa tươi</p>
								<div className="flex items-center justify-between">
									<span className="text-2xl font-bold text-red-900">45.000₫</span>
									<Button size="sm" className="bg-red-900 hover:bg-red-800">Đặt Ngay</Button>
								</div>
							</div>
						</div>

						{/* Product Card 3 */}
						<div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300">
							<div className="aspect-square overflow-hidden">
								<img 
									src="https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600" 
									alt="Cold Brew"
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
								/>
							</div>
							<div className="p-6">
								<h3 className="text-2xl font-bold text-slate-900 mb-2">Cold Brew</h3>
								<p className="text-slate-600 mb-4">Ủ lạnh 24h, hương vị tinh tế độc đáo</p>
								<div className="flex items-center justify-between">
									<span className="text-2xl font-bold text-red-900">49.000₫</span>
									<Button size="sm" className="bg-red-900 hover:bg-red-800">Đặt Ngay</Button>
								</div>
							</div>
						</div>
					</div>

					<div className="text-center mt-12">
						<Link to={ROUTER_URL.ORDER}>
							<Button size="lg" className="bg-red-900 hover:bg-red-800 text-white px-12">
								Xem Tất Cả Sản Phẩm
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Why Choose Us */}
			<section className="py-24 bg-slate-900 text-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-5xl font-bold mb-4 font-serif">
							Tại Sao Chọn Hylux?
						</h2>
						<p className="text-xl text-slate-300">
							Chúng tôi cam kết mang đến trải nghiệm cà phê tuyệt vời nhất
						</p>
					</div>

					<div className="grid md:grid-cols-4 gap-8">
						<div className="text-center">
							<div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-3">100% Nguyên Chất</h3>
							<p className="text-slate-400">Hạt cà phê organic, không pha trộn</p>
						</div>

						<div className="text-center">
							<div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-3">Giao Hàng Nhanh</h3>
							<p className="text-slate-400">Giao trong 30 phút hoặc miễn phí</p>
						</div>

						<div className="text-center">
							<div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-3">Chất Lượng Đảm Bảo</h3>
							<p className="text-slate-400">Hoàn tiền 100% nếu không hài lòng</p>
						</div>

						<div className="text-center">
							<div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold mb-3">Hỗ Trợ 24/7</h3>
							<p className="text-slate-400">Luôn sẵn sàng phục vụ bạn</p>
						</div>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="py-24 bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-5xl font-bold mb-6 font-serif">
						Sẵn Sàng Trải Nghiệm?
					</h2>
					<p className="text-2xl mb-12 text-red-100">
						Hãy để Hylux Coffee đồng hành cùng bạn trong mỗi khoảnh khắc
					</p>
					<Link to={ROUTER_URL.ORDER}>
						<Button 
							size="lg" 
							className="bg-white text-red-900 hover:bg-amber-50 px-16 py-6 text-2xl font-bold shadow-2xl hover:scale-105 transition-all duration-300"
						>
							Đặt Hàng Ngay
						</Button>
					</Link>
				</div>
			</section>
		</div>
	);
};

export default LandingPage;