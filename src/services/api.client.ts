import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

// Get API URL from environment variables or default to localhost
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const apiClient = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Get token from localStorage
        // Assuming auth store saves to "auth-storage" key
        const authStorage = localStorage.getItem("auth-storage");
        if (authStorage) {
            try {
                const parsed = JSON.parse(authStorage);
                const token = parsed.state?.token;

                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                // Ignore JSON parse error
            }
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => {
        // Return data directly if needed, or full response
        return response.data;
    },
    (error: AxiosError) => {
        // Global Error Handling
        if (error.response) {
            const { status } = error.response;

            switch (status) {
                case 401:
                    // Unauthorized - Clear token and redirect to login
                    // Note: Using window.location for hard redirect or event bus is preferred
                    // as we can't use useNavigate outside React components easily
                    console.warn("Unauthorized: Logging out...");
                    // localStorage.removeItem("auth-storage");
                    // window.location.href = "/login";
                    break;
                case 403:
                    console.warn("Forbidden: You don't have permission to access this resource.");
                    break;
                case 500:
                    console.error("Server Error: Please try again later.");
                    break;
                default:
                    console.error(`API Error: ${status}`, error.response.data);
            }
        } else if (error.request) {
            console.error("Network Error: No response received.");
        } else {
            console.error("Request Error:", error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;