import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { LOCAL_STORAGE_KEY } from "../const/data.const";

// Base URL trỏ đến API thật, thêm /api vào cuối
const baseURL = (import.meta.env.VITE_API_URL || "https://ecommerce-franchise-training-nodejs.vercel.app/") + "api";

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
                case 401:
                    console.warn("Unauthorized: Token hết hạn hoặc không hợp lệ");
                    localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
                    if (!window.location.pathname.includes("/login")) {
                        window.location.href = "/login";
                    }
                    break;
                case 403:
                    console.warn("Forbidden: Bạn không có quyền truy cập.");
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