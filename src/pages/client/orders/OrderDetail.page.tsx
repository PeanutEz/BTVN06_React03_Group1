// KAN-88: Order Detail
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Tag, Button, Descriptions, Table, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { getOrderDetail } from "../../../services/mockApi";
import type { OrderItem } from "../../../types/models";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../types/models";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = id ? parseInt(id, 10) : 0;

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: !!orderId,
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

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: "Sản phẩm",
      dataIndex: "product_name_snapshot",
      key: "product_name_snapshot",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Giá",
      dataIndex: "price_snapshot",
      key: "price_snapshot",
      align: "right",
      width: 150,
      render: (price) => formatCurrency(price),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 100,
    },
    {
      title: "Thành tiền",
      dataIndex: "line_total",
      key: "line_total",
      align: "right",
      width: 150,
      render: (total) => (
        <span className="font-semibold">{formatCurrency(total)}</span>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
            <p className="text-gray-600 mt-1">Mã đơn: {order.code}</p>
          </div>
        </div>
        <Tag color={ORDER_STATUS_COLORS[order.status]} className="text-base px-4 py-1">
          {ORDER_STATUS_LABELS[order.status]}
        </Tag>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Info */}
        <Card title="Thông tin đơn hàng" className="shadow-sm">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Mã đơn">
              <span className="font-mono font-semibold">{order.code}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Loại đơn">
              <Tag color={order.type === "POS" ? "blue" : "green"}>
                {ORDER_TYPE_LABELS[order.type]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={ORDER_STATUS_COLORS[order.status]}>
                {ORDER_STATUS_LABELS[order.status]}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDate(order.created_at)}
            </Descriptions.Item>
            {order.confirmed_at && (
              <Descriptions.Item label="Ngày xác nhận">
                {formatDate(order.confirmed_at)}
              </Descriptions.Item>
            )}
            {order.completed_at && (
              <Descriptions.Item label="Ngày hoàn thành">
                {formatDate(order.completed_at)}
              </Descriptions.Item>
            )}
            {order.cancelled_at && (
              <Descriptions.Item label="Ngày hủy">
                {formatDate(order.cancelled_at)}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Customer Info */}
        <Card title="Thông tin khách hàng" className="shadow-sm">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Tên">
              {order.customer?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {order.customer?.phone || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {order.customer?.email || "N/A"}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      {/* Order Items */}
      <Card title="Danh sách sản phẩm" className="shadow-sm">
        <Table
          columns={itemColumns}
          dataSource={order.items}
          rowKey="id"
          pagination={false}
        />
        <Divider />
        <div className="flex justify-end">
          <div className="text-right space-y-2">
            <div className="text-lg">
              <span className="text-gray-600">Tổng cộng: </span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
