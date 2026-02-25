import { useState } from "react";

interface OrderItem { name: string; qty: number; price: number; }
interface MockOrder {
  id: string; code: string; date: string;
  status: "CONFIRMED" | "PREPARING" | "COMPLETED" | "CANCELLED";
  total: number; items: OrderItem[];
}

const MOCK_ORDERS: MockOrder[] = [
  { id: "1", code: "WBS-260215-001", date: "2026-02-15T10:30:00Z", status: "COMPLETED", total: 125000,
    items: [{ name: "Cà Phê Sữa Đá", qty: 2, price: 35000 }, { name: "Bánh Mì Que Pate", qty: 1, price: 25000 }, { name: "Freeze Trà Xanh", qty: 1, price: 30000 }] },
  { id: "2", code: "WBS-260214-003", date: "2026-02-14T14:20:00Z", status: "PREPARING", total: 89000,
    items: [{ name: "PhinDi Hạnh Nhân", qty: 1, price: 45000 }, { name: "Bánh Croissant", qty: 1, price: 44000 }] },
  { id: "3", code: "WBS-260213-007", date: "2026-02-13T09:15:00Z", status: "CONFIRMED", total: 210000,
    items: [{ name: "Cà Phê Phin Truyền Thống", qty: 3, price: 30000 }, { name: "Trà Đào Cam Sả", qty: 2, price: 45000 }] },
  { id: "4", code: "WBS-260210-012", date: "2026-02-10T16:45:00Z", status: "CANCELLED", total: 65000,
    items: [{ name: "Freeze Sô-cô-la", qty: 1, price: 65000 }] },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  PREPARING: { label: "Đang chuẩn bị", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function CustomerOrdersPage() {
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const orders = filter === "ALL" ? MOCK_ORDERS : MOCK_ORDERS.filter((o) => o.status === filter);

  return (
    <div>
      <h2 className="text-xl font-bold text-green-700 mb-6">Đơn hàng của bạn</h2>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "ALL", label: "Tất cả" },
          { key: "CONFIRMED", label: "Đã xác nhận" },
          { key: "PREPARING", label: "Đang chuẩn bị" },
          { key: "COMPLETED", label: "Hoàn thành" },
          { key: "CANCELLED", label: "Đã hủy" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key ? "bg-green-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
          <span className="mb-3 text-4xl">📭</span>
          <p className="text-gray-500">Chưa có đơn hàng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const st = STATUS_MAP[order.status];
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="rounded-lg border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">#{order.code}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{fmtDate(order.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{fmt(order.total)}</span>
                    <svg className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium uppercase text-gray-500">
                          <th className="pb-2">Sản phẩm</th>
                          <th className="pb-2 text-center">SL</th>
                          <th className="pb-2 text-right">Giá</th>
                          <th className="pb-2 text-right">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 text-gray-800">{item.name}</td>
                            <td className="py-2 text-center text-gray-600">{item.qty}</td>
                            <td className="py-2 text-right text-gray-600">{fmt(item.price)}</td>
                            <td className="py-2 text-right font-medium text-gray-800">{fmt(item.price * item.qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-300">
                          <td colSpan={3} className="pt-3 text-right font-medium text-gray-700">Tổng cộng</td>
                          <td className="pt-3 text-right font-bold text-gray-900">{fmt(order.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
