    import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTER_URL } from "../../routes/router.const";
import { Button } from "../../components";
import logoHylux from "../../assets/logo-hylux.png";

const LandingHeader = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            // Tính toán offset để tránh bị che bởi sticky header
            const headerHeight = 120; // Chiều cao header + padding
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setMenuOpen(false);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-red-900 via-red-800 to-red-900 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
            
            {/* Left Menu */}
            <nav className="hidden lg:flex items-center gap-8 flex-1">
                <button 
                onClick={() => scrollToSection('story')}
                className="text-white hover:text-amber-200 font-bold text-sm uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-red-900 rounded px-2 py-1"
                aria-label="Về Hylux Coffee"
                >
                Về Hylux
                </button>
                <button 
                onClick={() => scrollToSection('products')}
                className="text-white hover:text-amber-200 font-bold text-sm uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-red-900 rounded px-2 py-1"
                aria-label="Xem thực đơn"
                >
                Thực Đơn
                </button>
                <Link 
                to={ROUTER_URL.STORE_LOCATOR}
                className="text-white hover:text-amber-200 font-bold text-sm uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-red-900 rounded px-2 py-1"
                >
                Cửa Hàng
                </Link>
                <Link 
                to={ROUTER_URL.CONTACT}
                className="text-white hover:text-amber-200 font-bold text-sm uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-red-900 rounded px-2 py-1"
                >
                Liên Hệ
                </Link>
            </nav>

            {/* Center Logo */}
            <Link to={ROUTER_URL.HOME} className="flex items-center group" aria-label="Hylux Coffee - Trang chủ">
                <img 
                src={logoHylux}
                alt="Hylux Coffee" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain transition-transform duration-300 group-hover:scale-110"
                />
            </Link>

            {/* Right Menu */}
            <div className="hidden lg:flex items-center gap-6 flex-1 justify-end">
                <Link to={ROUTER_URL.ORDER}>
                <Button 
                    className="bg-white text-red-900 hover:bg-amber-100 font-extrabold uppercase text-sm px-6 py-2.5 shadow-lg"
                >
                    Giao Hàng
                </Button>
                </Link>
                
                <Link 
                to={ROUTER_URL.STORE_LOCATOR}
                className="text-white hover:text-amber-200 font-bold text-sm uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-red-900 rounded px-2 py-1"
                >
                Tìm Kiếm Cửa Hàng
                </Link>

                {/* Language Switcher */}
                <div className="flex items-center gap-2">
                <button className="hover:opacity-80 transition-opacity">
                    <img 
                    src="https://flagcdn.com/w20/vn.png" 
                    alt="Vietnamese" 
                    className="w-6 h-4 object-cover rounded"
                    />
                </button>
                <span className="text-white text-xs">/</span>
                <button className="hover:opacity-80 transition-opacity">
                    <img 
                    src="https://flagcdn.com/w20/gb.png" 
                    alt="English" 
                    className="w-6 h-4 object-cover rounded"
                    />
                </button>
                </div>
            </div>

            {/* Mobile Menu Button */}
            <button
                className="lg:hidden text-white p-2"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
                </svg>
            </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
            <div className="lg:hidden pb-4 space-y-2">
                <button 
                onClick={() => scrollToSection('story')}
                className="block w-full text-left px-4 py-2 text-white hover:bg-red-800 rounded transition-colors"
                >
                Về Hylux
                </button>
                <button 
                onClick={() => scrollToSection('products')}
                className="block w-full text-left px-4 py-2 text-white hover:bg-red-800 rounded transition-colors"
                >
                Thực Đơn
                </button>
                <Link 
                to={ROUTER_URL.STORE_LOCATOR}
                className="block px-4 py-2 text-white hover:bg-red-800 rounded transition-colors"
                onClick={() => setMenuOpen(false)}
                >
                Cửa Hàng
                </Link>
                <Link 
                to={ROUTER_URL.CONTACT}
                className="block px-4 py-2 text-white hover:bg-red-800 rounded transition-colors"
                onClick={() => setMenuOpen(false)}
                >
                Tin Tức
                </Link>
                <Link 
                to={ROUTER_URL.ORDER}
                className="block px-4 py-2"
                onClick={() => setMenuOpen(false)}
                >
                <Button className="w-full bg-white text-red-900 hover:bg-amber-100">
                    Giao Hàng
                </Button>
                </Link>
            </div>
            )}
        </div>
        </header>
    );
    };

    export default LandingHeader;