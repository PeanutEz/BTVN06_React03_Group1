import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useManagerFranchiseId } from "@/hooks/useManagerFranchiseId";
import { ROUTER_URL } from "@/routes/router.const";
import { clientService } from "@/services/client.service";
import { paymentClient, type PaymentData } from "@/services/payment.client";
import { useLoadingStore } from "@/store/loading.store";
import { OrderDetailModal } from "../order/OrderDetail.page";

const TEXT = {
  noOrderCode: "Kh\u00f4ng c\u00f3 m\u00e3 \u0111\u01a1n",
  guestCustomer: "Kh\u00e1ch l\u1ebb",
  unpaid: "Ch\u01b0a thanh to\u00e1n",
  pending: "\u0110ang ch\u1edd",
  unknown: "Ch\u01b0a r\u00f5",
  reopeningPayment: "\u0110ang m\u1edf l\u1ea1i thanh to\u00e1n...",
  heroTitle: "Qu\u1ea3n l\u00fd \u0111\u01a1n h\u00e0ng ch\u01b0a thanh to\u00e1n",
  heroDescription:
    "\u0110\u00e2y l\u00e0 n\u01a1i \u0111\u1ec3 admin, manager v\u00e0 staff t\u00ecm l\u1ea1i c\u00e1c payment \u0111ang ch\u1edd x\u1eed l\u00fd. N\u1ebfu l\u1ee1 tay tho\u00e1t kh\u1ecfi m\u00e0n h\u00ecnh payment, b\u1ea1n c\u00f3 th\u1ec3 m\u1edf l\u1ea1i ngay v\u00e0 ti\u1ebfp t\u1ee5c thanh to\u00e1n m\u00e0 kh\u00f4ng b\u1ecb m\u1ea5t \u0111\u01a1n.",
  pendingCount: "\u0110\u01a1n \u0111ang ch\u1edd",
  updatedAt: "C\u1eadp nh\u1eadt l\u00fac",
  franchiseLabel: "Chi nh\u00e1nh",
  chooseBranch: "Ch\u1ecdn chi nh\u00e1nh",
  branchHint: "Ch\u1ecdn chi nh\u00e1nh \u0111\u1ec3 xem \u0111\u00fang danh s\u00e1ch payment ch\u01b0a thanh to\u00e1n.",
  quickSearch: "T\u00ecm nhanh",
  searchPlaceholder: "Nh\u1eadp m\u00e3 \u0111\u01a1n, m\u00e3 payment, t\u00ean kh\u00e1ch, s\u1ed1 \u0111i\u1ec7n tho\u1ea1i...",
  selectBranchEmpty: "Ch\u1ecdn chi nh\u00e1nh \u0111\u1ec3 xem c\u00e1c \u0111\u01a1n ch\u01b0a thanh to\u00e1n.",
  loadingList: "\u0110ang t\u1ea3i danh s\u00e1ch \u0111\u01a1n ch\u01b0a thanh to\u00e1n...",
  errorList: "Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch \u0111\u01a1n ch\u01b0a thanh to\u00e1n. H\u00e3y th\u1eed l\u00e0m m\u1edbi l\u1ea1i.",
  emptyList: "Kh\u00f4ng c\u00f3 \u0111\u01a1n ch\u01b0a thanh to\u00e1n n\u00e0o \u1edf chi nh\u00e1nh hi\u1ec7n t\u1ea1i.",
  cardEyebrow: "\u0110\u01a1n h\u00e0ng \u0111ang ch\u1edd x\u1eed l\u00fd",
  paymentCodeLabel: "M\u00e3 payment",
  customerLabel: "Kh\u00e1ch h\u00e0ng",
  createdAtLabel: "T\u1ea1o l\u00fac",
  totalAmountLabel: "T\u1ed5ng c\u1ea7n thanh to\u00e1n",
  resumeHint: "Ch\u1ecdn v\u00e0o \u0111\u00e2y \u0111\u1ec3 quay l\u1ea1i trang payment v\u00e0 ti\u1ebfp t\u1ee5c x\u1eed l\u00fd giao d\u1ecbch \u0111ang d\u1edf.",
  continuePayment: "Ti\u1ebfp t\u1ee5c thanh to\u00e1n",
} as const;

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const fmtDateTime = (value?: string) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function resolveRecordId(value: { _id?: unknown; id?: unknown } | null | undefined) {
  return String(value?._id ?? value?.id ?? "").trim();
}

function resolvePaymentField(payment: PaymentData, key: string) {
  const record = asRecord(payment);
  const rawValue = record?.[key];
  return rawValue == null ? "" : String(rawValue).trim();
}

function isPendingPaymentStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "PENDING" || normalized === "UNPAID";
}

function getPendingPaymentDisplayCode(payment: PaymentData) {
  return resolvePaymentField(payment, "order_code") || payment.code || TEXT.noOrderCode;
}

function getPendingPaymentCustomerName(payment: PaymentData) {
  return resolvePaymentField(payment, "customer_name") || TEXT.guestCustomer;
}

function getPendingPaymentStatusLabel(payment: PaymentData) {
  const normalized = String(payment.status ?? "").trim().toUpperCase();
  if (normalized === "UNPAID") return TEXT.unpaid;
  if (normalized === "PENDING") return TEXT.pending;
  return normalized || TEXT.unknown;
}

export default function PendingPaymentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showGlobalLoading = useLoadingStore((state) => state.show);
  const hideGlobalLoading = useLoadingStore((state) => state.hide);
  const managerFranchiseId = useManagerFranchiseId();
  const initialFranchiseId = searchParams.get("franchiseId")?.trim() ?? "";
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(managerFranchiseId ?? initialFranchiseId);
  const [keyword, setKeyword] = useState("");
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const initialPageLoadHandledRef = useRef(false);

  const franchisesQuery = useQuery({
    queryKey: ["pending-payments-page-franchises"],
    queryFn: () => clientService.getAllFranchises(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (managerFranchiseId) {
      setSelectedFranchiseId(managerFranchiseId);
      return;
    }

    if (!selectedFranchiseId && franchisesQuery.data?.length) {
      setSelectedFranchiseId(franchisesQuery.data[0].id);
    }
  }, [franchisesQuery.data, managerFranchiseId, selectedFranchiseId]);

  const pendingPaymentsQuery = useQuery({
    queryKey: ["pending-payments-page", selectedFranchiseId],
    queryFn: () => paymentClient.getPaymentsByFranchiseId(selectedFranchiseId),
    enabled: !!selectedFranchiseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15_000,
  });

  const isBootstrappingPage =
    franchisesQuery.isLoading ||
    (!!selectedFranchiseId && !pendingPaymentsQuery.isError && (pendingPaymentsQuery.isLoading || pendingPaymentsQuery.isFetching));

  useEffect(() => {
    if (initialPageLoadHandledRef.current) return;

    if (isBootstrappingPage) {
      showGlobalLoading("Đang tải trang payment...");
      return;
    }

    initialPageLoadHandledRef.current = true;
    hideGlobalLoading();
  }, [hideGlobalLoading, isBootstrappingPage, showGlobalLoading]);

  const pendingPayments = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return (pendingPaymentsQuery.data ?? [])
      .filter((payment) => isPendingPaymentStatus(payment.status))
      .filter((payment) => {
        if (!normalizedKeyword) return true;

        const haystacks = [
          getPendingPaymentDisplayCode(payment),
          String(payment.code ?? ""),
          getPendingPaymentCustomerName(payment),
          resolvePaymentField(payment, "customer_phone"),
        ];

        return haystacks.some((value) => value.toLowerCase().includes(normalizedKeyword));
      })
      .sort((left, right) => {
        const leftTime = new Date(String(left.created_at ?? left.updated_at ?? "")).getTime();
        const rightTime = new Date(String(right.created_at ?? right.updated_at ?? "")).getTime();
        return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      });
  }, [keyword, pendingPaymentsQuery.data]);

  const handleContinuePayment = (payment: PaymentData) => {
    const paymentId = resolveRecordId(payment);
    const orderId = String(payment.order_id ?? "").trim();
    const franchiseId = String(payment.franchise_id ?? selectedFranchiseId).trim();

    if (!paymentId || !franchiseId) return;

    const nextSearchParams = new URLSearchParams();
    nextSearchParams.set("resumePaymentId", paymentId);
    if (orderId) nextSearchParams.set("resumeOrderId", orderId);
    nextSearchParams.set("resumeFranchiseId", franchiseId);

    showGlobalLoading(TEXT.reopeningPayment);
    navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.STAFF_ORDER}?${nextSearchParams.toString()}`);
  };

  const updatedAtText = pendingPaymentsQuery.dataUpdatedAt
    ? fmtDateTime(new Date(pendingPaymentsQuery.dataUpdatedAt).toISOString())
    : "--";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[linear-gradient(135deg,rgba(28,27,31,0.98)_0%,rgba(41,35,33,0.95)_42%,rgba(84,52,24,0.9)_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.1),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#fff7ed] sm:text-4xl">{TEXT.heroTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e5d7c5]">{TEXT.heroDescription}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
            <div className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cbbba4]">{TEXT.pendingCount}</p>
              <p className="mt-2 text-3xl font-black text-[#fff7ed]">{pendingPayments.length}</p>
            </div>
            <div className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cbbba4]">{TEXT.updatedAt}</p>
              <p className="mt-2 text-sm font-semibold text-[#fff7ed]">{updatedAtText}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(35,33,38,0.94)_0%,rgba(25,23,28,0.98)_100%)] p-5 shadow-[0_18px_46px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#c7b79f]">{TEXT.franchiseLabel}</label>
            <select
              value={selectedFranchiseId}
              onChange={(event) => setSelectedFranchiseId(event.target.value)}
              disabled={!!managerFranchiseId || franchisesQuery.isLoading}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm font-semibold text-[#fff7ed] outline-none transition placeholder:text-[#c7b79f]/60 focus:border-amber-300 focus:ring-4 focus:ring-amber-200/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!managerFranchiseId && !selectedFranchiseId && <option value="">{TEXT.chooseBranch}</option>}
              {(franchisesQuery.data ?? []).map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
            {!managerFranchiseId ? <p className="mt-3 text-xs leading-5 text-[#bcae9d]">{TEXT.branchHint}</p> : null}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[#c7b79f]">{TEXT.quickSearch}</label>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={TEXT.searchPlaceholder}
              className="w-full rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm font-medium text-[#fff7ed] outline-none transition placeholder:text-[#c7b79f]/55 focus:border-amber-300 focus:ring-4 focus:ring-amber-200/20"
            />
          </div>
        </div>
      </section>

      {!selectedFranchiseId ? (
        <section className="rounded-[28px] border border-dashed border-white/12 bg-[rgba(28,27,31,0.82)] px-5 py-6 text-sm text-[#d9cdbf] backdrop-blur-md">
          {TEXT.selectBranchEmpty}
        </section>
      ) : pendingPaymentsQuery.isLoading ? (
        <section className="rounded-[28px] border border-white/10 bg-[rgba(28,27,31,0.88)] px-5 py-6 text-sm text-[#d9cdbf] backdrop-blur-md">
          {TEXT.loadingList}
        </section>
      ) : pendingPaymentsQuery.isError ? (
        <section className="rounded-[28px] border border-rose-300/20 bg-[linear-gradient(180deg,rgba(60,22,30,0.88)_0%,rgba(38,18,24,0.96)_100%)] px-5 py-6 text-sm text-rose-100 backdrop-blur-md">
          {TEXT.errorList}
        </section>
      ) : pendingPayments.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/12 bg-[rgba(28,27,31,0.82)] px-5 py-6 text-sm text-[#d9cdbf] backdrop-blur-md">
          {TEXT.emptyList}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {pendingPayments.map((payment) => {
            const paymentId = resolveRecordId(payment);
            const paymentCode = String(payment.code ?? paymentId).trim() || paymentId;

            return (
              <article
                key={paymentId || paymentCode}
                className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(33,31,35,0.96)_0%,rgba(22,21,25,0.98)_100%)] p-6 shadow-[0_22px_58px_rgba(15,23,42,0.22)] backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_68%)]" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c7b79f]">{TEXT.cardEyebrow}</p>
                    <h3 className="mt-3 break-words text-2xl font-black tracking-tight text-[#fff7ed]">
                      {getPendingPaymentDisplayCode(payment)}
                    </h3>
                    <p className="mt-2 text-sm text-[#d8ccb9]">
                      {TEXT.paymentCodeLabel}: {paymentCode}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                    {getPendingPaymentStatusLabel(payment)}
                  </span>
                </div>

                <div className="relative mt-5 grid gap-3 rounded-[24px] border border-white/8 bg-white/5 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b8aa98]">{TEXT.customerLabel}</p>
                    <p className="mt-1 text-base font-semibold text-[#fff7ed]">{getPendingPaymentCustomerName(payment)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b8aa98]">{TEXT.createdAtLabel}</p>
                    <p className="mt-1 text-base font-semibold text-[#fff7ed]">
                      {fmtDateTime(String(payment.created_at ?? ""))}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b8aa98]">{TEXT.totalAmountLabel}</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-amber-300">
                      {fmtCurrency(Number(payment.amount ?? 0))}
                    </p>
                  </div>
                </div>

                <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
                  <p className="max-w-[260px] text-xs leading-5 text-[#c8bba9]">{TEXT.resumeHint}</p>
                  <div className="flex items-center gap-2">
                    {payment.order_id && (
                      <button
                        type="button"
                        onClick={() => setViewingOrderId(String(payment.order_id))}
                        title="Xem chi tiết đơn hàng"
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 p-3 text-[#e5d7c5] transition hover:-translate-y-0.5 hover:bg-white/14"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleContinuePayment(payment)}
                      className="inline-flex items-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(245,158,11,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(245,158,11,0.36)]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-7-7 7 7-7 7" />
                      </svg>
                      {TEXT.continuePayment}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <OrderDetailModal
        orderId={viewingOrderId}
        onClose={() => setViewingOrderId(null)}
        variant="dialog"
      />
    </div>
  );
}
