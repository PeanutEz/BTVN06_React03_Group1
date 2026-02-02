import { useEffect, useState } from "react";
import { Button } from "../../../components";
import type { LoyaltyRule, LoyaltyHistory, LoyaltyOverview } from "../../../models/loyalty.model";
import { LOYALTY_TIER_LABELS } from "../../../models/customer.model";
import {
  fetchLoyaltyRule,
  updateLoyaltyRule,
  fetchLoyaltyHistory,
  fetchLoyaltyOverview,
} from "../../../services/loyalty.service";
import { showSuccess, showError } from "../../../utils";

const LoyaltyManagementPage = () => {
  const [rule, setRule] = useState<LoyaltyRule | null>(null);
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [history, setHistory] = useState<LoyaltyHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ruleData, overviewData, historyData] = await Promise.all([
        fetchLoyaltyRule(),
        fetchLoyaltyOverview(),
        fetchLoyaltyHistory(),
      ]);
      setRule(ruleData);
      setOverview(overviewData);
      setHistory(historyData);
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
    const newTierRules = [...editingRule.tierRules];
    newTierRules[tierIndex] = {
      ...newTierRules[tierIndex],
      [field]: value,
    };
    setEditingRule({
      ...editingRule,
      tierRules: newTierRules,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý chương trình thành viên</h1>
          <p className="text-sm text-slate-600">Cấu hình quy tắc tích điểm và hạng thành viên</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} loading={loading}>
            Làm mới
          </Button>
          <Button onClick={handleOpenRuleModal}>Chỉnh sửa quy tắc</Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-primary-50 to-primary-100 p-6 shadow-sm">
            <p className="text-sm font-semibold text-primary-700">Tổng khách hàng</p>
            <p className="mt-2 text-3xl font-bold text-primary-900">
              {formatNumber(overview.totalCustomers)}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-sm">
            <p className="text-sm font-semibold text-orange-700">Hạng Đồng</p>
            <p className="mt-2 text-3xl font-bold text-orange-900">
              {formatNumber(overview.customersByTier.BRONZE)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Hạng Bạc</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(overview.customersByTier.SILVER)}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 shadow-sm">
            <p className="text-sm font-semibold text-yellow-700">Hạng Vàng</p>
            <p className="mt-2 text-3xl font-bold text-yellow-900">
              {formatNumber(overview.customersByTier.GOLD)}
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
              {formatNumber(1 / rule.pointsPerAmount)} VNĐ
            </p>
            <p className="mt-1 text-xs text-slate-600">
              (Ví dụ: Đơn hàng 100,000 VNĐ = {Math.floor(100000 * rule.pointsPerAmount)} điểm)
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {rule.tierRules.map((tierRule) => (
              <div
                key={tierRule.tier}
                className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {LOYALTY_TIER_LABELS[tierRule.tier]}
                </h3>
                <p className="mb-3 text-sm text-slate-600">
                  Yêu cầu: <span className="font-semibold">{formatNumber(tierRule.minPoints)}</span> điểm
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
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Điểm thay đổi</th>
                <th className="px-4 py-3">Điểm trước</th>
                <th className="px-4 py-3">Điểm sau</th>
                <th className="px-4 py-3">Hạng thay đổi</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{item.customerName}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.orderId && (
                      <span className="font-semibold text-primary-600">{item.orderId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${item.pointsChange > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {item.pointsChange > 0 ? "+" : ""}
                      {formatNumber(item.pointsChange)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatNumber(item.previousPoints)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatNumber(item.newPoints)}
                  </td>
                  <td className="px-4 py-3">
                    {item.previousTier && item.newTier && item.previousTier !== item.newTier ? (
                      <span className="text-xs">
                        <span className="text-slate-600">{LOYALTY_TIER_LABELS[item.previousTier]}</span>
                        {" → "}
                        <span className="font-semibold text-green-600">
                          {LOYALTY_TIER_LABELS[item.newTier]}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.reason}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(item.createDate).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
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
          <div className="my-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Chỉnh sửa quy tắc tích điểm</h2>
            
            <div className="space-y-6">
              {/* Points Per Amount */}
              <div className="rounded-lg bg-slate-50 p-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Tỷ lệ tích điểm
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">1 điểm cho mỗi</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={1 / editingRule.pointsPerAmount}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        pointsPerAmount: 1 / Number(e.target.value),
                      })
                    }
                    className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <span className="text-sm text-slate-600">VNĐ</span>
                </div>
              </div>

              {/* Tier Rules */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">Cấu hình hạng thành viên</h3>
                {editingRule.tierRules.map((tierRule, index) => (
                  <div key={tierRule.tier} className="rounded-xl border-2 border-slate-200 p-4">
                    <h4 className="mb-3 text-base font-bold text-slate-900">
                      {LOYALTY_TIER_LABELS[tierRule.tier]}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                          Điểm tối thiểu
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tierRule.minPoints}
                          onChange={(e) =>
                            handleUpdateTierRule(index, "minPoints", Number(e.target.value))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700">
                          Quyền lợi (mỗi dòng 1 quyền lợi)
                        </label>
                        <textarea
                          rows={3}
                          value={tierRule.benefits.join("\n")}
                          onChange={(e) =>
                            handleUpdateTierRule(
                              index,
                              "benefits",
                              e.target.value.split("\n").filter((b) => b.trim())
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveRule}
                  loading={loading}
                  disabled={loading}
                  className="flex-1"
                >
                  Lưu thay đổi
                </Button>
                <Button
                  onClick={() => setShowRuleModal(false)}
                  variant="outline"
                  disabled={loading}
                  className="flex-1"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyManagementPage;
