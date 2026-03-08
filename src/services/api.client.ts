import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { MSG_CONSTANT, LOCAL_STORAGE_KEY } from "../const/data.const";

// Cờ để tránh gọi refresh token nhiều lần cùng lúc
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = [];

function processQueue(error: unknown) {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(undefined);
        }
    });
    failedQueue = [];
}

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
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // AUTO REFRESH: khi 401 + message ACCESS_TOKEN_EXPIRED và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            const responseData = error.response.data as { message?: string };
            if (responseData?.message === MSG_CONSTANT.ACCESS_TOKEN_EXPIRED) {
                if (isRefreshing) {
                    // Đang refresh → đưa vào hàng đợi, chờ refresh xong mới retry
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(() => apiClient(originalRequest))
                      .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    await apiClient.get("/auth/refresh-token");
                    processQueue(null);
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError);
                    // Refresh thất bại → xoá user khỏi localStorage và reload về login
                    console.warn("[Auth] Refresh token thất bại, đăng xuất người dùng.");
                    localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
                    window.location.href = "/auth/login";
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }
        }

        if (error.response) {
            const { status } = error.response;

            switch (status) {
                case 401:
                    // Chỉ log warning, KHÔNG redirect hoặc xoá localStorage tự động.
                    // Để từng page/component tự xử lý lỗi 401 (hiển thị trống hoặc thông báo).
                    // Route guards (AdminGuard, AuthGuard) sẽ lo việc redirect khi cần.
                    console.warn("Unauthorized: Token hết hạn hoặc không hợp lệ");
                    break;
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