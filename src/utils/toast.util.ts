import { toast } from "sonner";

export const showInfo = (message: string) => toast.info(message);
export const showSuccess = (message: string) => toast.success(message);
export const showWarning = (message: string) => toast.warning(message);
export const showError = (message: string) => toast.error(message);
export const showLoading = (message: string) => toast.loading(message);
export const dismissToast = (toastId?: string) => toast.dismiss(toastId);
