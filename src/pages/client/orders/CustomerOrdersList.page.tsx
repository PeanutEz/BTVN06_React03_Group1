// KAN-87: Customer Orders List
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Tag, DatePicker, Select, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { type Dayjs } from "dayjs";
import { getCustomerOrders } from "../../../services/mockApi";
import { CURRENT_CUSTOMER_ID } from "../../../mocks/data";
import type { OrderWithRelations, OrderStatus } from "../../../types/models";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../types/models";

const { RangePicker } = DatePicker;

export default function CustomerOrdersListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", CURRENT_CUSTOMER_ID, statusFilter, dateRange],
    queryFn: () =>
      getCustomerOrders(CURRENT_CUSTOMER_ID, {
        status: statusFilter,
        dateFrom: dateRange[0]?.toISOString(),
        dateTo: dateRange[1]?.toISOString(),
      }),
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

  const handleReset = () => {
    setStatusFilter(undefined);
    setDateRange([null, null]);
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
        <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
        <p className="text-gray-600 mt-1">Xem lịch sử đơn hàng của bạn</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái
          </label>
          <Select
            placeholder="Tất cả trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            className="w-full"
            options={[
              { label: ORDER_STATUS_LABELS.DRAFT, value: "DRAFT" },
              { label: ORDER_STATUS_LABELS.CONFIRMED, value: "CONFIRMED" },
              { label: ORDER_STATUS_LABELS.PREPARING, value: "PREPARING" },
              { label: ORDER_STATUS_LABELS.COMPLETED, value: "COMPLETED" },
              { label: ORDER_STATUS_LABELS.CANCELLED, value: "CANCELLED" },
            ]}
          />
        </div>
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khoảng thời gian
          </label>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
            className="w-full"
            format="DD/MM/YYYY"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleReset}>Đặt lại</Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 800 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
        }}
      />
    </div>
  );
}
