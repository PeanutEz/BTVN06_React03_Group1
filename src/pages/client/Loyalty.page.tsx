import { useState } from "react";
import { mockCustomerFranchises } from "../../mock/customers.mock";
import { mockLoyaltyTransactions } from "../../mock/loyalty.mock";
import { LOYALTY_TIER_LABELS, LOYALTY_TIER_COLORS, type LoyaltyTier } from "../../models/customer.model";

const LoyaltyPage = () => {
  // Mock: Get first customer franchise for display
  const [selectedFranchiseId] = useState("FRANCHISE-001");
  const customerFranchise = mockCustomerFranchises.find((cf) => cf.franchise_id === selectedFranchiseId);

  // Get transactions for this customer franchise
  const transactions = customerFranchise
    ? mockLoyaltyTransactions.filter((t) => t.customer_franchise_id === customerFranchise.id)
    : [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  if (!customerFranchise) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-slate-500">Không tìm thấy thông tin tích điểm</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Chương trình tích điểm</h1>
          <p className="text-lg text-slate-600">Xem thông tin tích điểm và lịch sử giao dịch</p>
        </div>

        {/* Current Tier Card */}
        <div className="rounded-3xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="flex-shrink-0">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold ${LOYALTY_TIER_COLORS[customerFranchise.loyalty_tier]}`}
              >
                {customerFranchise.loyalty_tier === "SILVER" && "🥈"}
                {customerFranchise.loyalty_tier === "GOLD" && "🥇"}
                {customerFranchise.loyalty_tier === "PLATINUM" && "💎"}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="mb-4">
                <span
                  className={`inline-block rounded-full border px-4 py-2 text-sm font-semibold ${LOYALTY_TIER_COLORS[customerFranchise.loyalty_tier]}`}
                >
                  {LOYALTY_TIER_LABELS[customerFranchise.loyalty_tier]}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Điểm tích lũy của bạn</h2>
              <p className="text-5xl font-bold text-primary-600 mb-4">{customerFranchise.loyalty_point} điểm</p>
              {customerFranchise.first_order_at && (
                <p className="text-sm text-slate-600">
                  Đơn đầu tiên: {formatDate(customerFranchise.first_order_at)}
                </p>
              )}
              {customerFranchise.last_order_at && (
                <p className="text-sm text-slate-600">
                  Đơn gần nhất: {formatDate(customerFranchise.last_order_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tier Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div
            className={`rounded-2xl border-2 p-6 ${
              customerFranchise.loyalty_tier === "SILVER"
                ? "border-primary-300 bg-primary-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-4xl mb-4">🥈</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hạng Bạc</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tích điểm cơ bản</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Thông báo khuyến mãi</span>
              </li>
            </ul>
          </div>

          <div
            className={`rounded-2xl border-2 p-6 ${
              customerFranchise.loyalty_tier === "GOLD"
                ? "border-primary-300 bg-primary-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-4xl mb-4">🥇</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hạng Vàng</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tích điểm x1.5</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Giảm giá 5% mọi đơn</span>
              </li>
            </ul>
          </div>

          <div
            className={`rounded-2xl border-2 p-6 ${
              customerFranchise.loyalty_tier === "PLATINUM"
                ? "border-primary-300 bg-primary-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-4xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hạng Bạch Kim</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tích điểm x2</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Giảm giá 10% mọi đơn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Lịch sử giao dịch</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Điểm thay đổi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Lý do
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Đơn hàng
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            transaction.type === "EARN"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "REDEEM"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {transaction.type === "EARN" ? "Tích điểm" : transaction.type === "REDEEM" ? "Đổi điểm" : "Điều chỉnh"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-semibold ${
                            transaction.point_change > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.point_change > 0 ? "+" : ""}
                          {transaction.point_change}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{transaction.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {transaction.order_id ? `#${transaction.order_id}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyPage;
