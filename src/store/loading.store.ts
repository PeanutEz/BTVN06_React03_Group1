import { create } from "zustand";

interface LoadingState {
  isLoading: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: "Đang tải",
  show: (message = "Đang tải") => set({ isLoading: true, message }),
  hide: () => set({ isLoading: false, message: "Đang tải" }),
}));
