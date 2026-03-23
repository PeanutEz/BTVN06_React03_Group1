import { useEffect, useState } from "react";
import { fetchOrderById } from "../../../services/order.service";
import { getFranchiseById } from "../../../services/store.service";
import { fetchCustomerById } from "../../../services/customer.service";

import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";

import type { Payment } from "../../../models/payment.model";

function PaymentDetailModal({
  payment,
  onClose,
  onRefund,
}: {
  payment: Payment;
  onClose: () => void;
  onRefund: (id: string) => void;
}) {
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
          const cus = await fetchCustomerById(orderRes.customer_id);
          if (!cancelled) setCustomer(cus);
        }
      } catch (err) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[85vh] min-h-0 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>

        <div className="p-6 flex flex-col h-full min-h-0">

          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Chi tiết thanh toán
          </h2>

          <p className="text-xs text-slate-500 mb-4">
            Code: {payment.code}
          </p>

          {/* MAIN */}
          <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 h-full">

            {/* LEFT */}
            <div className="flex flex-col border-r pr-4 min-h-0 h-full">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0">

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Order</p>
                  <p className="font-semibold">{payment.order_id}</p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Chi nhánh</p>
                  <p className="font-semibold">
                    {franchise?.name || payment.franchise_id}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 mb-1">Khách hàng</p>
                  <div className="flex justify-between">
                    <p className="font-semibold">{customer?.name || "---"}</p>
                    <div className="text-right text-xs text-gray-500">
                      {customer?.email && <p>✉️ {customer.email}</p>}
                      {customer?.phone && <p>📞 {customer.phone}</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Phương thức</p>
                  <p className="font-semibold">
                    {PAYMENT_METHOD_TYPE_LABELS[payment.method]}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Trạng thái</p>
                  <span
                    className={`px-2 py-0.5 text-xs rounded border ${PAYMENT_STATUS_COLORS[payment.status]}`}
                  >
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </div>

              </div>
            </div>

            {/* RIGHT */}
            <div className="flex flex-col pl-4 min-h-0 h-full">

              <h3 className="text-sm font-semibold text-slate-700 mb-2 shrink-0">
                Sản phẩm
              </h3>

              {/* LIST */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4">

                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin h-8 w-8 border-b-2 border-primary-500 rounded-full" />
                  </div>
                ) : error ? (
                  <p className="text-center text-sm text-red-500 py-6">
                    Không thể tải dữ liệu
                  </p>
                ) : orderDetail?.items?.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-6">
                    Không có sản phẩm
                  </p>
                ) : (
                  orderDetail.items.map((item: any, index: number) => (
                    <div
                      key={`${item.order_item_id}-${index}`}
                      className="rounded-xl border p-3 flex gap-3"
                    >
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-14 h-14 rounded object-cover border"
                      />

                      <div className="flex-1">
                        <p className="font-semibold">{item.product_name}</p>

                        <p className="text-xs text-gray-500">
                          x{item.quantity}
                        </p>

                        {item.options?.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {item.options.map((opt: any, i: number) => (
                              <div key={i}>
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
                  ))
                )}
              </div>

              {/* TOTAL */}
              <div className="pt-3 text-sm">
                <div className="border-t my-2"></div>

                {orderDetail?.subtotal_amount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(orderDetail.subtotal_amount)}</span>
                  </div>
                )}

                {orderDetail?.promotion_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm KM</span>
                    <span>- {formatCurrency(orderDetail.promotion_discount)}</span>
                  </div>
                )}

                {orderDetail?.voucher_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Voucher</span>
                    <span>- {formatCurrency(orderDetail.voucher_discount)}</span>
                  </div>
                )}

                {orderDetail?.loyalty_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Điểm</span>
                    <span>- {formatCurrency(orderDetail.loyalty_discount)}</span>
                  </div>
                )}

                <div className="border-t my-2"></div>

                <div className="flex justify-between font-bold text-base">
                  <span>Tổng tiền</span>
                  <span className="text-red-500">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ACTION */}
          <div className="flex justify-end gap-3 mt-4">

            {payment.status === "PAID" && (
              <button
                onClick={() => onRefund(payment.id)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Hoàn tiền
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Đóng
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default PaymentDetailModal;