import { useEffect, useState } from "react";
import { Button } from "../../../components";
import type { LoyaltyRule, LoyaltyOverview } from "../../../models/loyalty.model";
import { LOYALTY_TIER_LABELS } from "../../../models/customer.model";
import {
  fetchLoyaltyRule,
  updateLoyaltyRule,
  fetchLoyaltyTransactionsWithDetails,
  fetchLoyaltyOverview,
} from "../../../services/loyalty.service";
import { showSuccess, showError } from "../../../utils";

const LoyaltyManagementPage = () => {
  const [rule, setRule] = useState<LoyaltyRule | null>(null);
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ruleData, overviewData, historyData] = await Promise.all([
        fetchLoyaltyRule(),
        fetchLoyaltyOverview(),
        fetchLoyaltyTransactionsWithDetails(),
      ]);
      setRule(ruleData);
      setOverview(overviewData);
      setHistory(historyData);
    } catch (error) {
      console.error("Lỗi tải dữ liệu loyalty:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRuleModal = () => {
    if (rule) {
      setEditingRule({ ...rule });
      setShowRuleModal(true);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    if (!confirm("Bạn có chắc muốn thay đổi quy tắc tích điểm? Điều này sẽ ảnh hưởng đến tất cả khách hàng.")) {
      return;
    }

    setLoading(true);
    try {
      const updated = await updateLoyaltyRule(editingRule);
      setRule(updated);
      showSuccess("Cập nhật quy tắc thành công");
      setShowRuleModal(false);
    } catch (error) {
      showError("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTierRule = (tierIndex: number, field: string, value: any) => {
    if (!editingRule) return;
    const newTierRules = [...editingRule.tier_rules];
    newTierRules[tierIndex] = {
      ...newTierRules[tierIndex],
      [field]: value,
    };
    setEditingRule({
      ...editingRule,
      tier_rules: newTierRules,
    });
  };

  const formatNumber = (num: number) => num.toLocaleString("vi-VN");

  if (loading && !rule) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Quản lý chương trình thành viên</h1>
          <p className="text-xs sm:text-sm text-slate-600">Cấu hình quy tắc tích điểm và hạng thành viên</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadData} loading={loading}>
            Làm mới
          </Button>
          <Button onClick={handleOpenRuleModal}>Chỉnh sửa quy tắc</Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-primary-50 to-primary-100 p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-primary-700">Tổng khách hàng</p>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-primary-900">
              {formatNumber(overview.total_customers)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-gray-700">Hạng Bạc</p>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(overview.customers_by_tier.SILVER)}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-yellow-700">Hạng Vàng</p>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-yellow-900">
              {formatNumber(overview.customers_by_tier.GOLD)}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 sm:p-6 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-cyan-700">Hạng Bạch Kim</p>
            <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-cyan-900">
              {formatNumber(overview.customers_by_tier.PLATINUM)}
            </p>
          </div>
        </div>
      )}

      {/* Current Rules */}
      {rule && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Quy tắc tích điểm hiện tại</h2>
          <div className="mb-6 rounded-lg bg-primary-50 p-4">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Tỷ lệ tích điểm:</span> 1 điểm cho mỗi{" "}
              {formatNumber(1 / rule.points_per_amount)} VNĐ
            </p>
            <p className="mt-1 text-xs text-slate-600">
              (Ví dụ: Đơn hàng 100,000 VNĐ = {Math.floor(100000 * rule.points_per_amount)} điểm)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {rule.tier_rules.map((tierRule) => (
              <div
                key={tierRule.tier}
                className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {LOYALTY_TIER_LABELS[tierRule.tier]}
                </h3>
                <p className="mb-3 text-sm text-slate-600">
                  Yêu cầu: <span className="font-semibold">{formatNumber(tierRule.min_points)}</span> điểm
                </p>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Quyền lợi:</p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {tierRule.benefits.map((benefit, idx) => (
                      <li key={idx}>• {benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử tích điểm</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Franchise</th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Điểm thay đổi</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{item.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{item.franchise_code || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{item.franchise_name || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.order_code ? (
                      <span className="font-semibold text-primary-600">{item.order_code}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        item.type === "EARN"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : item.type === "REDEEM"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {item.type === "EARN" ? "Tích" : item.type === "REDEEM" ? "Đổi" : "Điều chỉnh"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${item.point_change > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {item.point_change > 0 ? "+" : ""}
                      {formatNumber(item.point_change)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.reason}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Chưa có lịch sử tích điểm
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule Edit Modal */}
      {showRuleModal && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-full sm:max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-6 rounded-t-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Chỉnh sửa quy tắc tích điểm</h2>
              <p className="mt-1 text-sm text-slate-600">Cấu hình tỷ lệ tích điểm và hạng thành viên</p>
            </div>
            
            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
              {/* Points Per Amount */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary-600 text-white flex-shrink-0">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2">
                      Tỷ lệ tích điểm cơ bản
                    </label>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-sm font-semibold text-slate-700">Khách hàng nhận</span>
                      <span className="text-2xl font-bold text-primary-600">1 điểm</span>
                      <span className="text-sm font-semibold text-slate-700">cho mỗi</span>
                      <input
                        type="number"
                        min="1"
                        step="1000"
                        value={1 / editingRule.points_per_amount}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            points_per_amount: 1 / Number(e.target.value),
                          })
                        }
                        className="w-40 rounded-lg border border-slate-300 bg-white px-4 py-2 text-lg font-bold text-primary-600 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      />
                      <span className="text-2xl font-bold text-slate-700">VNĐ</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 bg-white rounded-lg px-4 py-2 border border-slate-200">
                      💡 <span className="font-semibold">Ví dụ:</span> Đơn hàng{" "}
                      <span className="font-bold text-primary-600">100.000 VNĐ</span> ={" "}
                      <span className="font-bold text-green-600">
                        {Math.floor(100000 * editingRule.points_per_amount)} điểm
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tier Rules */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-yellow-500 text-white flex-shrink-0">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Cấu hình hạng thành viên</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {editingRule.tier_rules.map((tierRule, index) => {
                    const tierColors = {
                      SILVER: { border: "border-slate-200", bg: "bg-slate-50", badge: "bg-slate-200 text-slate-700" },
                      GOLD: { border: "border-yellow-200", bg: "bg-yellow-50", badge: "bg-yellow-200 text-yellow-800" },
                      PLATINUM: { border: "border-cyan-200", bg: "bg-cyan-50", badge: "bg-cyan-200 text-cyan-800" },
                    };
                    const colors = tierColors[tierRule.tier as keyof typeof tierColors];
                    
                    return (
                      <div key={tierRule.tier} className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
                        <div className={`inline-block rounded-full ${colors.badge} px-4 py-1.5 text-sm font-bold mb-4`}>
                          {LOYALTY_TIER_LABELS[tierRule.tier]}
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                              Điểm tối thiểu
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={tierRule.min_points}
                              onChange={(e) =>
                                handleUpdateTierRule(index, "min_points", Number(e.target.value))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base font-bold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            />
                          </div>
                          
                          <div>
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                              Quyền lợi
                            </label>
                            <textarea
                              rows={4}
                              placeholder="Nhập mỗi quyền lợi trên 1 dòng..."
                              value={tierRule.benefits.join("\n")}
                              onChange={(e) =>
                                handleUpdateTierRule(
                                  index,
                                  "benefits",
                                  e.target.value.split("\n").filter((b) => b.trim())
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            />
                            <p className="mt-1 text-xs text-slate-500">Mỗi dòng 1 quyền lợi</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-6 rounded-b-2xl flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={() => setShowRuleModal(false)}
                variant="outline"
                disabled={loading}
                className="flex-1 py-3 text-base font-semibold"
              >
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSaveRule}
                loading={loading}
                disabled={loading}
                className="flex-1 py-3 text-base font-semibold"
              >
                💾 Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyManagementPage;
