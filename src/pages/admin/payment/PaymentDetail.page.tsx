import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchOrderById } from "../../../services/order.service";
import {
  fetchPaymentById,
  refundPayment,
} from "../../../services/payment.service";
import { getFranchiseById } from "../../../services/store.service";
import { fetchCustomerById } from "../../../services/customer.service";
import { ROUTER_URL } from "../../../routes/router.const";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";
import type { Payment } from "../../../models/payment.model";
import { showError, showSuccess } from "../../../utils";

interface PaymentDetailContentProps {
  payment: Payment;
  onRefund?: (id: string) => void | Promise<void>;
}

function PaymentDetailContent({
  payment,
  onRefund,
}: PaymentDetailContentProps) {
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [franchise, setFranchise] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);

  useEffect(() => {
    if (!payment?.order_id) return;

    let cancelled = false;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(false);

        const [orderRes, franchiseRes] = await Promise.all([
          fetchOrderById(payment.order_id),
          payment.franchise_id
            ? getFranchiseById(payment.franchise_id)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setOrderDetail(orderRes);
        setFranchise(franchiseRes);

        if (orderRes?.customer_id) {
          const customerRes = await fetchCustomerById(orderRes.customer_id);
          if (!cancelled) setCustomer(customerRes);
        } else {
          setCustomer(null);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [payment]);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Chi tiết thanh toán</h1>
        <p className="mt-1 text-sm text-slate-500">Code: {payment.code}</p>
      </div>

      <div className="p-6">
        <div className="grid min-h-0 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Payment ID</p>
              <p className="font-semibold text-slate-900">{payment.id}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Order</p>
              <p className="font-semibold text-slate-900">{payment.order_id}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Chi nhánh</p>
              <p className="font-semibold text-slate-900">
                {franchise?.name || payment.franchise_id}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-1 text-xs text-slate-500">Khách hàng</p>
              <div className="flex justify-between gap-4">
                <p className="font-semibold text-slate-900">
                  {customer?.name || "---"}
                </p>
                <div className="text-right text-xs text-slate-500">
                  {customer?.email && <p>{customer.email}</p>}
                  {customer?.phone && <p>{customer.phone}</p>}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Phương thức</p>
              <p className="font-semibold text-slate-900">
                {PAYMENT_METHOD_TYPE_LABELS[payment.method]}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Trạng thái</p>
              <span
                className={`mt-1 inline-flex rounded border px-2 py-0.5 text-xs ${PAYMENT_STATUS_COLORS[payment.status]}`}
              >
                {PAYMENT_STATUS_LABELS[payment.status]}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Tổng tiền</p>
              <p className="font-semibold text-red-500">
                {formatCurrency(payment.amount)}
              </p>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Sản phẩm
            </h2>

            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500" />
                </div>
              ) : error ? (
                <p className="py-6 text-center text-sm text-red-500">
                  Không thể tải dữ liệu
                </p>
              ) : orderDetail?.items?.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Không có sản phẩm
                </p>
              ) : (
                <div className="space-y-3">
                  {orderDetail?.items?.map((item: any, index: number) => (
                    <div
                      key={`${item.order_item_id ?? item.id ?? "item"}-${index}`}
                      className="flex gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="h-14 w-14 rounded border object-cover"
                      />

                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-slate-500">x{item.quantity}</p>

                        {item.options?.length > 0 && (
                          <div className="mt-1 text-xs text-slate-400">
                            {item.options.map((opt: any, optionIndex: number) => (
                              <div key={`${opt.product_name}-${optionIndex}`}>
                                + {opt.product_name} x{opt.quantity}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-primary-600">
                        {formatCurrency(item.final_line_total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {onRefund && payment.status === "PAID" && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void onRefund(payment.id)}
              className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Hoàn tiền
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface PaymentDetailModalProps {
  payment: Payment;
  onClose: () => void;
  onRefund: (id: string) => void | Promise<void>;
}

export function PaymentDetailModal({
  payment,
  onClose,
  onRefund,
}: PaymentDetailModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-1.5 text-slate-500 shadow-sm hover:bg-white hover:text-slate-700"
          aria-label="Đóng"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
          <PaymentDetailContent payment={payment} onRefund={onRefund} />
        </div>
      </div>
    </div>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPayment = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchPaymentById(id);
        if (!cancelled) {
          setPayment(result);
        }
      } catch {
        if (!cancelled) {
          setPayment(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPayment();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRefund = async (paymentId: string) => {
    const reason = window.prompt("Nhập lý do hoàn tiền:");
    if (!reason) return;

    const refunded = await refundPayment(paymentId, reason);
    if (!refunded) {
      showError("Không thể hoàn tiền");
      return;
    }

    setPayment(refunded);
    showSuccess("Hoàn tiền thành công");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-4">
        <button
          onClick={() =>
            navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`)
          }
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Quay lại danh sách thanh toán
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">
            Không tìm thấy thanh toán
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() =>
          navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.PAYMENTS}`)
        }
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Quay lại danh sách thanh toán
      </button>

      <PaymentDetailContent payment={payment} onRefund={handleRefund} />
    </div>
  );
}
