import { useEffect, useState, useCallback } from "react";
import { Button } from "../../../components";
import type { ApiFranchise } from "../../../services/store.service";
import { searchFranchises } from "../../../services/store.service";
import { Link, useNavigate } from "react-router-dom";
import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

const FranchiseListPage = () => {
  const [franchises, setFranchises] = useState<ApiFranchise[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const result = await searchFranchises({
        searchCondition: {
          keyword,
          is_active: "",
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
  }, [currentPage, keyword]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (page: number) => {
    load(page);
  };

  const handleSearch = () => {
    load(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Franchise</h1>
          <p className="text-sm text-slate-600">Danh sách chi nhánh</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, mã..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch} loading={loading}>
            Tìm kiếm
          </Button>
          <Button variant="outline" onClick={() => load(currentPage)} loading={loading}>
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
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.FRANCHISE_DETAIL.replace(":id", f.id)}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      Chi tiết
                    </Link>
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.INVENTORY_BY_FRANCHISE.replace(":id", f.id)}`}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      Tồn kho
                    </Link>
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
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>
    </div>
  );
};

export default FranchiseListPage;

