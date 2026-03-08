// KAN-91: Tier
import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getTierInfo } from "../../../services/mockApi";
import type { TierInfo, LoyaltyTier } from "../../../types/models";
import {
  LOYALTY_TIER_LABELS,
} from "../../../types/models";

export default function TierPage() {
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["tier-info"],
    queryFn: getTierInfo,
  });

  const columns: ColumnsType<TierInfo> = [
    {
      title: "Hạng",
      dataIndex: "tier",
      key: "tier",
      width: 150,
      render: (tier: LoyaltyTier) => (
        <Tag
          color={
            tier === "SILVER"
              ? "default"
              : tier === "GOLD"
                ? "gold"
                : "purple"
          }
          className="text-base px-3 py-1"
        >
          {LOYALTY_TIER_LABELS[tier]}
        </Tag>
      ),
    },
    {
      title: "Điều kiện",
      dataIndex: "condition",
      key: "condition",
      width: 200,
    },
    {
      title: "Khoảng điểm",
      key: "points_range",
      width: 200,
      render: (_, record) => {
        if (record.max_points !== undefined) {
          return `${record.min_points} - ${record.max_points} điểm`;
        }
        return `Từ ${record.min_points} điểm trở lên`;
      },
    },
    {
      title: "Quyền lợi",
      dataIndex: "benefits",
      key: "benefits",
      render: (benefits: string[]) => (
        <ul className="list-disc list-inside space-y-1">
          {benefits.map((benefit, index) => (
            <li key={index} className="text-gray-700">
              {benefit}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hệ thống hạng</h1>
        <p className="text-gray-600 mt-1">Thông tin về các hạng khách hàng thân thiết</p>
      </div>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={tiers}
          loading={isLoading}
          rowKey="tier"
          pagination={false}
        />
      </Card>

      <Card title="Cách tính điểm" className="shadow-sm">
        <div className="space-y-3 text-gray-700">
          <p>
            <strong>Quy tắc tích điểm:</strong> Bạn sẽ nhận được 1 điểm cho mỗi 10.000 VNĐ chi tiêu.
          </p>
          <p>
            <strong>Ví dụ:</strong> Nếu bạn mua hàng với tổng giá trị 150.000 VNĐ, bạn sẽ nhận được 15 điểm.
          </p>
          <p>
            <strong>Lưu ý:</strong> Điểm được tính dựa trên tổng giá trị đơn hàng sau khi hoàn thành.
          </p>
        </div>
      </Card>
    </div>
  );
}
