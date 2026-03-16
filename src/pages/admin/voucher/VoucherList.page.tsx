import { useState, useEffect, useRef } from "react";
import { voucherService } from "@/services/voucher.service";
import type { Voucher } from "@/models/voucher.model";
import { toast } from "sonner";
import { VoucherModal } from "@/components/voucher/VoucherModal";
import dayjs from "dayjs";

export default function VoucherListPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Filters
  const [searchCode, setSearchCode] = useState("");
  const [appliedSearchCode, setAppliedSearchCode] = useState("");
  const [typeFilter, setTypeFilter] = useState<"PERCENT" | "FIXED" | "">("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");
  const [isDeletedFilter, setIsDeletedFilter] = useState<boolean>(false);
  const lastParamsRef = useRef<string | null>(null);

  // Fetch vouchers
  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await voucherService.searchVouchers({
        page: pagination.page,
        limit: pagination.limit,
        code: appliedSearchCode || undefined,
        type: typeFilter,
        is_active: statusFilter,
        is_deleted: isDeletedFilter,
      });
      setVouchers(response.data);
      setPagination((prev) => ({ ...prev, total: response.total }));
    } catch (error) {
      toast.error("Lỗi khi tải danh sách voucher");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = JSON.stringify([pagination.page, appliedSearchCode, typeFilter, statusFilter, isDeletedFilter]);
    if (key === lastParamsRef.current) return;
    lastParamsRef.current = key;
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, appliedSearchCode, typeFilter, statusFilter, isDeletedFilter]);

  // Modals
  const handleOpenModal = (voucher?: Voucher) => {
    setEditingVoucher(voucher || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleSaveModal = () => {
    handleCloseModal();
    fetchVouchers();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa voucher này?")) return;
    try {
      await voucherService.deleteVoucher(id);
      toast.success("Đã xóa voucher");
      fetchVouchers();
    } catch (error) {
      toast.error("Xóa thất bại");
      console.error(error);
    }
  };

  const handleRestore = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn khôi phục voucher này?")) return;
    try {
      await voucherService.restoreVoucher(id);
      toast.success("Đã khôi phục voucher");
      fetchVouchers();
    } catch (error) {
      toast.error("Khôi phục thất bại");
      console.error(error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await voucherService.toggleVoucherStatus(id, currentStatus);
      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, is_active: res.isActive } : v))
      );
      toast.success(`Đã ${res.isActive ? "kích hoạt" : "hủy kích hoạt"} voucher`);
    } catch (error) {
      toast.error("Cập nhật trạng thái thất bại");
      // Fallback update in case toggle is purely done via re-fetching full list or PUT full entity
      // Here we assume `/vouchers/status` or equivalent worked. If not handled server sync is needed.
      console.error(error);
      fetchVouchers(); // Sync back safely
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Quản lý Voucher</h1>
          <p className="text-gray-600 mt-1 text-sm">Quản lý danh sách voucher toàn hệ thống</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-colors"
        >
          + Tạo Voucher
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo mã Voucher (Code)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setAppliedSearchCode(searchCode);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        {/* Type Dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as "PERCENT" | "FIXED" | "");
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 max-w-40"
        >
          <option value="">Tất cả loại</option>
          <option value="PERCENT">Phần trăm (%)</option>
          <option value="FIXED">Cố định (đ)</option>
        </select>

        {/* Status Dropdown */}
        <select
          value={statusFilter === "" ? "" : String(statusFilter)}
          onChange={(e) => {
            const val = e.target.value;
            setStatusFilter(val === "" ? "" : val === "true");
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 max-w-48"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Active (Đang hoạt động)</option>
          <option value="false">Inactive (Ngừng hoạt động)</option>
        </select>

        {/* Deleted Checkbox */}
        <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors select-none ${
          isDeletedFilter ? "border-red-400 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}>
          <input
            type="checkbox"
            checked={isDeletedFilter}
            onChange={(e) => {
              setIsDeletedFilter(e.target.checked);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="accent-red-500 rounded"
          />
          <span className="font-medium whitespace-nowrap">Đã xóa</span>
        </label>

        {/* Search Button */}
        <button
          onClick={() => {
            setAppliedSearchCode(searchCode);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          disabled={loading}
          className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 whitespace-nowrap"
        >
          Tìm kiếm
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <p className="text-lg font-medium text-slate-600">Không tìm thấy voucher</p>
            <p className="text-sm mt-1 text-slate-400">Hãy thử điều chỉnh bộ lọc hoặc tạo voucher mới</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã / Tên</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giảm giá</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Thời gian</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vouchers.map((v) => (
                  <tr key={v.id} className={`transition-colors ${isDeletedFilter ? "bg-red-50/50" : "hover:bg-slate-50/70"}`}>
                    <td className="px-5 py-4 align-top">
                      <div className="font-mono font-semibold text-primary-700 text-sm bg-primary-50 inline-block px-2 py-0.5 rounded border border-primary-100 mb-1.5">
                        {v.code}
                      </div>
                      <div className="font-medium text-slate-800 text-sm">{v.name}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-rose-600">
                        {v.type === "PERCENT" ? `${v.value}%` : `${v.value.toLocaleString("vi-VN")} đ`}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{v.type === "PERCENT" ? "Theo phần trăm" : "Mức cố định"}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="text-sm font-semibold text-slate-700 group cursor-help relative inline-block">
                        {v.quota_usage ?? 0} <span className="text-slate-400 font-normal">/ {v.quota_total}</span>
                        {/* Tooltip simple */}
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 -translate-x-1/2 pointer-events-none mb-1 whitespace-nowrap">
                          Đã dùng {(v.quota_usage ?? 0)} trong tổng số {v.quota_total}
                        </div>
                      </div>
                      {/* Quick progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${((v.quota_usage ?? 0) / v.quota_total) * 100}%` }}></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>{dayjs(v.start_date).format("DD/MM/YYYY HH:mm")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className={dayjs().isAfter(dayjs(v.end_date)) ? "text-rose-500 font-medium" : ""}>
                          {dayjs(v.end_date).format("DD/MM/YYYY HH:mm")}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <button
                        onClick={() => handleToggleStatus(v.id, v.is_active)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                          v.is_active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {v.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4 align-top text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isDeletedFilter ? (
                          <button
                            title="Khôi phục"
                            onClick={() => handleRestore(v.id)}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        ) : (
                          <>
                            <button
                              title="Chỉnh sửa"
                              onClick={() => handleOpenModal(v)}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all shadow-sm hover:shadow"
                            >
                              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              title="Xóa"
                              onClick={() => handleDelete(v.id)}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 hover:border-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow"
                            >
                              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && vouchers.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500 font-medium">
              Hiển thị <span className="text-slate-800 font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> –{" "}
              <span className="text-slate-800 font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong{" "}
              <span className="text-slate-800 font-bold">{pagination.total}</span> kết quả
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setPagination((p) => ({ ...p, page: pg }))}
                  className={`w-8 h-8 flex items-center justify-center rounded-md border font-medium text-sm transition-all ${
                    pagination.page === pg 
                    ? "bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-500/30" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === totalPages}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <VoucherModal
          voucher={editingVoucher}
          onClose={handleCloseModal}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
}
