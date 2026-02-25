// KAN-92: History
import { useQuery } from "@tanstack/react-query";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getLoyaltyHistory } from "../../../services/mockApi";
import { CURRENT_CUSTOMER_ID } from "../../../mocks/data";
import type { LoyaltyTransactionWithRelations, LoyaltyTransactionType } from "../../../types/models";
import {
  LOYALTY_TRANSACTION_TYPE_LABELS,
  LOYALTY_TRANSACTION_TYPE_COLORS,
} from "../../../types/models";

export default function HistoryPage() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["loyalty-history", CURRENT_CUSTOMER_ID],
    queryFn: () => getLoyaltyHistory(CURRENT_CUSTOMER_ID),
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const columns: ColumnsType<LoyaltyTransactionWithRelations> = [
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 150,
      render: (type: LoyaltyTransactionType) => (
        <Tag color={LOYALTY_TRANSACTION_TYPE_COLORS[type]}>
          {LOYALTY_TRANSACTION_TYPE_LABELS[type]}
        </Tag>
      ),
    },
    {
      title: "Điểm",
      dataIndex: "point_change",
      key: "point_change",
      width: 120,
      align: "right",
      render: (points) => (
        <span
          className={`font-semibold ${
            points > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {points > 0 ? "+" : ""}
          {points}
        </span>
      ),
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      render: (text) => <span className="text-gray-700">{text}</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date) => <span className="text-gray-600">{formatDate(date)}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử giao dịch điểm</h1>
        <p className="text-gray-600 mt-1">Xem tất cả các giao dịch điểm thưởng của bạn</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <Table
          columns={columns}
          dataSource={transactions}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} giao dịch`,
          }}
        />
      </div>
    </div>
  );
}
