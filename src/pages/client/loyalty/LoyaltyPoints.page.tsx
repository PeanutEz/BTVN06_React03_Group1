// KAN-90: Loyalty Points
import { useQuery } from "@tanstack/react-query";
import { Card, Statistic, Row, Col } from "antd";
import { getLoyaltyPoints } from "../../../services/mockApi";
import { CURRENT_CUSTOMER_ID } from "../../../mocks/data";

export default function LoyaltyPointsPage() {
  const { data: points, isLoading } = useQuery({
    queryKey: ["loyalty-points", CURRENT_CUSTOMER_ID],
    queryFn: () => getLoyaltyPoints(CURRENT_CUSTOMER_ID),
  });

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!points) {
    return <div className="p-6">Không tìm thấy dữ liệu</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Điểm thưởng</h1>
        <p className="text-gray-600 mt-1">Chi tiết về điểm thưởng của bạn</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Điểm hiện tại"
              value={points.current_points}
              suffix="điểm"
              valueStyle={{ color: "#1890ff", fontSize: "24px" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Điểm đã tích"
              value={points.points_earned}
              suffix="điểm"
              valueStyle={{ color: "#52c41a", fontSize: "24px" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Điểm đã đổi"
              value={points.points_redeemed}
              suffix="điểm"
              valueStyle={{ color: "#fa8c16", fontSize: "24px" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm">
            <Statistic
              title="Điểm còn lại"
              value={points.remaining}
              suffix="điểm"
              valueStyle={{ color: "#722ed1", fontSize: "24px" }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Thông tin" className="shadow-sm">
        <div className="space-y-2 text-gray-600">
          <p>
            • Bạn có thể tích điểm khi mua hàng tại các cửa hàng của chúng tôi
          </p>
          <p>
            • 1 điểm = 10.000 VNĐ (tích 1 điểm cho mỗi 10.000 VNĐ)
          </p>
          <p>
            • Điểm có thể được sử dụng để đổi voucher hoặc giảm giá
          </p>
          <p>
            • Điểm không có thời hạn sử dụng
          </p>
        </div>
      </Card>
    </div>
  );
}
