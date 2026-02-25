// KAN-86: Orders (staff POS list)
import { useQuery } from "@tanstack/react-query";
import { Table, Tag, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { getOrders } from "../../services/mockApi";
import type { OrderWithRelations, OrderType, OrderStatus } from "../../types/models";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../types/models";

export default function OrdersListPage() {
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const columns: ColumnsType<OrderWithRelations> = [
    {
      title: "Mã đơn",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (text) => <span className="font-mono font-semibold">{text}</span>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 200,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.customer?.name || "N/A"}</div>
          <div className="text-sm text-gray-500">{record.customer?.phone || ""}</div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type: OrderType) => (
        <Tag color={type === "POS" ? "blue" : "green"}>
          {ORDER_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: OrderStatus) => (
        <Tag color={ORDER_STATUS_COLORS[status]}>
          {ORDER_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 150,
      align: "right",
      render: (amount) => (
        <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date) => <span className="text-gray-600">{formatDate(date)}</span>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/orders/${record.id}`)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Danh sách đơn hàng</h1>
        <p className="text-gray-600 mt-1">Quản lý tất cả đơn hàng POS và Online</p>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
        }}
      />
    </div>
  );
}
