import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Tự động cuộn lên đầu trang mỗi khi điều hướng sang route mới.
 */
export default function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
