// KAN-89: Loyalty Dashboard
import { useQuery } from "@tanstack/react-query";
import { Card, Progress, Statistic, Row, Col, Tag } from "antd";
import { getLoyaltyDashboard } from "../../../services/mockApi";
import { CURRENT_CUSTOMER_ID } from "../../../mocks/data";
import {
  LOYALTY_TIER_LABELS,
} from "../../../types/models";

export default function LoyaltyDashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["loyalty-dashboard", CURRENT_CUSTOMER_ID],
    queryFn: () => getLoyaltyDashboard(CURRENT_CUSTOMER_ID),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!dashboard) {
    return <div className="p-6">Không tìm thấy dữ liệu</div>;
  }

  // Calculate progress percentage
  let progressPercent = 100;
  if (dashboard.next_tier && dashboard.points_to_next_tier !== undefined) {
    const currentTierMinPoints =
      dashboard.tier === "SILVER" ? 0 : dashboard.tier === "GOLD" ? 500 : 2000;
    const nextTierMinPoints =
      dashboard.next_tier === "GOLD" ? 500 : dashboard.next_tier === "PLATINUM" ? 2000 : 0;
    const pointsInCurrentTier = dashboard.total_points - currentTierMinPoints;
    const pointsNeededForNextTier = nextTierMinPoints - currentTierMinPoints;
    progressPercent = Math.min(100, Math.max(0, (pointsInCurrentTier / pointsNeededForNextTier) * 100));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển điểm thưởng</h1>
        <p className="text-gray-600 mt-1">Tổng quan về chương trình khách hàng thân thiết</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng điểm"
              value={dashboard.total_points}
              suffix="điểm"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Hạng"
              value={LOYALTY_TIER_LABELS[dashboard.tier]}
              prefix={
                <Tag
                  color={
                    dashboard.tier === "SILVER"
                      ? "default"
                      : dashboard.tier === "GOLD"
                        ? "gold"
                        : "purple"
                  }
                >
                  {dashboard.tier}
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng đơn hàng"
              value={dashboard.total_orders}
              suffix="đơn"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng chi tiêu"
              value={dashboard.total_spending}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      {dashboard.next_tier && dashboard.points_to_next_tier !== undefined && (
        <Card title="Tiến độ lên hạng tiếp theo" className="shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">
                  Hạng hiện tại: <Tag>{LOYALTY_TIER_LABELS[dashboard.tier]}</Tag>
                </p>
                <p className="text-gray-600 mt-1">
                  Hạng tiếp theo: <Tag color="gold">{LOYALTY_TIER_LABELS[dashboard.next_tier]}</Tag>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {dashboard.points_to_next_tier}
                </p>
                <p className="text-sm text-gray-500">điểm còn lại</p>
              </div>
            </div>
            <Progress
              percent={progressPercent}
              strokeColor={{
                "0%": "#108ee9",
                "100%": "#87d068",
              }}
              format={() => `${dashboard.points_to_next_tier} điểm`}
            />
          </div>
        </Card>
      )}

      {!dashboard.next_tier && (
        <Card className="shadow-sm">
          <div className="text-center py-4">
            <Tag color="purple" className="text-lg px-4 py-2">
              Bạn đã đạt hạng cao nhất!
            </Tag>
            <p className="text-gray-600 mt-2">
              Chúc mừng bạn đã đạt hạng {LOYALTY_TIER_LABELS[dashboard.tier]}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
