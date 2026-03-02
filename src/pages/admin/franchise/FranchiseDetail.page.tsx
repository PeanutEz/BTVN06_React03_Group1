import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import type { ApiFranchise } from "../../../services/store.service";
import { getFranchiseById, deleteFranchise } from "../../../services/store.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { fetchInventoryByStore } from "../../../services/inventory.service";
import { isLowStock } from "../../../models/inventory.model";
import { showSuccess, showError } from "../../../utils";

const FranchiseDetailPage = () => {
  const { id } = useParams();
  const [franchise, setFranchise] = useState<ApiFranchise | null>(null);
  const [loading, setLoading] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getFranchiseById(id);
      setFranchise(data);
      try {
        const inventory = await fetchInventoryByStore(id);
        setLowStockCount(inventory.filter(isLowStock).length);
      } catch {
        // inventory is mock, ignore errors
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết franchise:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!franchise && !loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Không tìm thấy franchise.</p>
        <Link
          to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chi tiết Franchise</h1>
          <p className="text-xs sm:text-sm text-slate-600">Thông tin chi nhánh & tóm tắt tồn kho</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_EDIT.replace(":id", id!)}`)}>
            Chỉnh sửa
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={async () => {
              if (!id) return;
              if (!window.confirm("Bạn có chắc muốn xóa franchise này?")) return;
              try {
                await deleteFranchise(id);
                showSuccess("Xóa franchise thành công");
                navigate(`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`);
              } catch (err) {
                showError(err instanceof Error ? err.message : "Xóa franchise thất bại");
              }
            }}
          >
            Xóa
          </Button>
          <Button variant="outline" onClick={load} loading={loading}>
            Làm mới
          </Button>
        </div>
      </div>

      {franchise && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500">{franchise.code}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      franchise.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {franchise.is_active ? "Hoạt động" : "Ngừng"}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{franchise.name}</h2>
                {franchise.address && <p className="text-sm text-slate-600">{franchise.address}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Thông tin liên hệ</p>
                <p className="text-slate-600">Hotline: {franchise.hotline || "—"}</p>
                {franchise.logo_url && (
                  <p className="text-slate-600">Logo: <a href={franchise.logo_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{franchise.logo_url}</a></p>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Hoạt động</p>
                <p className="text-slate-600">Giờ mở cửa: {franchise.opened_at} - {franchise.closed_at}</p>
                <p className="text-slate-600">
                  Ngày tạo: {new Date(franchise.created_at).toLocaleDateString("vi-VN")}
                </p>
                <p className="text-slate-600">
                  Cập nhật: {new Date(franchise.updated_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tồn kho</p>
                <Link
                  to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", franchise.id)}`}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Xem chi tiết
                </Link>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-600">
                  Số mặt hàng cảnh báo thấp:{" "}
                  <span className={lowStockCount > 0 ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
                    {lowStockCount}
                  </span>
                </p>
                {lowStockCount > 0 && (
                  <p className="text-xs text-amber-600">
                    Một số sản phẩm sắp hết hàng. Vui lòng kiểm tra trang tồn kho để điều chỉnh.
                  </p>
                )}
                {lowStockCount === 0 && (
                  <p className="text-xs text-emerald-600">Tất cả mặt hàng đang ở mức tồn kho an toàn.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseDetailPage;

