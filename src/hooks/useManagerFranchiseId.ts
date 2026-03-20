import { useMemo } from "react";
import { useAuthStore } from "../store/auth.store";

type ActiveContext = {
  role?: string;
  scope?: string;
  franchise_id?: string | null;
  franchise_name?: string | null;
};

/**
 * Trả về franchise_id của context hiện tại nếu role là MANAGER.
 * Ưu tiên đọc từ active_context (sau khi switch context).
 * ADMIN / SYSTEM / GLOBAL scope → trả về null (không giới hạn franchise).
 * MANAGER + FRANCHISE scope → trả về franchise_id đang active.
 */
export function useManagerFranchiseId(): string | null {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    if (!user) return null;

    // Ưu tiên active_context — được set sau switchContextAndGetProfile
    const ctx = user.active_context as ActiveContext | null | undefined;
    if (ctx) {
      const role = ctx.role?.toUpperCase() ?? "";
      const scope = ctx.scope?.toUpperCase() ?? "";
      // ADMIN hoặc GLOBAL scope → không giới hạn
      if (role === "ADMIN" || scope === "GLOBAL") return null;
      if (role === "MANAGER" && ctx.franchise_id) return ctx.franchise_id;
    }

    // Fallback: scan roles nếu chưa có active_context
    if (!user.roles?.length) return null;
    const isAdmin = user.roles.some(
      (r) => r.role?.toUpperCase() === "ADMIN" || r.scope?.toUpperCase() === "GLOBAL"
    );
    if (isAdmin) return null;
    const managerRole = user.roles.find(
      (r) => r.role?.toUpperCase() === "MANAGER" && r.franchise_id
    );
    return managerRole?.franchise_id ?? null;
  }, [user]);
}
