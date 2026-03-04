import { LOCAL_STORAGE_KEY } from "../const/data.const";
import type { User } from "../models";

export function setItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getItem<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Failed to parse localStorage item", error);
    return null;
  }
}

export function removeItem(key: string) {
  localStorage.removeItem(key);
}

export function getCurrentUser(): User | null {
  return getItem<User>(LOCAL_STORAGE_KEY.AUTH_USER);
}

export function isLoggedIn() {
  return !!getCurrentUser();
}
