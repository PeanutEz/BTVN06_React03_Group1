// KAN-89: Loyalty Dashboard
import { useQuery } from "@tanstack/react-query";
import { getLoyaltyDashboard } from "../../../services/mockApi";
import { CURRENT_CUSTOMER_ID } from "../../../mocks/data";
import { LOYALTY_TIER_LABELS } from "../../../types/models";

const tierColors: Record<string, { bg: string; text: string; border: string; ring: string; gradient: string }> = {
  SILVER: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", ring: "ring-gray-300", gradient: "from-gray-200 to-gray-400" },
  GOLD: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", ring: "ring-amber-300", gradient: "from-amber-300 to-amber-500" },
  PLATINUM: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", ring: "ring-purple-300", gradient: "from-purple-400 to-purple-600" },
};

export default function LoyaltyDashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["loyalty-dashboard", CURRENT_CUSTOMER_ID],
    queryFn: () => getLoyaltyDashboard(CURRENT_CUSTOMER_ID),
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Không tìm thấy dữ liệu</p>
      </div>
    );
  }

  const tc = tierColors[dashboard.tier] ?? tierColors.SILVER;

  // Progress calculation
  let progressPercent = 100;
  if (dashboard.next_tier && dashboard.points_to_next_tier !== undefined) {
    const currentMin = dashboard.tier === "SILVER" ? 0 : dashboard.tier === "GOLD" ? 500 : 2000;
    const nextMin = dashboard.next_tier === "GOLD" ? 500 : dashboard.next_tier === "PLATINUM" ? 2000 : 0;
    const range = nextMin - currentMin;
    progressPercent = range > 0 ? Math.min(100, Math.max(0, ((dashboard.total_points - currentMin) / range) * 100)) : 100;
  }

  const stats = [
    {
      label: "Tổng điểm",
      value: `${dashboard.total_points.toLocaleString("vi-VN")}`,
      suffix: "điểm",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      label: "Hạng thành viên",
      value: LOYALTY_TIER_LABELS[dashboard.tier],
      color: tc.text,
      bgColor: tc.bg,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
      ),
    },
    {
      label: "Tổng đơn hàng",
      value: `${dashboard.total_orders}`,
      suffix: "đơn",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      label: "Tổng chi tiêu",
      value: fmt(dashboard.total_spending),
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chương trình hội viên</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tổng quan về chương trình khách hàng thân thiết</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${s.bgColor} flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>
              {s.value}
              {s.suffix && <span className="text-sm font-normal text-gray-400 ml-1">{s.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Tier Progress */}
      {dashboard.next_tier && dashboard.points_to_next_tier !== undefined ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Tiến độ lên hạng</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Hạng hiện tại:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tc.bg} ${tc.text} border ${tc.border}`}>
                    {LOYALTY_TIER_LABELS[dashboard.tier]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Hạng tiếp theo:</span>
                  {(() => {
                    const ntc = tierColors[dashboard.next_tier] ?? tierColors.GOLD;
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ntc.bg} ${ntc.text} border ${ntc.border}`}>
                        {LOYALTY_TIER_LABELS[dashboard.next_tier]}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{dashboard.points_to_next_tier.toLocaleString("vi-VN")}</p>
                <p className="text-xs text-gray-400">điểm còn lại</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tc.gradient} transition-all duration-700 ease-out`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>{LOYALTY_TIER_LABELS[dashboard.tier]}</span>
                <span>{Math.round(progressPercent)}%</span>
                <span>{LOYALTY_TIER_LABELS[dashboard.next_tier]}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Max tier reached */
        <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 rounded-2xl border border-purple-200 p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-7.54 0" />
            </svg>
          </div>
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-purple-600 text-white mb-3">
            Hạng cao nhất
          </span>
          <p className="text-gray-600 text-sm">
            Chúc mừng bạn đã đạt hạng <strong className="text-purple-700">{LOYALTY_TIER_LABELS[dashboard.tier]}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
