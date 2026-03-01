import apiClient from "./api.client";
import { LOCAL_STORAGE_KEY } from "../const/data.const";
import { AxiosError } from "axios";

// ==================== Types ====================

/** API Response khi thành công */
export interface ApiSuccessResponse<T = unknown> {
	success: true;
	data: T;
}

/** API Response khi lỗi đơn */
export interface ApiErrorSingleResponse {
	success: false;
	message: string;
	errors: unknown[];
}

/** API Response khi lỗi nhiều */
export interface ApiErrorMultiResponse {
	success: false;
	message: string | null;
	errors: Array<{ message: string; field: string }>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorSingleResponse | ApiErrorMultiResponse;

/** Data trả về khi login — API trả { success: true, data: null }, token nằm trong cookie */
export interface LoginResponseData {
	[key: string]: unknown;
}

/** Data trả về khi get profile */
export interface UserProfile {
	id: string | number;
	name: string;
	email: string;
	role: string;
	avatar?: string;
	[key: string]: unknown;
}

// ==================== AUTH-01: Login ====================
// POST /api/auth — Token: NO — Role: ADMIN PUBLIC
// Input: { email: string, password: string }
// Output: { success: true, data: null } — Token được set qua cookie bởi server
export async function loginUser(credentials: { email: string; password: string }): Promise<void> {
	try {
		const response = await apiClient.post<ApiResponse<null>>("/auth", {
			email: credentials.email,
			password: credentials.password,
		});

		const result = response.data;

		if (!result.success) {
			const errorMsg = result.message || (result.errors?.[0] as { message?: string })?.message || "Đăng nhập thất bại";
			throw new Error(errorMsg);
		}
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			const errorData = error.response.data as ApiErrorSingleResponse | ApiErrorMultiResponse;
			const errorMsg = errorData.message
				|| (errorData.errors?.[0] as { message?: string })?.message
				|| "Đăng nhập thất bại";
			throw new Error(errorMsg);
		}
		throw error;
	}
	// Login thành công — token đã được server set vào cookie tự động
	// withCredentials: true trong apiClient sẽ tự gửi cookie ở các request tiếp theo
}

// ==================== CUSTOMER-AUTH-01: Customer Login ====================
// POST /api/customer-auth — Token: NO — Role: CUSTOMER PUBLIC
// Input: { email: string, password: string }
// Output: { success: true, data: null } — Token được set qua cookie bởi server
export async function loginCustomer(credentials: { email: string; password: string }): Promise<void> {
	try {
		const response = await apiClient.post<ApiResponse<null>>("/customer-auth", {
			email: credentials.email,
			password: credentials.password,
		});

		const result = response.data;

		if (!result.success) {
			const errorMsg = result.message || (result.errors?.[0] as { message?: string })?.message || "Đăng nhập thất bại";
			throw new Error(errorMsg);
		}
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			const errorData = error.response.data as ApiErrorSingleResponse | ApiErrorMultiResponse;
			const errorMsg = errorData.message
				|| (errorData.errors?.[0] as { message?: string })?.message
				|| "Đăng nhập thất bại";
			throw new Error(errorMsg);
		}
		throw error;
	}

	// Login thành công — token đã được server set vào cookie tự động
}

// ==================== AUTH-02: Switch Context ====================
// POST /api/auth/switch-context — Token: YES — Role: SYSTEM & FRANCHISE
export async function switchContext(contextData: Record<string, unknown>): Promise<unknown> {
	const response = await apiClient.post<ApiResponse>("/auth/switch-context", contextData);

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Chuyển context thất bại";
		throw new Error(errorMsg);
	}

	return result.data;
}

// ==================== AUTH-03: Get Profile ====================
// GET /api/auth — Token: YES (implied, vì cần biết user nào) — Role: SYSTEM & FRANCHISE
export async function getProfile(): Promise<UserProfile> {
	const response = await apiClient.get<ApiResponse<UserProfile>>("/auth");

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Lấy thông tin profile thất bại";
		throw new Error(errorMsg);
	}

	return result.data;
}

// ==================== AUTH-04: Refresh Token ====================
// GET /api/auth/refresh-token — Token: NO — Role: SYSTEM & FRANCHISE
// Token mới cũng được server set qua cookie
export async function refreshToken(): Promise<void> {
	const response = await apiClient.get<ApiResponse<null>>("/auth/refresh-token");

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Làm mới token thất bại";
		throw new Error(errorMsg);
	}

	// Token mới đã được server set vào cookie tự động
}

// ==================== AUTH-05: Forgot Password ====================
// PUT /api/auth/forgot-password — Token: NO — Role: ADMIN PUBLIC
export async function forgotPassword(email: string): Promise<unknown> {
	const response = await apiClient.put<ApiResponse>("/auth/forgot-password", { email });

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Yêu cầu đặt lại mật khẩu thất bại";
		throw new Error(errorMsg);
	}

	return result.data;
}

// ==================== AUTH-06: Change Password ====================
// PUT /api/auth/change-password — Token: NO — Role: ADMIN PUBLIC
// Input: { old_password: string, new_password: string }
// Output: { success: true, data: null }
export async function changePassword(data: {
	old_password: string;
	new_password: string;
}): Promise<void> {
	const response = await apiClient.put<ApiResponse<null>>("/auth/change-password", {
		old_password: data.old_password,
		new_password: data.new_password,
	});

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Đổi mật khẩu thất bại";
		throw new Error(errorMsg);
	}
}

// ==================== AUTH-07: Logout ====================
// POST /api/auth/log-out — Token: YES — Role: SYSTEM & FRANCHISE
// Server sẽ xóa cookie token
export async function logoutUser(): Promise<void> {
	try {
		await apiClient.post<ApiResponse>("/auth/log-out");
	} catch {
		// Nếu API logout lỗi vẫn xóa local data
		console.warn("Logout API failed, clearing local data anyway");
	}

	// Xóa profile khỏi localStorage
	localStorage.removeItem(LOCAL_STORAGE_KEY.AUTH_USER);
}

// ==================== AUTH-08: Verify Token ====================
// POST /api/auth/verify-token — Token: NO — Role: ADMIN PUBLIC
// Input: { token: string } — Link domain kèm token được gửi qua email
// Output: { success: true, data: null }
export async function verifyToken(token: string): Promise<void> {
	const response = await apiClient.post<ApiResponse<null>>("/auth/verify-token", { token });

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Token không hợp lệ";
		throw new Error(errorMsg);
	}
}

// ==================== AUTH-09: Resend Token ====================
// POST /api/auth/resend-token — Token: NO — Role: ADMIN PUBLIC
// Input: { email: string } — Link domain kèm token sẽ được gửi qua email
// Output: { success: true, data: null }
export async function resendToken(email: string): Promise<void> {
	const response = await apiClient.post<ApiResponse<null>>("/auth/resend-token", { email });

	const result = response.data;
	if (!result.success) {
		const errorMsg = result.message || "Gửi lại token thất bại";
		throw new Error(errorMsg);
	}
}

// ==================== Helper: Login + Get Profile ====================
// Kết hợp login rồi lấy profile luôn để có thông tin user đầy đủ
// Flow: Login (cookie được set) → Get Profile (dùng cookie) → Lưu profile local
export async function loginAndGetProfile(credentials: { email: string; password: string }): Promise<UserProfile> {
	// Step 1: Login — server set token vào cookie
	await loginUser(credentials);

	// Step 2: Gọi GET /api/auth để lấy profile (cookie tự gửi kèm)
	const profile = await getProfile();

	// Lưu profile vào localStorage để hydrate store
	localStorage.setItem(LOCAL_STORAGE_KEY.AUTH_USER, JSON.stringify(profile));
	return profile;
}

// ==================== Helper: Customer Login + Get Profile ====================
// Flow: Customer Login (cookie) → Get Profile → Lưu profile local
export async function customerLoginAndGetProfile(credentials: { email: string; password: string }): Promise<UserProfile> {
	// Step 1: Customer Login — server set token vào cookie
	await loginCustomer(credentials);

	// Step 2: Gọi GET /api/auth để lấy profile (cookie tự gửi kèm)
	const profile = await getProfile();

	// Lưu profile vào localStorage để hydrate store
	localStorage.setItem(LOCAL_STORAGE_KEY.AUTH_USER, JSON.stringify(profile));

	return profile;
}

// ==================== CUSTOMER-01: Register Item ====================
// POST /api/customers/register — Token: NO — Role: CUSTOMER PUBLIC
// Input: { email (required), password (required), phone (required), name?, address?, avatar_url? }
// Output: { success: true, data: { id, is_active, is_deleted, created_at, updated_at, email, name, phone, avatar_url, address, is_verified } }
export interface RegisterPayload {
	email: string;       // required
	password: string;    // required
	phone: string;       // required
	name?: string;       // optional, default ""
	address?: string;    // optional, default ""
	avatar_url?: string; // optional, default ""
}

export interface RegisteredCustomer {
	id: string;
	is_active: boolean;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
	email: string;
	name: string;
	phone: string;
	avatar_url: string;
	address: string;
	is_verified: boolean;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisteredCustomer> {
	try {
		const response = await apiClient.post<ApiResponse<RegisteredCustomer>>("/customers/register", {
			email: payload.email,
			password: payload.password,
			phone: payload.phone,
			...(payload.name && { name: payload.name }),
			...(payload.address && { address: payload.address }),
			...(payload.avatar_url && { avatar_url: payload.avatar_url }),
		});

		const result = response.data;
		if (!result.success) {
			// Trường hợp server trả 200 nhưng success: false (hiếm)
			throw buildRegisterError(result);
		}

		return result.data;
	} catch (error) {
		if (error instanceof AxiosError && error.response) {
			// Server trả 400 — response.data chứa { success: false, message, errors: [...] }
			const errorData = error.response.data as ApiErrorSingleResponse | ApiErrorMultiResponse;
			throw buildRegisterError(errorData);
		}
		// Lỗi khác (network, timeout, ...)
		throw error;
	}
}

/** Helper: Parse lỗi register thành Error message dễ đọc */
function buildRegisterError(errorData: ApiErrorSingleResponse | ApiErrorMultiResponse): Error {
	// Nếu có mảng errors chi tiết theo field
	if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
		const fieldErrors = errorData.errors as Array<{ field?: string; message?: string }>;
		const messages = fieldErrors
			.map((e) => {
				if (e.field && e.message) {
					// "Customer with Email: 'x@y.com' already exists" → rút gọn
					if (e.field === "email" && e.message.toLowerCase().includes("already exists")) {
						return "Email đã được sử dụng";
					}
					if (e.field === "phone" && e.message.toLowerCase().includes("already exists")) {
						return "Số điện thoại đã được sử dụng";
					}
					return e.message;
				}
				return (e as { message?: string }).message || "Lỗi không xác định";
			})
			.filter(Boolean);

		if (messages.length > 0) {
			return new Error(messages.join(". "));
		}
	}

	// Fallback: dùng message chính
	const msg = errorData.message || "Đăng ký thất bại";
	return new Error(msg);
}
