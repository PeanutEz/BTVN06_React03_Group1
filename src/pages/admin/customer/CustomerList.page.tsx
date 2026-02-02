import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components";
import type { Customer, LoyaltyTier, CustomerStatus } from "../../../models/customer.model";
import {
  LOYALTY_TIER_LABELS,
  LOYALTY_TIER_COLORS,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_COLORS,
} from "../../../models/customer.model";
import {
  fetchCustomers,
  searchCustomers,
  filterCustomersByTier,
  createCustomer,
  updateCustomer,
} from "../../../services/customer.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";

const CustomerListPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<LoyaltyTier | "">("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "BRONZE" as LoyaltyTier,
    loyaltyPoints: 0,
    status: "ACTIVE" as CustomerStatus,
  });

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCustomers();
      return;
    }
    setLoading(true);
    try {
      const data = await searchCustomers(searchQuery);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterByTier = async () => {
    if (!tierFilter) {
      loadCustomers();
      return;
    }
    setLoading(true);
    try {
      const data = await filterCustomersByTier(tierFilter);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        tier: customer.tier,
        loyaltyPoints: customer.loyaltyPoints,
        status: customer.status,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        tier: "BRONZE",
        loyaltyPoints: 0,
        status: "ACTIVE",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý khách hàng</h1>
          <p className="text-sm text-slate-600">Quản lý thông tin khách hàng và điểm thưởng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCustomers} loading={loading}>
            Làm mới
          </Button>
          <Button onClick={() => handleOpenModal()}>+ Thêm khách hàng</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Tìm kiếm</label>
            <input
              type="text"
              placeholder="Tên, email hoặc số điện thoại"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Hạng thành viên</label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as LoyaltyTier | "")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="BRONZE">Đồng</option>
              <option value="SILVER">Bạc</option>
              <option value="GOLD">Vàng</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleSearch} size="sm">
            Tìm kiếm
          </Button>
          <Button onClick={handleFilterByTier} size="sm" variant="outline">
            Lọc theo hạng
          </Button>
          <Button
            onClick={() => {
              setSearchQuery("");
              setTierFilter("");
              loadCustomers();
            }}
            size="sm"
            variant="outline"
          >
            Đặt lại
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
                      {customer.avatar && (
                        <img
                          src={customer.avatar}
                          alt={customer.name}
                          className="size-10 rounded-full object-cover"
                        />
                      )}
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{customer.email}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${LOYALTY_TIER_COLORS[customer.tier]}`}
                    >
                      {LOYALTY_TIER_LABELS[customer.tier]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary-600">
                    {customer.loyaltyPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${CUSTOMER_STATUS_COLORS[customer.status]}`}
                    >
                      {CUSTOMER_STATUS_LABELS[customer.status]}
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
                      <Button size="sm" variant="outline" onClick={() => handleOpenModal(customer)}>
                        Sửa
                      </Button>
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
                  <label className="text-sm font-semibold text-slate-700">Hạng thành viên</label>
                  <select
                    value={formData.tier}
                    onChange={(e) =>
                      setFormData({ ...formData, tier: e.target.value as LoyaltyTier })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="BRONZE">Đồng</option>
                    <option value="SILVER">Bạc</option>
                    <option value="GOLD">Vàng</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Điểm thưởng</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.loyaltyPoints}
                    onChange={(e) =>
                      setFormData({ ...formData, loyaltyPoints: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as CustomerStatus })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Ngưng hoạt động</option>
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
