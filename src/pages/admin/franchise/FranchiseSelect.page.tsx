import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { useFranchiseStore } from "../../../store/franchise.store";
import { useAuthStore } from "../../../store/auth.store";
import { ROUTER_URL } from "../../../routes/router.const";
import { ROLE_CODE } from "../../../models/role.model";

const FranchiseSelectPage = () => {
  const navigate = useNavigate();
  const { setSelectedFranchise } = useFranchiseStore();
  // user đã có sẵn trong store: được set lúc login hoặc hydrate từ localStorage
  const { user } = useAuthStore();
  const [selecting, setSelecting] = useState<string | null>(null);

  // Tính danh sách franchise từ roles trong store — không cần gọi thêm API
  const franchises = useMemo<FranchiseSelectItem[]>(() => {
    const seen = new Set<string>();
    const list: FranchiseSelectItem[] = [];
    for (const r of user?.roles ?? []) {
      if (r.franchise_id && !seen.has(r.franchise_id)) {
        seen.add(r.franchise_id);
        list.push({ value: r.franchise_id, code: "", name: r.franchise_name ?? r.franchise_id });
      }
    }
    return list;
  }, [user]);

  // Kiểm tra quyền — auto-select 1 franchise đã được FranchiseGuard xử lý
  useEffect(() => {
    const hasAccess = user?.roles?.some(
      (r) => r.role?.toUpperCase() === ROLE_CODE.ADMIN || r.role?.toUpperCase() === ROLE_CODE.MANAGER
    );
    if (!hasAccess) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (franchise: FranchiseSelectItem) => {
    setSelecting(franchise.value);
    // switchContext sẽ được FranchiseGuard gọi khi selectedFranchise thay đổi
    setSelectedFranchise(franchise);
    navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, {
      replace: true,
    });
  };

  if (franchises.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
        <div className="rounded-2xl bg-white p-10 shadow-lg text-center space-y-4 max-w-sm w-full">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Không có cửa hàng nào</h2>
          <p className="text-sm text-slate-500">Tài khoản của bạn chưa được gán cho cửa hàng nào. Liên hệ quản trị viên.</p>
          <button
            onClick={() => navigate(ROUTER_URL.ADMIN_LOGIN, { replace: true })}
            className="mt-2 w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 mb-2">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Chọn cửa hàng</h1>
          <p className="text-sm text-slate-500">Vui lòng chọn cửa hàng bạn muốn quản lý</p>
        </div>

        {/* Franchise list */}
        <div className="grid gap-4 sm:grid-cols-2">
          {franchises.map((franchise) => (
            <button
              key={franchise.value}
              onClick={() => handleSelect(franchise)}
              disabled={selecting !== null}
              className="group relative flex flex-col items-start gap-2 rounded-2xl border-2 border-slate-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-primary-400 hover:shadow-md hover:shadow-primary-500/10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selecting === franchise.value && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                  <svg className="h-6 w-6 animate-spin text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800 group-hover:text-primary-700">
                  {franchise.name}
                </p>
                {franchise.code && (
                  <p className="text-xs text-slate-400 mt-0.5">{franchise.code}</p>
                )}
              </div>
              <svg className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 transition group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400">
          Bạn có thể thay đổi cửa hàng bất kỳ lúc nào trong phiên làm việc
        </p>
      </div>
    </div>
  );
};

export default FranchiseSelectPage;
