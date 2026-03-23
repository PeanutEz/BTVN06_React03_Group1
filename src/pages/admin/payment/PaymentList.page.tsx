import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, GlassSelect } from "../../../components";
import type { Payment, PaymentStatus, PaymentMethodType } from "../../../models/payment.model";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";
import { fetchPayments, filterPayments } from "../../../services/payment.service";
import { ROUTER_URL } from "../../../routes/router.const";
import Pagination from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

const PaymentListPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState<PaymentMethodType | "">("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("")
  const [currentPage, setCurrentPage] = useState(1);
  const hasRun = useRef(false);

  const loadPayments = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const data = await fetchPayments();
      setPayments(data);
    } catch (error) {
      console.error("Lỗi tải danh sách thanh toán:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
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
    } catch (error) {
      console.error("Lỗi lọc thanh toán:", error);
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

  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý thanh toán</h1>
          <p className="text-xs sm:text-sm text-slate-600">Theo dõi và quản lý các giao dịch thanh toán</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Phương thức</label>
            <GlassSelect
              value={methodFilter}
              onChange={(v) => setMethodFilter(v as PaymentMethodType | "")}
              className="w-full"
              options={[
                { value: "", label: "Tất cả" },
                { value: "POS", label: "Tại quầy (POS)" },
                { value: "ONLINE", label: "Online" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Trạng thái</label>
            <GlassSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as PaymentStatus | "")}
              className="w-full"
              options={[
                { value: "", label: "Tất cả" },
                { value: "PENDING", label: "Chờ thanh toán" },
                { value: "DRAFT", label: "Chưa thanh toán" },
                { value: "CONFIRMED", label: "Đã xác nhận" },
                { value: "PREPARING", label: "Đang xử lý" },
                { value: "READY_FOR_PICKUP", label: "Sẵn sàng lấy hàng" },
                { value: "DELIVERING", label: "Đang giao hàng" },
                { value: "COMPLETED", label: "Thành công" },
                { value: "CANCELLED", label: "Đã hủy" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-primary-600">PT-{String(payment.id).padStart(4, '0')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.ORDERS}/${payment.order_id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {payment.order_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{payment.franchise_code || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{payment.franchise_name || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.customer_name || 'N/A'}</p>
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
                    {new Date(payment.created_at).toLocaleString("vi-VN")}
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
                  <td colSpan={9}>
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
            onPageChange={setCurrentPage}
            totalItems={payments.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentListPage;
