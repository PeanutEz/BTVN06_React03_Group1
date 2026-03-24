import React, { useEffect, useRef, useState } from "react";
import { GlassSearchSelect } from "../../../components/ui";
import Pagination from "../../../components/ui/Pagination";

import {
  fetchPaymentsByCustomer,
  refundPayment,
} from "../../../services/payment.service";

import { fetchOrderById } from "../../../services/order.service";

import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_TYPE_LABELS,
} from "../../../models/payment.model";
import PaymentDetailModal from "./PaymentDetail.page";

import type { Payment } from "../../../models/payment.model";

import { searchCustomersPaged } from "../../../services/customer.service";
import { fetchFranchiseSelect } from "../../../services/store.service";

import { showSuccess, showError } from "../../../utils";

const ITEMS_PER_PAGE = 10;

const PaymentListPage = (): React.JSX.Element => {
  const [rawPayments, setRawPayments] = useState<Payment[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [setOrderDetail] = useState<any>(null);

  const [allCustomers, setAllCustomers] = useState<
    { id: string; name: string; email: string }[]
  >([]);

  const [franchises, setFranchises] = useState<
    { value: string; label: string }[]
  >([]);

  const initDoneRef = useRef(false);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n);

  // ===== LOAD INIT (CUSTOMER + FRANCHISE)
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    searchCustomersPaged({
      searchCondition: { keyword: "", is_active: "", is_deleted: false },
      pageInfo: { pageNum: 1, pageSize: 500 },
    })
      .then((res) => {
        setAllCustomers(
          res.pageData.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email ?? "",
          }))
        );
      })
      .catch(() => { });

    fetchFranchiseSelect()
      .then((res) => {
        setFranchises(
          res.map((f: any) => ({
            value: f.value,
            label: `${f.name} (${f.code})`,
          }))
        );
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!selectedPayment?.order_id) return;

    const loadOrder = async () => {
      try {
        const order = await fetchOrderById(selectedPayment.order_id);
        setOrderDetail(order);
      } catch (err) {
        console.error("Load order failed", err);
        setOrderDetail(null);
      }
    };

    loadOrder();
  }, [selectedPayment]);

  // ===== LOAD PAYMENT
  const loadPayments = async (customerId: string) => {
    setLoading(true);
    try {
      const data = await fetchPaymentsByCustomer(customerId);
      setRawPayments(data);
    } catch {
      setRawPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage(1);

    if (!customerId) {
      setRawPayments([]);
      return;
    }

    loadPayments(customerId);
  };

  const handleReset = () => {
    setSelectedCustomerId("");
    setSelectedFranchiseId("");
    setStatusFilter("");
    setMethodFilter("");
    setRawPayments([]);
    setCurrentPage(1);
  };

  const handleRefund = async (id: string) => {
    const reason = prompt("Nhập lý do hoàn tiền:");
    if (!reason) return;

    try {
      await refundPayment(id, reason);
      showSuccess("Hoàn tiền thành công");

      if (selectedCustomerId) loadPayments(selectedCustomerId);
    } catch {
      showError("Không thể hoàn tiền");
    }
  };

  // ===== FILTER (🔥 FIX CHÍNH Ở ĐÂY)
  const filteredPayments = rawPayments.filter((p) => {
    if (selectedFranchiseId && p.franchise_id !== selectedFranchiseId)
      return false;

    if (statusFilter && p.status !== statusFilter) return false;

    if (methodFilter && p.method !== methodFilter) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ===== OPTIONS
  const customerOptions = allCustomers.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const franchiseMap = Object.fromEntries(
    franchises.map((f) => [f.value, f.label])
  );

  const methodOptions = Object.entries(PAYMENT_METHOD_TYPE_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  const statusOptions = Object.entries(PAYMENT_STATUS_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  const showTable = !!selectedCustomerId || loading;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Quản lý thanh toán
        </h1>
        <p className="text-sm text-slate-600">
          Xem và xử lý thanh toán
        </p>

      </div>

      {/* FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Customer */}
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Khách hàng
            </label>
            <GlassSearchSelect
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              options={customerOptions}
              placeholder="-- Chọn khách hàng --"
              searchPlaceholder="Tìm theo tên..."
              allLabel="-- Tất cả --"
            />
          </div>

          {/* Franchise */}
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chi nhánh
            </label>
            <GlassSearchSelect
              value={selectedFranchiseId}
              onChange={(v) => {
                setSelectedFranchiseId(v);
                setCurrentPage(1);
              }}
              options={franchises}
              placeholder="-- Tất cả --"
              searchPlaceholder="Tìm chi nhánh..."
              allLabel="-- Tất cả --"
            />
          </div>

          {/* Status */}
          <div className="min-w-[180px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trạng thái
            </label>
            <GlassSearchSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              options={statusOptions}
              placeholder="-- Tất cả --"
              searchPlaceholder="Tìm trạng thái..."
              allLabel="-- Tất cả --"
            />
          </div>

          {/* Method */}
          <div className="min-w-[180px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phương thức
            </label>
            <GlassSearchSelect
              value={methodFilter}
              onChange={(v) => {
                setMethodFilter(v);
                setCurrentPage(1);
              }}
              options={methodOptions}
              placeholder="-- Tất cả --"
              searchPlaceholder="Tìm phương thức..."
              allLabel="-- Tất cả --"
            />
          </div>

          {/* Reset */}
          <div className="space-y-1.5">
            <label className="invisible block text-xs">&nbsp;</label>
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>

        {/* COUNT */}
        {selectedCustomerId && (
          <p className="mt-3 text-xs text-slate-400">
            Hiển thị{" "}
            <span className="font-semibold text-slate-600">
              {filteredPayments.length}
            </span>{" "}
            thanh toán
            {rawPayments.length !== filteredPayments.length &&
              ` (lọc từ ${rawPayments.length})`}
          </p>
        )}
      </div>

      {/* EMPTY */}
      {!showTable && (
        <div className="text-center py-10 text-gray-400">
          Chọn khách hàng để xem thanh toán
        </div>
      )}

      {/* TABLE */}
      {showTable && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Phương thức</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
                      </div>
                    </td>
                  </tr>
                ) : paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">
                        {p.code}
                      </td>

                      <td className="px-4 py-3">{p.order_id}</td>

                      <td className="px-4 py-3">
                        {franchiseMap[p.franchise_id] || p.franchise_id}
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(p.amount)}
                      </td>

                      <td className="px-4 py-3">
                        {PAYMENT_METHOD_TYPE_LABELS[p.method]}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded border ${PAYMENT_STATUS_COLORS[p.status]}`}
                        >
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">

                          {/* 👁 Xem chi tiết */}
                          <button
                            onClick={() => setSelectedPayment(p)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                            title="Xem chi tiết"
                          >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPayments.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        </div>

      )}
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefund={handleRefund}
        />
      )}
    </div>
  );
};

export default PaymentListPage;