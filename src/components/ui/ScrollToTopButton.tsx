import { useState, useEffect } from "react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      className="scroll-to-top-button fixed bottom-28 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-all duration-200 active:scale-95 hover:bg-amber-600 hover:shadow-xl sm:bottom-32 sm:right-6 lg:bottom-6"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
