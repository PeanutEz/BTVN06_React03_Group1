import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth.store";
import { LOCAL_STORAGE_KEY } from "../const/data.const";

// Base URL: dùng proxy trong dev (same-origin để cookie hoạt động), direct URL khi production
const baseURL = import.meta.env.DEV
    ? "/api"  // Vite proxy → tránh cross-origin cookie bị chặn
    : (import.meta.env.VITE_API_URL || "https://ecommerce-franchise-training-nodejs.vercel.app/") + "api";

const apiClient = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000,
    withCredentials: true, // Gửi/nhận cookie tự động (token nằm trong cookie)
});

// Request Interceptor — log request (token tự gửi qua cookie)
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        console.log(
            "[API REQUEST]",
            config.method?.toUpperCase(),
            config.url,
            config.data ?? ""
        );

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => {
        console.log(
            "[API RESPONSE]",
            response.status,
            response.config.url
        );
        // API trả về { success: true, data: ... }
        // Trả về toàn bộ response để service tự xử lý
        return response;
    },
    (error: AxiosError) => {
        if (error.response) {
            const { status } = error.response;

            switch (status) {
                case 401: {
                    // Token hết hạn — clear session và redirect về login
                    // Không redirect nếu đang ở trang login (tránh vòng lặp)
                    const isLoginPage =
                        window.location.pathname.includes("/login") ||
                        window.location.pathname.includes("/admin/login");
                    if (!isLoginPage) {
                        localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
                        useAuthStore.getState().logout();
                        // Giữ lại URL hiện tại để redirect về sau khi đăng nhập lại
                        const returnTo = window.location.pathname;
                        const isAdminPath = returnTo.startsWith("/admin");
                        window.location.href = isAdminPath
                            ? `/admin/login?returnTo=${encodeURIComponent(returnTo)}`
                            : `/login?returnTo=${encodeURIComponent(returnTo)}`;
                    }
                    break;
                }
                case 403:
                    console.warn("Forbidden: Bạn không có quyền truy cập.");
                    console.log("[403 DETAIL] url:", error.config?.url);
                    console.log("[403 DETAIL] response.data:", error.response.data);
                    break;
                case 429:
                    console.warn("Too many requests: Vui lòng thử lại sau.");
                    break;
                case 500:
                    console.error("Server Error: Lỗi máy chủ, vui lòng thử lại sau.");
                    break;
                default:
                    console.error(`API Error: ${status}`, error.response.data);
            }
        } else if (error.request) {
            console.error("Network Error: Không nhận được phản hồi từ máy chủ.");
        } else {
            console.error("Request Error:", error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;