import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components";
import type { Payment, PaymentStatus, PaymentMethodType } from "../../../models/payment.model";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";
import { fetchPayments, filterPayments } from "../../../services/payment.service";
import { ROUTER_URL } from "../../../routes/router.const";

const PaymentListPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState<PaymentMethodType | "">("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchPayments();
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const data = await filterPayments(
        methodFilter || undefined,
        statusFilter || undefined
      );
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilter = () => {
    setMethodFilter("");
    setStatusFilter("");
    loadPayments();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý thanh toán</h1>
          <p className="text-sm text-slate-600">Theo dõi và quản lý các giao dịch thanh toán</p>
        </div>
        <Button variant="outline" onClick={loadPayments} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Phương thức</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethodType | "")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="COD">COD</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "")}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Đang chờ</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILED">Thất bại</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleFilter} size="sm">
            Lọc
          </Button>
          <Button onClick={handleResetFilter} size="sm" variant="outline">
            Đặt lại
          </Button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Mã thanh toán</th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Cửa hàng</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Phương thức</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-600">{payment.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${payment.orderId}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {payment.orderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{payment.storeCode}</p>
                      <p className="text-xs text-slate-500">{payment.storeName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.customerName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {PAYMENT_METHOD_TYPE_LABELS[payment.method]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${PAYMENT_STATUS_COLORS[payment.status]}`}
                    >
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(payment.createDate).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}/${payment.id}`}
                    >
                      <Button size="sm" variant="outline">
                        Chi tiết
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Không có thanh toán
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentListPage;
