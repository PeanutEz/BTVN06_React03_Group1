// KAN-86: Staff Orders — API Get Orders for Staff by FranchiseID + Change Status Preparing / Ready for Pickup
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Tag, Button, Space, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { orderClient } from "../../services/order.client";
import { useAuthStore } from "../../store/auth.store";
import type { OrderDisplay, OrderStatus } from "../../models/order.model";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../models/order.model";
import { ROUTER_URL } from "../../routes/router.const";

export default function OrdersListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const franchiseIdFromAuth = (user?.roles as Array<{ franchise_id?: string | null }>)?.[0]?.franchise_id;
  const [franchiseId, setFranchiseId] = useState(franchiseIdFromAuth ?? "1");
  const [staffId] = useState((user?.user as { id?: string })?.id ?? "");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["staff-orders", franchiseId],
    queryFn: () => orderClient.getOrdersByFranchiseId(franchiseId),
  });

  const setPreparingMutation = useMutation({
    mutationFn: (orderId: string) => orderClient.setPreparing(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-orders", franchiseId] });
      message.success("Đã chuyển trạng thái Đang chuẩn bị");
    },
    onError: (e) => message.error(e instanceof Error ? e.message : "Lỗi"),
  });

  const setReadyMutation = useMutation({
    mutationFn: (orderId: string) =>
      orderClient.setReadyForPickup(orderId, staffId ? { staff_id: staffId } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-orders", franchiseId] });
      message.success("Đã chuyển trạng thái Sẵn sàng lấy hàng");
    },
    onError: (e) => message.error(e instanceof Error ? e.message : "Lỗi"),
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString("vi-VN");

  const columns: ColumnsType<OrderDisplay> = [
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
          <div className="text-sm text-gray-500">{record.customer?.phone ?? ""}</div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type: OrderDisplay["type"]) => (
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
        <Tag className={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 150,
      align: "right",
      render: (amount) => <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>,
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
      width: 220,
      fixed: "right",
      render: (_, record) => (
        <Space wrap>
          <Button type="link" onClick={() => navigate(`${ROUTER_URL.ORDER_DETAIL.replace(":id", String(record.id))}`)}>
            Xem chi tiết
          </Button>
          {record.status === "CONFIRMED" && (
            <Button
              type="link"
              size="small"
              loading={setPreparingMutation.isPending}
              onClick={() => setPreparingMutation.mutate(String(record.id))}
            >
              Đang chuẩn bị
            </Button>
          )}
          {record.status === "PREPARING" && (
            <Button
              type="link"
              size="small"
              loading={setReadyMutation.isPending}
              onClick={() => setReadyMutation.mutate(String(record.id))}
            >
              Sẵn sàng lấy hàng
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng theo cửa hàng (Staff)</h1>
          <p className="text-gray-600 mt-1">Get Orders for Staff by FranchiseID — Chuyển trạng thái Đang chuẩn bị / Sẵn sàng lấy hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Franchise ID:</label>
          <input
            type="text"
            value={franchiseId}
            onChange={(e) => setFranchiseId(e.target.value)}
            className="border rounded px-3 py-1.5 w-48 text-sm"
            placeholder="698eab0826ca2b18eb353384"
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={[...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
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
