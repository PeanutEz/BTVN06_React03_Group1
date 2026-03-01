import { create } from "zustand";
import { getItem, setItem } from "@/utils/localstorage.util";
import type { Notification, NotificationType } from "@/types/notification.types";
import { MOCK_NOTIFICATIONS } from "@/mocks/notifications.mock";

const STORAGE_KEY = "hylux_notifications";

type MutedTypes = Partial<Record<NotificationType, boolean>>;

interface NotificationState {
  notifications: Notification[];
  mutedTypes: MutedTypes;
  isInitialized: boolean;

  // Computed
  unreadCount: () => number;
  recentFive: () => Notification[];

  // Actions
  hydrate: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  pinNotification: (id: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "isRead" | "isPinned" | "isDeleted">) => void;
  muteType: (type: NotificationType) => void;
  unmuteType: (type: NotificationType) => void;
}

function _persist(notifications: Notification[], mutedTypes: MutedTypes) {
  setItem(STORAGE_KEY, { notifications, mutedTypes });
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  mutedTypes: {},
  isInitialized: false,

  unreadCount: () => {
    const { notifications, mutedTypes } = get();
    return notifications.filter(
      (n) => !n.isRead && !n.isDeleted && !mutedTypes[n.type],
    ).length;
  },

  recentFive: () => {
    const { notifications, mutedTypes } = get();
    return notifications
      .filter((n) => !n.isDeleted && !mutedTypes[n.type])
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  },

  hydrate: () => {
    const saved = getItem<{ notifications: Notification[]; mutedTypes: MutedTypes }>(STORAGE_KEY);
    if (saved?.notifications?.length) {
      set({ notifications: saved.notifications, mutedTypes: saved.mutedTypes ?? {}, isInitialized: true });
    } else {
      // Load mock data on first visit
      set({ notifications: MOCK_NOTIFICATIONS, mutedTypes: {}, isInitialized: true });
      _persist(MOCK_NOTIFICATIONS, {});
    }
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
    );
    _persist(updated, get().mutedTypes);
    set({ notifications: updated });
  },

  markAllAsRead: () => {
    const updated = get().notifications.map((n) =>
      n.isDeleted ? n : { ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() },
    );
    _persist(updated, get().mutedTypes);
    set({ notifications: updated });
  },

  deleteNotification: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isDeleted: true } : n,
    );
    _persist(updated, get().mutedTypes);
    set({ notifications: updated });
  },

  pinNotification: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned } : n,
    );
    _persist(updated, get().mutedTypes);
    set({ notifications: updated });
  },

  addNotification: (payload) => {
    const newNotif: Notification = {
      ...payload,
      id: `notif-${Date.now()}`,
      isRead: false,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotif, ...get().notifications];
    _persist(updated, get().mutedTypes);
    set({ notifications: updated });
  },

  muteType: (type) => {
    const mutedTypes = { ...get().mutedTypes, [type]: true };
    _persist(get().notifications, mutedTypes);
    set({ mutedTypes });
  },

  unmuteType: (type) => {
    const mutedTypes = { ...get().mutedTypes, [type]: false };
    _persist(get().notifications, mutedTypes);
    set({ mutedTypes });
  },
}));
