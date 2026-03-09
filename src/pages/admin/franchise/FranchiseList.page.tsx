import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "../../../components";
import type { ApiFranchise } from "../../../services/store.service";
import { searchFranchises, deleteFranchise, getFranchiseById } from "../../../services/store.service";
import { Link, useNavigate } from "react-router-dom";import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";
import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const FranchiseListPage = () => {
  const [franchises, setFranchises] = useState<ApiFranchise[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("");
  const [viewingFranchise, setViewingFranchise] = useState<ApiFranchise | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const navigate = useNavigate();
  const lastIsActive = useRef<string | null>(null);

  const load = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const result = await searchFranchises({
        searchCondition: {
          keyword,
          ...(isActive !== "" && { is_active: isActive }),
          is_deleted: false,
        },
        pageInfo: {
          pageNum: page,
          pageSize: ITEMS_PER_PAGE,
        },
      });
      setFranchises(result.data);
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
      setCurrentPage(result.pageInfo.pageNum);
    } catch (error) {
      console.error("Lỗi tải danh sách franchise:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, keyword, isActive]);

  useEffect(() => {
    if (isActive === lastIsActive.current) return;
    lastIsActive.current = isActive;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handlePageChange = (page: number) => {
    load(page);
  };

  const handleSearch = () => {
    load(1);
  };
  const handleDelete = async (f: ApiFranchise) => {
    if (!confirm(`Bạn có chắc muốn xóa franchise "${f.name}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteFranchise(f.id);
      showSuccess(`Đã xóa franchise "${f.name}"`);
      load(currentPage);
    } catch {
      showError("Xóa franchise thất bại");
    }
  };

  const handleViewDetail = async (f: ApiFranchise) => {
    setViewingFranchise(f);
    setLoadingDetail(true);
    try {
      const detail = await getFranchiseById(f.id);
      setViewingFranchise(detail);
    } catch {
      // fallback: dùng data từ list
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý Franchise</h1>
          <p className="text-xs sm:text-sm text-slate-600">Danh sách chi nhánh</p>
        </div>
        <Button onClick={() => navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_CREATE}`)}>
          + Tạo franchise
        </Button>
      </div>

      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngừng</option>
          </select>
          <Button onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên chi nhánh</th>
              <th className="px-4 py-3">Hotline</th>
              <th className="px-4 py-3">Giờ mở cửa</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {franchises.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{f.code}</td>
                <td className="px-4 py-3">
                  <div className="leading-tight">
                    <p className="font-semibold text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">{f.address}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{f.hotline || "-"}</td>
                <td className="px-4 py-3 text-slate-700">{f.opened_at} - {f.closed_at}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    f.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}>
                    {f.is_active ? "Hoạt động" : "Ngừng"}
                  </span>
                </td>                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      title="Xem chi tiết"
                      onClick={() => handleViewDetail(f)}
                      className="inline-flex items-center justify-center size-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      title="Xóa franchise"
                      onClick={() => handleDelete(f)}
                      className="inline-flex items-center justify-center size-8 rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {franchises.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có chi nhánh
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6}>
                  <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />        </div>
      </div>

      {/* ─── View Detail Modal─────────────────────────────────────────────── */}
      {viewingFranchise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500">
                  {viewingFranchise.code}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  viewingFranchise.is_active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}>
                  {viewingFranchise.is_active ? "Hoạt động" : "Ngừng"}
                </span>
                {loadingDetail && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-primary-500" />
                )}
              </div>
              <button
                onClick={() => setViewingFranchise(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              {/* Tên + địa chỉ */}
              <div>
                <h2 className="text-xl font-bold text-slate-900">{viewingFranchise.name}</h2>
                {viewingFranchise.address && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {viewingFranchise.address}
                  </p>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Hotline</p>
                  <p className="mt-1 font-medium text-slate-800">{viewingFranchise.hotline || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Giờ mở cửa</p>
                  <p className="mt-1 font-medium text-slate-800">
                    {viewingFranchise.opened_at} – {viewingFranchise.closed_at}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ngày tạo</p>
                  <p className="mt-1 text-slate-600">
                    {new Date(viewingFranchise.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cập nhật lúc</p>
                  <p className="mt-1 text-slate-600">
                    {new Date(viewingFranchise.updated_at).toLocaleString("vi-VN")}
                  </p>
                </div>                {viewingFranchise.logo_url && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Logo</p>
                    <a
                      href={viewingFranchise.logo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-primary-600 hover:underline break-all text-xs"
                    >
                      {viewingFranchise.logo_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewingFranchise(null);
                    navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_EDIT.replace(":id", viewingFranchise.id)}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => {
                    setViewingFranchise(null);
                    navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", viewingFranchise.id)}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Xem tồn kho
                </button>
                <Link
                  to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_DETAIL.replace(":id", viewingFranchise.id)}`}
                  onClick={() => setViewingFranchise(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Trang chi tiết
                </Link>
              </div>
              <button
                onClick={() => setViewingFranchise(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseListPage;

