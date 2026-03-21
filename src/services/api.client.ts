import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { LOCAL_STORAGE_KEY } from "../const/data.const";

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

function normalizeApiBaseUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    // Accept both ".../api" and "..." (then append "/api")
    const withoutTrailingSlash = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    return withoutTrailingSlash.endsWith("/api")
        ? withoutTrailingSlash
        : `${withoutTrailingSlash}/api`;
}

const productionApiBaseUrl = normalizeApiBaseUrl(
    import.meta.env.VITE_API_URL || "https://ecommerce-franchise-training-nodejs.vercel.app/"
);

// Base URL:
// - DEV: prefer direct HTTPS API if VITE_API_URL is set (Secure cookies require https response),
//        otherwise fallback to Vite proxy "/api".
// - PROD: always direct API base.
const devApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || "");
const baseURL = import.meta.env.DEV
    ? (devApiBaseUrl || "/api")
    : productionApiBaseUrl;

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

        if (error.response?.status === 401 && !originalRequest._retry) {
            const url = originalRequest.url ?? "";
            // Avoid infinite loop: do not try refresh when the refresh endpoint itself fails.
            const isRefreshTokenCall =
                url.includes("/auth/refresh-token") || url.includes("/customer-auth/refresh-token");

            if (!isRefreshTokenCall) {
                // Determine if current user is a customer.
                // - Prefer roles from localStorage.
                // - Fallback: infer from requested endpoint.
                const userRaw = localStorage.getItem(LOCAL_STORAGE_KEY.AUTH_USER);
                let isCustomer = false;
                if (userRaw) {
                    try {
                        const parsed = JSON.parse(userRaw);
                        const roles = parsed?.roles ?? [];
                        isCustomer =
                            roles.length === 0 ||
                            roles.some((r: { role?: unknown; scope?: unknown }) =>
                                String(r?.role ?? r?.scope ?? "").toUpperCase().includes("CUSTOMER"),
                            );
                    } catch {
                        isCustomer = true;
                    }
                } else {
                    isCustomer = url.startsWith("/customer-auth") || url.startsWith("/customers");
                }

                // If refresh is already in progress, queue this request.
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then(() => apiClient(originalRequest))
                        .catch((err) => Promise.reject(err));
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const refreshPath = isCustomer ? "/customer-auth/refresh-token" : "/auth/refresh-token";
                    await apiClient.get(refreshPath);
                    processQueue(null);
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError);
                    console.warn("[Auth] Refresh token thất bại, đăng xuất người dùng.");
                    localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
                    // Customer login route in this project is "/login".
                    window.location.href = isCustomer ? "/login" : "/auth/login";
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