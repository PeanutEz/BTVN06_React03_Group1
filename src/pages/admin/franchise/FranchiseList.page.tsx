import { useEffect, useState } from "react";
import { Button, Pagination } from "../../../components";

const PAGE_SIZE = 10;
import type { Store } from "../../../models/store.model";
import { STORE_STATUS_COLORS, STORE_STATUS_LABELS } from "../../../models/store.model";
import { fetchStores } from "../../../services/store.service";
import { Link, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../../routes/router.const";

const FranchiseListPage = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchStores();
      setStores(data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const pagedStores = stores.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Franchise</h1>
          <p className="text-sm text-slate-600">Danh sách chi nhánh (mock từ Store service)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={load} loading={loading}>
            Làm mới
          </Button>
          <Button onClick={() => navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_CREATE}`)}>
            Tạo franchise
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên chi nhánh</th>
              <th className="px-4 py-3">Thành phố</th>
              <th className="px-4 py-3">Quản lý</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Đơn hàng</th>
              <th className="px-4 py-3 text-right">Doanh thu</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>          <tbody className="divide-y divide-slate-200">
            {pagedStores.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.code}</td>
                <td className="px-4 py-3">
                  <div className="leading-tight">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.address}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{s.city}</td>
                <td className="px-4 py-3 text-slate-700">{s.manager}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STORE_STATUS_COLORS[s.status]}`}>
                    {STORE_STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700">{s.totalOrders?.toLocaleString() ?? "-"}</td>
                <td className="px-4 py-3 text-right text-emerald-700">
                  {s.totalRevenue ? s.totalRevenue.toLocaleString("vi-VN", { style: "currency", currency: "VND" }) : "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_DETAIL.replace(":id", s.id)}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", s.id)}`}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      Tồn kho
                    </Link>
                  </div>
                </td>
              </tr>
            ))}            {stores.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có chi nhánh
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalItems={stores.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default FranchiseListPage;

