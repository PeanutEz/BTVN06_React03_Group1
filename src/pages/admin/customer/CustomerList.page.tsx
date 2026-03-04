import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components";
import type { CustomerDisplay, LoyaltyTier } from "../../../models/customer.model";
import {
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_COLORS,
} from "../../../models/customer.model";
import {
  searchCustomersFromApi,
  createCustomer,
  updateCustomer,
} from "../../../services/customer.service";
import type { CustomerApiItem } from "../../../services/customer.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import Pagination from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

const CustomerListPage = () => {
  const [customers, setCustomers] = useState<CustomerDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDisplay | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password_hash: "$2b$10$...", // default hash
    is_active: true,
    is_deleted: false,
  });

  const mapApiItem = (item: CustomerApiItem): CustomerDisplay => ({
    id: Number(item.id),
    phone: item.phone,
    email: item.email,
    password_hash: "",
    name: item.name,
    avatar_url: item.avatar_url,
    is_active: item.is_active,
    is_deleted: item.is_deleted,
    created_at: item.created_at,
    updated_at: item.updated_at,
  });

  const loadCustomers = async (page = 1, keyword = searchQuery, status = statusFilter) => {
    setLoading(true);
    try {
      const isActive: boolean | "" = status === "true" ? true : status === "false" ? false : "";
      const result = await searchCustomersFromApi(keyword, isActive, page, ITEMS_PER_PAGE);
      setCustomers(result.data.map(mapApiItem));
      setTotalPages(result.pageInfo.totalPages);
      setTotalItems(result.pageInfo.totalItems);
    } catch (error) {
      console.error("Lỗi tải danh sách khách hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(1);
  }, []);

  const handleSearch = (keyword = searchQuery, status = statusFilter) => {
    setCurrentPage(1);
    loadCustomers(1, keyword, status);
  };

  const handleOpenModal = (customer?: CustomerDisplay) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
        password_hash: "$2b$10$...",
        is_active: customer.is_active,
        is_deleted: false,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password_hash: "$2b$10$...",
        is_active: true,
        is_deleted: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
        showSuccess("Cập nhật khách hàng thành công");
      } else {
        await createCustomer(formData);
        showSuccess("Tạo khách hàng thành công");
      }
      setShowModal(false);
      loadCustomers();
    } catch (error) {
      showError("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý khách hàng</h1>
          <p className="text-xs sm:text-sm text-slate-600">Quản lý thông tin khách hàng và điểm thưởng</p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Thêm khách hàng</Button>
      </div>

      {/* Filters */}
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
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(searchQuery, statusFilter); }}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value as "" | "true" | "false";
              setStatusFilter(val);
              setCurrentPage(1);
              handleSearch(searchQuery, val);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Ngưng hoạt động</option>
          </select>
          <Button onClick={() => handleSearch(searchQuery, statusFilter)} loading={loading}>
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Hạng</th>
                <th className="px-4 py-3">Điểm</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {customer.avatar_url && (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="size-10 rounded-full object-cover"
                        />
                      )}
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-primary-600">KH-{String(customer.id).padStart(4, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{customer.email || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
                  <td className="px-4 py-3">
                    {customer.franchises && customer.franchises.length > 0 ? (
                      customer.franchises.map((cf) => (
                        <span
                          key={cf.id}
                          className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold mr-1 mb-1 ${LOYALTY_TIER_COLORS[cf.loyalty_tier]}`}
                        >
                          {LOYALTY_TIER_LABELS[cf.loyalty_tier]}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Chưa có</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary-600">
                    {customer.franchises && customer.franchises.length > 0
                      ? customer.franchises.reduce((sum, cf) => sum + cf.loyalty_point, 0).toLocaleString()
                      : '0'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        customer.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {customer.is_active ? 'Hoạt động' : 'Ngưng hoạt động'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.CUSTOMERS}/${customer.id}`}
                      >
                        <Button size="sm" variant="outline">
                          Chi tiết
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có khách hàng
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Đang tải...
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
            onPageChange={(page) => {
              setCurrentPage(page);
              loadCustomers(page, searchQuery, statusFilter);
            }}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              {editingCustomer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <select
                    value={formData.is_active ? "active" : "inactive"}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value === "active" })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Ngưng hoạt động</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={loading} disabled={loading} className="flex-1">
                  {editingCustomer ? "Cập nhật" : "Tạo mới"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="outline"
                  disabled={loading}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;
