import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { ROUTER_URL } from "../../routes/router.const";
import { changePassword } from "../../services/auth.service";
import { showError, showSuccess } from "../../utils";

type TabType = "profile" | "orders" | "security" | "address";

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface MockOrder {
  id: string;
  code: string;
  date: string;
  status: "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED";
  total: number;
  items: OrderItem[];
}

// ==================== MOCK DATA ====================
const MOCK_ORDERS: MockOrder[] = [
  {
    id: "1",
    code: "WBS-260215-001",
    date: "2026-02-15T10:30:00Z",
    status: "COMPLETED",
    total: 125000,
    items: [
      { name: "Cà Phê Sữa Đá", qty: 2, price: 35000 },
      { name: "Bánh Mì Que Pate", qty: 1, price: 25000 },
      { name: "Freeze Trà Xanh", qty: 1, price: 30000 },
    ],
  },
  {
    id: "2",
    code: "WBS-260214-003",
    date: "2026-02-14T14:20:00Z",
    status: "PREPARING",
    total: 89000,
    items: [
      { name: "PhinDi Hạnh Nhân", qty: 1, price: 45000 },
      { name: "Bánh Croissant", qty: 1, price: 44000 },
    ],
  },
  {
    id: "3",
    code: "WBS-260213-007",
    date: "2026-02-13T09:15:00Z",
    status: "CONFIRMED",
    total: 210000,
    items: [
      { name: "Cà Phê Phin Truyền Thống", qty: 3, price: 30000 },
      { name: "Trà Đào Cam Sả", qty: 2, price: 45000 },
      { name: "Bánh Phô Mai Chanh Dây", qty: 1, price: 30000 },
    ],
  },
  {
    id: "4",
    code: "WBS-260210-012",
    date: "2026-02-10T16:45:00Z",
    status: "CANCELLED",
    total: 65000,
    items: [{ name: "Freeze Sô-cô-la", qty: 1, price: 65000 }],
  },
  {
    id: "5",
    code: "WBS-260208-019",
    date: "2026-02-08T08:00:00Z",
    status: "COMPLETED",
    total: 155000,
    items: [
      { name: "Cà Phê Đen Đá", qty: 2, price: 29000 },
      { name: "PhinDi Kem Sữa", qty: 1, price: 42000 },
      { name: "Bánh Mì Que Gà Xé", qty: 2, price: 27500 },
    ],
  },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  PREPARING: { label: "Đang chuẩn bị", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

function formatCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==================== MAIN COMPONENT ====================
export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const { user } = useAuthStore();

  const currentUser = user || { name: "Nguyễn Văn A", email: "nguyenvana@example.com", avatar: "" };

  // --- Orders state ---
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("ALL");

  const filteredOrders =
    orderFilter === "ALL" ? MOCK_ORDERS : MOCK_ORDERS.filter((o) => o.status === orderFilter);

  // --- Security state ---
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      showError("Vui lòng nhập đầy đủ các trường mật khẩu");
      return;
    }
    if (newPw !== confirmPw) {
      showError("Mật khẩu xác nhận không khớp");
      return;
    }
    setIsChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      showSuccess("Đổi mật khẩu thành công");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
      const status = axiosError?.response?.status;
      if (status === 401) {
        showError("Mật khẩu hiện tại không đúng");
      } else if (status === 403) {
        showError("Không thể đổi mật khẩu cho tài khoản này");
      } else {
        showError(axiosError?.response?.data?.message ?? "Đổi mật khẩu thất bại. Vui lòng thử lại");
      }
    } finally {
      setIsChangingPw(false);
    }
  };

  // --- Address state ---
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({ name: "", phone: "", address: "" });

  const resetAddressForm = () => {
    setAddressForm({ name: "", phone: "", address: "" });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const handleSaveAddress = () => {
    if (!addressForm.name || !addressForm.phone || !addressForm.address) return;
    if (editingAddressId !== null) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddressId ? { ...a, name: addressForm.name, phone: addressForm.phone, address: addressForm.address } : a
        )
      );
    } else {
      setAddresses((prev) => [
        ...prev,
        { id: Date.now(), name: addressForm.name, phone: addressForm.phone, address: addressForm.address, isDefault: prev.length === 0 },
      ]);
    }
    resetAddressForm();
  };

  const handleEditAddress = (addr: Address) => {
    setAddressForm({ name: addr.name, phone: addr.phone, address: addr.address });
    setEditingAddressId(addr.id);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (id: number) => {
    setAddresses((prev) => {
      const rest = prev.filter((a) => a.id !== id);
      if (rest.length > 0 && !rest.some((a) => a.isDefault)) rest[0].isDefault = true;
      return rest;
    });
  };

  const handleSetDefaultAddress = (id: number) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  const menuItems: Array<{ id: TabType; label: string; count?: string }> = [
    { id: "profile", label: "Thông tin tài khoản" },
    { id: "orders", label: "Đơn hàng của bạn" },
    { id: "security", label: "Đổi mật khẩu" },
    { id: "address", label: "Sổ địa chỉ", count: `(${addresses.length})` },
  ];

  // --- Eye toggle for password fields ---
  const EyeButton = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      {show ? (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
      ) : (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm">
            <Link to={ROUTER_URL.HOME} className="text-blue-600 hover:underline">
              Trang chủ
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-gray-900">Trang khách hàng</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0 lg:border-r lg:border-gray-200 lg:pr-8">
            {/* Title & Greeting */}
            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
              Trang tài khoản
            </h2>
            <p className="mt-2 text-base text-gray-700">
              Xin chào, <span className="font-semibold text-red-600">{currentUser.name}</span> !
            </p>

            {/* Menu */}
            <nav className="mt-6 space-y-0">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`block w-full py-3 text-left text-base transition-colors ${
                    activeTab === item.id
                      ? "font-medium text-blue-600"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  {item.label} {item.count && <span className="text-gray-500">{item.count}</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 lg:pl-8 mt-8 lg:mt-0">

            {/* ============ PROFILE TAB ============ */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  Thông tin tài khoản
                </h2>

                <div className="mt-8 space-y-6">
                  <p className="text-lg text-gray-800">
                    <span className="font-bold">Họ tên:</span> {currentUser.name}
                  </p>
                  <p className="text-lg text-gray-800">
                    <span className="font-bold">Email:</span> {currentUser.email}
                  </p>
                </div>
              </div>
            )}

            {/* ============ ORDERS TAB ============ */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  Đơn hàng của bạn
                </h2>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "ALL", label: "Tất cả" },
                    { key: "CONFIRMED", label: "Đã xác nhận" },
                    { key: "PREPARING", label: "Đang chuẩn bị" },
                    { key: "COMPLETED", label: "Hoàn thành" },
                    { key: "CANCELLED", label: "Đã hủy" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setOrderFilter(f.key)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        orderFilter === f.key
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Order list */}
                {filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
                    <span className="mb-3 text-4xl">📭</span>
                    <p className="text-gray-500">Chưa có đơn hàng nào</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => {
                      const st = STATUS_MAP[order.status];
                      const isOpen = expandedOrder === order.id;
                      return (
                        <div
                          key={order.id}
                          className="overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-sm"
                        >
                          <button
                            onClick={() => setExpandedOrder(isOpen ? null : order.id)}
                            className="flex w-full items-center justify-between px-4 py-4 text-left"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-900">
                                  #{order.code}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}
                                >
                                  {st.label}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                {formatDate(order.date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(order.total)}
                              </span>
                              <svg
                                className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs font-medium uppercase text-gray-500">
                                    <th className="pb-2">Sản phẩm</th>
                                    <th className="pb-2 text-center">SL</th>
                                    <th className="pb-2 text-right">Giá</th>
                                    <th className="pb-2 text-right">Tổng</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {order.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 text-gray-800">{item.name}</td>
                                      <td className="py-2 text-center text-gray-600">
                                        {item.qty}
                                      </td>
                                      <td className="py-2 text-right text-gray-600">
                                        {formatCurrency(item.price)}
                                      </td>
                                      <td className="py-2 text-right font-medium text-gray-800">
                                        {formatCurrency(item.price * item.qty)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-gray-300">
                                    <td colSpan={3} className="pt-3 text-right font-medium text-gray-700">
                                      Tổng cộng
                                    </td>
                                    <td className="pt-3 text-right font-bold text-gray-900">
                                      {formatCurrency(order.total)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                              {order.status === "COMPLETED" && (
                                <div className="mt-4">
                                  <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                    🔄 Đặt lại đơn hàng này
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============ SECURITY TAB ============ */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  Đổi mật khẩu
                </h2>

                <div className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        id="current-password"
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <EyeButton show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNewPw ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <EyeButton show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirmPw ? "text" : "password"}
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-12 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <EyeButton show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
                    </div>
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPw}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isChangingPw ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </div>
            )}

            {/* ============ ADDRESS TAB ============ */}
            {activeTab === "address" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                    Sổ địa chỉ
                  </h2>
                  {!showAddressForm && (
                    <button
                      onClick={() => { resetAddressForm(); setShowAddressForm(true); }}
                      className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      + Thêm địa chỉ
                    </button>
                  )}
                </div>

                {/* Add / Edit form */}
                {showAddressForm && (
                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50/30 p-5 space-y-4">
                    <h3 className="font-semibold text-gray-900">
                      {editingAddressId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên người nhận</label>
                        <input
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                        <input
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="0901234567"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                      <input
                        value={addressForm.address}
                        onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                        placeholder="123 Đường ABC, Quận 1, TP. Hồ Chí Minh"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={resetAddressForm} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveAddress}
                        disabled={!addressForm.name || !addressForm.phone || !addressForm.address}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editingAddressId ? "Cập nhật" : "Thêm địa chỉ"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Address list */}
                <div className="space-y-4">
                  {addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
                      <span className="mb-3 text-4xl">📍</span>
                      <p className="text-gray-500">Chưa có địa chỉ nào</p>
                      <p className="mt-1 text-sm text-gray-400">
                        Thêm địa chỉ để đặt hàng nhanh hơn
                      </p>
                    </div>
                  ) : (
                    addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`rounded-lg border p-4 ${
                          addr.isDefault ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{addr.name}</h3>
                          {addr.isDefault && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                              Mặc định
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600">
                          Số điện thoại: {addr.phone}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          Địa chỉ: {addr.address}
                        </p>

                        <div className="mt-4 flex gap-3">
                          <button onClick={() => handleEditAddress(addr)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Chỉnh sửa
                          </button>
                          <button onClick={() => handleDeleteAddress(addr.id)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Xóa
                          </button>
                          {!addr.isDefault && (
                            <button onClick={() => handleSetDefaultAddress(addr.id)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                              Đặt mặc định
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
