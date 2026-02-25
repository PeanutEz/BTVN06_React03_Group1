import type {
  OrderWithRelations,
  CustomerFranchise,
  LoyaltyTransactionWithRelations,
  LoyaltyDashboard,
  LoyaltyPointsSummary,
  TierInfo,
  StaticPage,
  OrderStatus,
  LoyaltyTier,
} from "../types/models";
import { MOCK_DATA, CURRENT_CUSTOMER_ID, CURRENT_FRANCHISE_ID } from "../mocks/data";

// Helper to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to get customer franchise for current customer
function getCurrentCustomerFranchise(): CustomerFranchise | undefined {
  return MOCK_DATA.customerFranchises.find(
    (cf) => cf.customer_id === CURRENT_CUSTOMER_ID && cf.franchise_id === CURRENT_FRANCHISE_ID
  );
}

// ============ Orders ============

/**
 * Get all orders (staff POS list - KAN-86)
 */
export async function getOrders(): Promise<OrderWithRelations[]> {
  await delay(300);

  return MOCK_DATA.orders.map((order) => {
    const customer = MOCK_DATA.customers.find((c) => c.id === order.customer_id);
    return {
      ...order,
      customer,
      franchise: {
        id: CURRENT_FRANCHISE_ID,
        code: "FR-001",
        name: "Cửa hàng trung tâm",
      },
    };
  });
}

/**
 * Get customer orders (KAN-87)
 */
export async function getCustomerOrders(
  customerId: number,
  filters?: { status?: OrderStatus; dateFrom?: string; dateTo?: string }
): Promise<OrderWithRelations[]> {
  await delay(300);

  let orders = MOCK_DATA.orders.filter((o) => o.customer_id === customerId);

  // Apply filters
  if (filters?.status) {
    orders = orders.filter((o) => o.status === filters.status);
  }

  if (filters?.dateFrom) {
    orders = orders.filter((o) => new Date(o.created_at) >= new Date(filters.dateFrom!));
  }

  if (filters?.dateTo) {
    orders = orders.filter((o) => new Date(o.created_at) <= new Date(filters.dateTo!));
  }

  return orders.map((order) => {
    const customer = MOCK_DATA.customers.find((c) => c.id === order.customer_id);
    const items = MOCK_DATA.orderItems.filter((item) => item.order_id === order.id);
    return {
      ...order,
      customer,
      items,
      franchise: {
        id: CURRENT_FRANCHISE_ID,
        code: "FR-001",
        name: "Cửa hàng trung tâm",
      },
    };
  });
}

/**
 * Get order detail (KAN-88)
 */
export async function getOrderDetail(orderId: number): Promise<OrderWithRelations | null> {
  await delay(300);

  const order = MOCK_DATA.orders.find((o) => o.id === orderId);
  if (!order) return null;

  const customer = MOCK_DATA.customers.find((c) => c.id === order.customer_id);
  const items = MOCK_DATA.orderItems.filter((item) => item.order_id === order.id);

  return {
    ...order,
    customer,
    items,
    franchise: {
      id: CURRENT_FRANCHISE_ID,
      code: "FR-001",
      name: "Cửa hàng trung tâm",
    },
  };
}

// ============ Loyalty ============

/**
 * Get loyalty dashboard (KAN-89)
 */
export async function getLoyaltyDashboard(customerId: number): Promise<LoyaltyDashboard> {
  await delay(300);

  const customerFranchise = MOCK_DATA.customerFranchises.find(
    (cf) => cf.customer_id === customerId && cf.franchise_id === CURRENT_FRANCHISE_ID
  );

  if (!customerFranchise) {
    return {
      total_points: 0,
      tier: "SILVER",
      total_orders: 0,
      total_spending: 0,
    };
  }

  const orders = MOCK_DATA.orders.filter(
    (o) => o.customer_id === customerId && o.status === "COMPLETED"
  );
  const totalSpending = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = orders.length;

  // Calculate next tier
  let nextTier: LoyaltyTier | undefined;
  let pointsToNextTier: number | undefined;

  if (customerFranchise.loyalty_tier === "SILVER") {
    nextTier = "GOLD";
    pointsToNextTier = Math.max(0, 500 - customerFranchise.loyalty_point);
  } else if (customerFranchise.loyalty_tier === "GOLD") {
    nextTier = "PLATINUM";
    pointsToNextTier = Math.max(0, 2000 - customerFranchise.loyalty_point);
  }

  return {
    total_points: customerFranchise.loyalty_point,
    tier: customerFranchise.loyalty_tier,
    total_orders: totalOrders,
    total_spending: totalSpending,
    next_tier: nextTier,
    points_to_next_tier: pointsToNextTier,
  };
}

/**
 * Get loyalty points summary (KAN-90)
 */
export async function getLoyaltyPoints(_customerId: number): Promise<LoyaltyPointsSummary> {
  await delay(300);

  const customerFranchise = getCurrentCustomerFranchise();
  if (!customerFranchise) {
    return {
      current_points: 0,
      points_earned: 0,
      points_redeemed: 0,
      remaining: 0,
    };
  }

  const transactions = MOCK_DATA.loyaltyTransactions.filter(
    (t) => t.customer_franchise_id === customerFranchise.id
  );

  const pointsEarned = transactions
    .filter((t) => t.type === "EARN")
    .reduce((sum, t) => sum + t.point_change, 0);

  const pointsRedeemed = Math.abs(
    transactions
      .filter((t) => t.type === "REDEEM")
      .reduce((sum, t) => sum + t.point_change, 0)
  );

  return {
    current_points: customerFranchise.loyalty_point,
    points_earned: pointsEarned,
    points_redeemed: pointsRedeemed,
    remaining: customerFranchise.loyalty_point,
  };
}

/**
 * Get tier information (KAN-91)
 */
export async function getTierInfo(): Promise<TierInfo[]> {
  await delay(200);

  return [
    {
      tier: "SILVER",
      min_points: 0,
      max_points: 499,
      condition: "Dưới 500 điểm",
      benefits: [
        "Tích điểm cơ bản",
        "Thông báo khuyến mãi",
        "Sinh nhật tặng voucher 50k",
      ],
    },
    {
      tier: "GOLD",
      min_points: 500,
      max_points: 1999,
      condition: "Từ 500 đến 1999 điểm",
      benefits: [
        "Tích điểm x1.5",
        "Giảm giá 5% mọi đơn",
        "Sinh nhật tặng voucher 100k",
        "Ưu tiên phục vụ",
      ],
    },
    {
      tier: "PLATINUM",
      min_points: 2000,
      condition: "Từ 2000 điểm trở lên",
      benefits: [
        "Tích điểm x2",
        "Giảm giá 10% mọi đơn",
        "Sinh nhật tặng bánh miễn phí",
        "Phục vụ VIP",
        "Ưu đãi đặc biệt hàng tháng",
      ],
    },
  ];
}

/**
 * Get loyalty history (KAN-92)
 */
export async function getLoyaltyHistory(customerId: number): Promise<LoyaltyTransactionWithRelations[]> {
  await delay(300);

  const customerFranchise = MOCK_DATA.customerFranchises.find(
    (cf) => cf.customer_id === customerId && cf.franchise_id === CURRENT_FRANCHISE_ID
  );

  if (!customerFranchise) {
    return [];
  }

  return MOCK_DATA.loyaltyTransactions
    .filter((t) => t.customer_franchise_id === customerFranchise.id)
    .map((transaction) => {
      const order = transaction.order_id
        ? MOCK_DATA.orders.find((o) => o.id === transaction.order_id)
        : undefined;

      return {
        ...transaction,
        customer_franchise: {
          ...customerFranchise,
          customer: MOCK_DATA.customers.find((c) => c.id === customerFranchise.customer_id),
        },
        order,
      };
    });
}

// ============ Static Pages ============

/**
 * Get about page (KAN-94)
 */
export async function getAboutPage(): Promise<StaticPage> {
  await delay(200);

  return {
    id: 1,
    title: "Về chúng tôi",
    slug: "about",
    content: `
      <h2>Giới thiệu về hệ thống cà phê</h2>
      <p>Chúng tôi là một hệ thống cà phê franchise với nhiều năm kinh nghiệm trong việc phục vụ những tách cà phê chất lượng cao.</p>
      <h3>Sứ mệnh</h3>
      <p>Mang đến trải nghiệm cà phê tuyệt vời cho mọi khách hàng, với chất lượng đồng nhất tại mọi cửa hàng.</p>
      <h3>Tầm nhìn</h3>
      <p>Trở thành thương hiệu cà phê hàng đầu tại Việt Nam, với mạng lưới cửa hàng rộng khắp.</p>
      <h3>Giá trị cốt lõi</h3>
      <ul>
        <li>Chất lượng: Cam kết chất lượng sản phẩm và dịch vụ</li>
        <li>Đồng nhất: Trải nghiệm giống nhau tại mọi cửa hàng</li>
        <li>Khách hàng: Đặt khách hàng làm trung tâm</li>
        <li>Đổi mới: Không ngừng cải tiến và phát triển</li>
      </ul>
    `,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get contact page (KAN-95)
 */
export async function getContactPage(): Promise<StaticPage> {
  await delay(200);

  return {
    id: 2,
    title: "Liên hệ",
    slug: "contact",
    content: `
      <h2>Thông tin liên hệ</h2>
      <p><strong>Địa chỉ:</strong> 123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh</p>
      <p><strong>Điện thoại:</strong> 1900 1234</p>
      <p><strong>Email:</strong> contact@coffee.com</p>
      <p><strong>Giờ làm việc:</strong> 7:00 - 22:00 hàng ngày</p>
      <h3>Gửi tin nhắn cho chúng tôi</h3>
      <p>Vui lòng điền form bên dưới để gửi tin nhắn. Chúng tôi sẽ phản hồi trong vòng 24 giờ.</p>
    `,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get static page by slug (KAN-93)
 */
export async function getStaticPage(slug: string): Promise<StaticPage | null> {
  await delay(200);

  if (slug === "about") {
    return getAboutPage();
  }
  if (slug === "contact") {
    return getContactPage();
  }

  // Default static page
  return {
    id: 3,
    title: "Trang tĩnh",
    slug,
    content: `<h2>${slug}</h2><p>Nội dung trang tĩnh.</p>`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
