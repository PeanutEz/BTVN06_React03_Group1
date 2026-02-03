import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "../../../components";
import type { Store } from "../../../models/store.model";
import { STORE_STATUS_COLORS, STORE_STATUS_LABELS } from "../../../models/store.model";
import { fetchStoreById } from "../../../services/store.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { fetchInventoryByStore } from "../../../services/inventory.service";
import { isLowStock } from "../../../models/inventory.model";

const FranchiseDetailPage = () => {
  const { id } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchStoreById(id);
      setStore(data);
      const inventory = await fetchInventoryByStore(id);
      setLowStockCount(inventory.filter(isLowStock).length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!store && !loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Không tìm thấy franchise.</p>
        <Link
          to={`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_LIST}`}
          className="text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chi tiết Franchise</h1>
          <p className="text-sm text-slate-600">Thông tin chi nhánh & tóm tắt tồn kho</p>
        </div>
        <Button variant="outline" onClick={load} loading={loading}>
          Làm mới
        </Button>
      </div>

      {store && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-500">{store.code}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STORE_STATUS_COLORS[store.status]}`}
                  >
                    {STORE_STATUS_LABELS[store.status]}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{store.name}</h2>
                <p className="text-sm text-slate-600">{store.address}</p>
                <p className="text-xs text-slate-500">{store.city}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Thông tin liên hệ</p>
                <p className="text-slate-600">Quản lý: {store.manager}</p>
                <p className="text-slate-600">Điện thoại: {store.phone}</p>
                <p className="text-slate-600">Email: {store.email}</p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-slate-800">Hoạt động</p>
                <p className="text-slate-600">Giờ mở cửa: {store.openingHours}</p>
                <p className="text-slate-600">
                  Ngày tạo: {new Date(store.createDate).toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng quan kinh doanh</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Số đơn hàng</p>
                  <p className="text-lg font-semibold text-slate-900">{store.totalOrders?.toLocaleString() ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Doanh thu</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    {store.totalRevenue
                      ? store.totalRevenue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tồn kho</p>
                <Link
                  to={`/${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", store.id)}`}
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

