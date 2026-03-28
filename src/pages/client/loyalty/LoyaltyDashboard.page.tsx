import { useQuery } from "@tanstack/react-query";
import { Card, Progress, Statistic, Row, Col, Tag } from "antd";
import { Link } from "react-router-dom";
import { ROUTER_URL } from "@/routes/router.const";
import { useDeliveryStore } from "@/store/delivery.store";
import { clientService, type LoyaltyRule } from "@/services/client.service";

function getTierLabel(tier?: string): string {
  const key = String(tier ?? "").toUpperCase();
  if (key === "BRONZE") return "Đồng";
  if (key === "SILVER") return "Bạc";
  if (key === "GOLD") return "Vàng";
  if (key === "PLATINUM") return "Bạch Kim";
  return "Chưa xác định";
}

function getTierColor(tier?: string): string {
  const key = String(tier ?? "").toUpperCase();
  if (key === "SILVER") return "default";
  if (key === "GOLD") return "gold";
  if (key === "PLATINUM") return "purple";
  return "blue";
}

function toLoyaltyRuleArray(input: unknown): LoyaltyRule[] {
  if (Array.isArray(input)) {
    return input as LoyaltyRule[];
  }

  if (input && typeof input === "object") {
    const boxed = input as Record<string, unknown>;
    if (Array.isArray(boxed.data)) return boxed.data as LoyaltyRule[];
    if (Array.isArray(boxed.items)) return boxed.items as LoyaltyRule[];
    if (Array.isArray(boxed.rules)) return boxed.rules as LoyaltyRule[];
    if ("tier_name" in boxed || "min_points" in boxed) return [boxed as unknown as LoyaltyRule];
  }

  return [];
}

function getNextTierByPoints(points: number, rules?: LoyaltyRule[] | unknown): { current: string; next?: string; currentMin: number; nextMin?: number } {
  const normalizedRules = toLoyaltyRuleArray(rules)
    .map((rule) => ({
      tier: String(rule.tier_name ?? "").toUpperCase(),
      min: Number(rule.min_points ?? 0),
    }))
    .filter((rule) => !!rule.tier)
    .sort((a, b) => a.min - b.min);

  const tierRules = normalizedRules.length > 0
    ? normalizedRules
    : [
      { tier: "BRONZE", min: 0 },
      { tier: "SILVER", min: 300 },
      { tier: "GOLD", min: 1000 },
      { tier: "PLATINUM", min: 2000 },
    ];

  let currentRule = tierRules[0];
  for (const rule of tierRules) {
    if (points >= rule.min) {
      currentRule = rule;
      continue;
    }
    break;
  }

  const currentIdx = tierRules.findIndex((rule) => rule.tier === currentRule.tier);
  const nextRule = currentIdx >= 0 ? tierRules[currentIdx + 1] : undefined;

  return {
    current: currentRule.tier,
    next: nextRule?.tier,
    currentMin: currentRule.min,
    nextMin: nextRule?.min,
  };
}

export default function LoyaltyDashboardPage() {
  const franchiseId = useDeliveryStore((s) => s.selectedFranchiseId);
  const franchiseName = useDeliveryStore((s) => s.selectedFranchiseName);

  const { data: customerLoyalty, isLoading } = useQuery({
    queryKey: ["customer-loyalty-dashboard", franchiseId],
    queryFn: () => clientService.getCustomerLoyaltyByFranchise(String(franchiseId)),
    enabled: !!franchiseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: loyaltyRules } = useQuery({
    queryKey: ["loyalty-rules-dashboard", franchiseId],
    queryFn: () => clientService.getLoyaltyRuleByFranchise(String(franchiseId)),
    enabled: !!franchiseId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (!franchiseId) {
    return (
      <div className="p-6">
        <Card className="shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Chưa chọn chi nhánh</h2>
          <p className="text-gray-600 mt-2">
            Vui lòng chọn chi nhánh để xem điểm loyalty tương ứng.
          </p>
          <Link
            to={ROUTER_URL.RECEIVING_SETUP}
            className="inline-flex mt-4 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium"
          >
            Chọn chi nhánh
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!customerLoyalty) {
    return <div className="p-6">Không tìm thấy dữ liệu</div>;
  }

  const loyaltyPoints = Number(customerLoyalty.loyalty_points ?? 0);
  const tierFlow = getNextTierByPoints(loyaltyPoints, loyaltyRules);
  const currentTier = tierFlow.current;
  const nextTier = tierFlow.next;
  const pointsToNextTier = nextTier && tierFlow.nextMin != null
    ? Math.max(0, tierFlow.nextMin - loyaltyPoints)
    : undefined;
  const progressPercent = nextTier && tierFlow.nextMin != null
    ? Math.min(
      100,
      Math.max(0, ((loyaltyPoints - tierFlow.currentMin) / (tierFlow.nextMin - tierFlow.currentMin)) * 100)
    )
    : 100;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển điểm thưởng</h1>
        <p className="text-gray-600 mt-1">
          Tổng quan loyalty tại {franchiseName || "franchise đã chọn"}
        </p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng điểm"
              value={loyaltyPoints}
              suffix="điểm"
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Hạng"
              value={getTierLabel(currentTier)}
              prefix={
                <Tag
                  color={getTierColor(currentTier)}
                />
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng đơn hàng"
              value={Number(customerLoyalty.total_orders ?? 0)}
              suffix="đơn"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng chi tiêu"
              value={Number(customerLoyalty.total_spent ?? 0)}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
      </Row>

      {nextTier && pointsToNextTier !== undefined && (
        <Card title="Tiến độ lên hạng tiếp theo" className="shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">
                  Hạng hiện tại: <Tag>{getTierLabel(currentTier)}</Tag>
                </p>
                <p className="text-gray-600 mt-1">
                  Hạng tiếp theo: <Tag color="gold">{getTierLabel(nextTier)}</Tag>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {pointsToNextTier}
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
              format={() => `${pointsToNextTier} điểm`}
            />
          </div>
        </Card>
      )}

      {!nextTier && (
        <Card className="shadow-sm">
          <div className="text-center py-4">
            <Tag color="purple" className="text-lg px-4 py-2">
              Bạn đã đạt hạng cao nhất!
            </Tag>
            <p className="text-gray-600 mt-2">
              Chúc mừng bạn đã đạt hạng {getTierLabel(currentTier)}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
