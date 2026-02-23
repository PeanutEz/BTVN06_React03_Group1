import type {
  Customer,
  CustomerFranchise,
  Order,
  OrderItem,
  LoyaltyTransaction,
  LoyaltyTier,
  OrderType,
  OrderStatus,
} from "../types/models";

// Vietnamese names for customers
const VIETNAMESE_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Văn Cường",
  "Phạm Thị Dung",
  "Hoàng Văn Đức",
  "Vũ Thị Hoa",
  "Đặng Văn Hùng",
  "Bùi Thị Lan",
  "Đỗ Văn Minh",
  "Ngô Thị Nga",
  "Lý Văn Phong",
  "Võ Thị Quỳnh",
];

// Vietnamese phone numbers (10 digits, starting with 0)
function generateVietnamesePhone(): string {
  const prefixes = ["090", "091", "092", "093", "094", "096", "097", "098", "032", "033", "034", "035", "036", "037", "038", "039"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
  return prefix + suffix;
}

// Generate order code (e.g., ORD-2024-001234)
function generateOrderCode(index: number): string {
  const year = new Date().getFullYear();
  const padded = String(index).padStart(6, "0");
  return `ORD-${year}-${padded}`;
}

// Calculate loyalty tier based on points
function calculateTier(points: number): LoyaltyTier {
  if (points < 500) return "SILVER";
  if (points < 2000) return "GOLD";
  return "PLATINUM";
}

// Calculate points earned from order total: floor(total_amount / 10000)
function calculatePointsEarned(totalAmount: number): number {
  return Math.floor(totalAmount / 10000);
}

// Generate random date within last 90 days
function randomDate(daysAgo: number = 90): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime).toISOString();
}

// Product names for order items
const PRODUCT_NAMES = [
  "Cà phê đen đá",
  "Cà phê sữa đá",
  "Cà phê đen nóng",
  "Cà phê sữa nóng",
  "Cappuccino",
  "Latte",
  "Americano",
  "Espresso",
  "Mocha",
  "Macchiato",
  "Bánh mì thịt nướng",
  "Bánh mì pate",
  "Bánh mì chả cá",
  "Bánh ngọt socola",
  "Bánh ngọt dâu tây",
  "Nước ép cam",
  "Nước ép táo",
  "Trà đào",
  "Trà chanh",
  "Sinh tố bơ",
];

// Generate customers
export function generateCustomers(): Customer[] {
  const customers: Customer[] = [];
  const usedPhones = new Set<string>();

  for (let i = 1; i <= 10; i++) {
    let phone: string;
    do {
      phone = generateVietnamesePhone();
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    customers.push({
      id: i,
      phone,
      email: `customer${i}@example.com`,
      password_hash: "hashed_password",
      name: VIETNAMESE_NAMES[i % VIETNAMESE_NAMES.length],
      avatar_url: undefined,
      is_active: true,
      is_deleted: false,
      created_at: randomDate(180),
      updated_at: randomDate(180),
    });
  }

  return customers;
}

// Generate customer_franchise (assuming franchise_id = 1 for all)
export function generateCustomerFranchises(customers: Customer[]): CustomerFranchise[] {
  const customerFranchises: CustomerFranchise[] = [];
  const franchiseId = 1;

  customers.forEach((customer, index) => {
    // Calculate initial points based on some orders (will be updated by transactions)
    const basePoints = Math.floor(Math.random() * 3000);
    const tier = calculateTier(basePoints);

    customerFranchises.push({
      id: index + 1,
      customer_id: customer.id,
      franchise_id: franchiseId,
      loyalty_point: basePoints,
      loyalty_tier: tier,
      first_order_at: randomDate(120),
      last_order_at: randomDate(30),
      is_active: true,
      is_deleted: false,
      created_at: randomDate(180),
      updated_at: randomDate(30),
    });
  });

  return customerFranchises;
}

// Generate orders
export function generateOrders(customers: Customer[]): Order[] {
  const orders: Order[] = [];
  const franchiseId = 1;
  const orderTypes: OrderType[] = ["POS", "ONLINE"];
  const statuses: OrderStatus[] = ["DRAFT", "CONFIRMED", "PREPARING", "COMPLETED", "CANCELLED"];

  for (let i = 1; i <= 30; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const type = orderTypes[Math.floor(Math.random() * orderTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdAt = randomDate(90);

    let confirmedAt: string | undefined;
    let completedAt: string | undefined;
    let cancelledAt: string | undefined;

    if (status === "CONFIRMED" || status === "PREPARING" || status === "COMPLETED") {
      confirmedAt = new Date(new Date(createdAt).getTime() + 5 * 60 * 1000).toISOString();
    }
    if (status === "COMPLETED") {
      completedAt = new Date(new Date(confirmedAt!).getTime() + 15 * 60 * 1000).toISOString();
    }
    if (status === "CANCELLED") {
      cancelledAt = new Date(new Date(createdAt).getTime() + 10 * 60 * 1000).toISOString();
    }

    orders.push({
      id: i,
      code: generateOrderCode(i),
      franchise_id: franchiseId,
      customer_id: customer.id,
      type,
      status,
      total_amount: Math.floor(30000 + Math.random() * 270000), // 30k - 300k
      confirmed_at: confirmedAt,
      completed_at: completedAt,
      cancelled_at: cancelledAt,
      created_by: type === "POS" ? 1 : undefined,
      is_deleted: false,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Generate order items
export function generateOrderItems(orders: Order[]): OrderItem[] {
  const items: OrderItem[] = [];
  let itemId = 1;

  orders.forEach((order) => {
    const itemCount = Math.floor(1 + Math.random() * 4); // 1-4 items per order

    for (let i = 0; i < itemCount; i++) {
      const productName = PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)];
      const price = Math.floor(20000 + Math.random() * 80000); // 20k - 100k per item
      const quantity = Math.floor(1 + Math.random() * 3); // 1-3 quantity
      const lineTotal = price * quantity;

      items.push({
        id: itemId++,
        order_id: order.id,
        product_franchise_id: Math.floor(1 + Math.random() * 20),
        product_name_snapshot: productName,
        price_snapshot: price,
        quantity,
        line_total: lineTotal,
        is_deleted: false,
        created_at: order.created_at,
        updated_at: order.created_at,
      });
    }
  });

  return items;
}

// Generate loyalty transactions
export function generateLoyaltyTransactions(
  customerFranchises: CustomerFranchise[],
  orders: Order[]
): LoyaltyTransaction[] {
  const transactions: LoyaltyTransaction[] = [];
  let transactionId = 1;

  // Generate EARN transactions from completed orders
  orders
    .filter((o) => o.status === "COMPLETED")
    .forEach((order) => {
      const customerFranchise = customerFranchises.find((cf) => cf.customer_id === order.customer_id);
      if (customerFranchise) {
        const pointsEarned = calculatePointsEarned(order.total_amount);
        if (pointsEarned > 0) {
          transactions.push({
            id: transactionId++,
            customer_franchise_id: customerFranchise.id,
            order_id: order.id,
            type: "EARN",
            point_change: pointsEarned,
            reason: `Tích điểm từ đơn hàng ${order.code}`,
            created_by: 1,
            is_deleted: false,
            created_at: order.completed_at || order.created_at,
            updated_at: order.completed_at || order.created_at,
          });
        }
      }
    });

  // Generate some REDEEM transactions
  customerFranchises.forEach((cf) => {
    if (cf.loyalty_point > 100) {
      const redeemCount = Math.floor(Math.random() * 3); // 0-2 redeem transactions
      for (let i = 0; i < redeemCount; i++) {
        const pointsToRedeem = Math.floor(50 + Math.random() * 200);
        transactions.push({
          id: transactionId++,
          customer_franchise_id: cf.id,
          order_id: undefined,
          type: "REDEEM",
          point_change: -pointsToRedeem,
          reason: "Đổi điểm lấy voucher",
          created_by: 1,
          is_deleted: false,
          created_at: randomDate(60),
          updated_at: randomDate(60),
        });
      }
    }
  });

  // Generate some ADJUST transactions
  for (let i = 0; i < 5; i++) {
    const cf = customerFranchises[Math.floor(Math.random() * customerFranchises.length)];
    const adjustAmount = Math.floor(-50 + Math.random() * 100); // -50 to +50
    transactions.push({
      id: transactionId++,
      customer_franchise_id: cf.id,
      order_id: undefined,
      type: "ADJUST",
      point_change: adjustAmount,
      reason: "Điều chỉnh điểm thưởng",
      created_by: 1,
      is_deleted: false,
      created_at: randomDate(90),
      updated_at: randomDate(90),
    });
  }

  return transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Generate all mock data
export function generateMockData() {
  const customers = generateCustomers();
  const customerFranchises = generateCustomerFranchises(customers);
  const orders = generateOrders(customers);
  const orderItems = generateOrderItems(orders);
  const loyaltyTransactions = generateLoyaltyTransactions(customerFranchises, orders);

  return {
    customers,
    customerFranchises,
    orders,
    orderItems,
    loyaltyTransactions,
  };
}

// Export singleton mock data
export const MOCK_DATA = generateMockData();

// Current logged-in customer (customer ID 1)
export const CURRENT_CUSTOMER_ID = 1;
export const CURRENT_FRANCHISE_ID = 1;
