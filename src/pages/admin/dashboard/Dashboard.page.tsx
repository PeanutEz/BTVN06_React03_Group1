import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ===================== DUMMY DATA ===================== */

const kpis = [
  { label: 'Tổng đơn hôm nay', value: 128 },
  { label: 'Doanh thu tháng', value: '352,100,000 ₫' },
  { label: 'Chi nhánh hoạt động', value: 98 },
  { label: 'Cảnh báo tồn kho', value: 6 },
];

const revenueData = [
  { date: '01/01', revenue: 12000000 },
  { date: '02/01', revenue: 18000000 },
  { date: '03/01', revenue: 15000000 },
  { date: '04/01', revenue: 22000000 },
  { date: '05/01', revenue: 26000000 },
  { date: '06/01', revenue: 21000000 },
];

const orderStatus = [
  { label: 'Chờ xác nhận', value: 42, color: 'bg-yellow-500' },
  { label: 'Đang pha chế', value: 31, color: 'bg-blue-500' },
  { label: 'Hoàn thành', value: 180, color: 'bg-green-500' },
  { label: 'Đã hủy', value: 12, color: 'bg-red-500' },
];

const recentOrders = [
  {
    id: 'CF1021',
    item: 'Cà phê sữa đá',
    branch: 'Chi nhánh Quận 1',
    status: 'Hoàn thành',
  },
  {
    id: 'CF1022',
    item: 'Trà đào cam sả',
    branch: 'Chi nhánh Quận 7',
    status: 'Đang pha',
  },
  {
    id: 'CF1023',
    item: 'Americano',
    branch: 'Chi nhánh Thủ Đức',
    status: 'Chờ xác nhận',
  },
  {
    id: 'CF1024',
    item: 'Bạc xỉu',
    branch: 'Chi nhánh Quận 1',
    status: 'Hoàn thành',
  },
  {
    id: 'CF1025',
    item: 'Bánh mì thịt',
    branch: 'Chi nhánh Quận 7',
    status: 'Đã hủy',
  },
];

const topProducts = [
  { name: 'Latte', sold: 1240, revenue: '62,000,000 ₫' },
  { name: 'Cappuccino', sold: 980, revenue: '48,500,000 ₫' },
  { name: 'Espresso', sold: 860, revenue: '39,200,000 ₫' },
];

const lowInventory = [
  { name: 'Hạt cà phê Arabica', quantity: 6 },
  { name: 'Sữa bột', quantity: 4 },
  { name: 'Ly giấy', quantity: 8 },
];

/* ===================== HELPERS ===================== */

const statusStyle = (status: string) => {
  switch (status) {
    case 'Hoàn thành':
      return 'bg-green-100 text-green-700';
    case 'Đang pha':
      return 'bg-blue-100 text-blue-700';
    case 'Chờ xác nhận':
      return 'bg-yellow-100 text-yellow-700';
    case 'Đã hủy':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

/* ===================== PAGE ===================== */

const DashboardPage = () => {
  return (
    <div className="space-y-8">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard Quản Trị Quán Cà Phê
        </h1>
        <p className="text-sm text-slate-600">
          Tổng quan hoạt động kinh doanh & vận hành hệ thống
        </p>
      </div>

      {/* ===== KPI ===== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ===== CHART + ORDER STATUS ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            Doanh thu theo ngày
          </h3>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            Đơn theo trạng thái
          </h3>

          <div className="space-y-3">
            {orderStatus.map((o) => (
              <div key={o.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{o.label}</span>
                  <span className="font-medium">{o.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-2 rounded-full ${o.color}`}
                    style={{ width: `${Math.min(o.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RECENT ORDERS ===== */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="text-lg font-semibold">
            Đơn hàng gần đây
          </h3>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-3 text-left">Mã đơn</th>
              <th className="px-6 py-3 text-left">Sản phẩm</th>
              <th className="px-6 py-3 text-left">Chi nhánh</th>
              <th className="px-6 py-3 text-left">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr
                key={o.id}
                className="border-t hover:bg-slate-50"
              >
                <td className="px-6 py-3 font-medium text-blue-600">
                  {o.id}
                </td>
                <td className="px-6 py-3">{o.item}</td>
                <td className="px-6 py-3">{o.branch}</td>
                <td className="px-6 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                      o.status
                    )}`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== TOP PRODUCT + INVENTORY ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">
            Top sản phẩm bán chạy
          </h3>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Sản phẩm</th>
                <th className="pb-2">Đã bán</th>
                <th className="pb-2">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name} className="border-b last:border-none">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2">{p.sold}</td>
                  <td className="py-2 text-emerald-600 font-semibold">
                    {p.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inventory Alert */}
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-red-600">
            Cảnh báo tồn kho thấp
          </h3>

          <ul className="space-y-2">
            {lowInventory.map((item) => (
              <li
                key={item.name}
                className="flex justify-between rounded-lg bg-red-50 p-3 text-sm"
              >
                <span className="font-medium">{item.name}</span>
                <span className="font-semibold text-red-600">
                  {item.quantity} đơn vị
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
