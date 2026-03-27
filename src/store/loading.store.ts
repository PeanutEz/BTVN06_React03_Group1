import { create } from "zustand";

interface LoadingShowOptions {
  persistOnNextRoute?: boolean;
}

interface LoadingState {
  isLoading: boolean;
  message: string;
  persistOnNextRoute: boolean;
  show: (message?: string, options?: LoadingShowOptions) => void;
  hide: () => void;
  clearRoutePersistence: () => void;
}

const DEFAULT_MESSAGE = "Đang tải";

export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: DEFAULT_MESSAGE,
  persistOnNextRoute: false,
  show: (message = DEFAULT_MESSAGE, options) =>
    set({
      isLoading: true,
      message,
      persistOnNextRoute: !!options?.persistOnNextRoute,
    }),
  hide: () =>
    set({
      isLoading: false,
      message: DEFAULT_MESSAGE,
      persistOnNextRoute: false,
    }),
  clearRoutePersistence: () => set({ persistOnNextRoute: false }),
}));
