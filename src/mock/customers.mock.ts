// Mock data following DBML structure
export interface CustomerMock {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
}

export interface CustomerFranchiseMock {
  id: string;
  customer_id: string;
  franchise_id: string;
  loyalty_point: number;
  loyalty_tier: "BRONZE" | "SILVER" | "GOLD";
  first_order_at?: string;
  last_order_at?: string;
}

export const mockCustomers: CustomerMock[] = [
  {
    id: "CUSTOMER-001",
    name: "Nguyễn Văn A",
    phone: "0912345678",
    email: "nguyenvana@example.com",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: "CUSTOMER-002",
    name: "Trần Thị B",
    phone: "0987654321",
    email: "tranthib@example.com",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: "CUSTOMER-003",
    name: "Lê Văn C",
    phone: "0901234567",
    email: "levanc@example.com",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
];

export const mockCustomerFranchises: CustomerFranchiseMock[] = [
  {
    id: "CF-001",
    customer_id: "CUSTOMER-001",
    franchise_id: "FRANCHISE-001",
    loyalty_point: 520,
    loyalty_tier: "GOLD",
    first_order_at: "2023-12-01T10:00:00Z",
    last_order_at: "2024-01-17T08:45:00Z",
  },
  {
    id: "CF-002",
    customer_id: "CUSTOMER-002",
    franchise_id: "FRANCHISE-001",
    loyalty_point: 150,
    loyalty_tier: "GOLD",
    first_order_at: "2024-01-01T14:00:00Z",
    last_order_at: "2024-01-16T14:20:00Z",
  },
  {
    id: "CF-003",
    customer_id: "CUSTOMER-003",
    franchise_id: "FRANCHISE-001",
    loyalty_point: 45,
    loyalty_tier: "BRONZE",
    first_order_at: "2024-01-10T09:00:00Z",
    last_order_at: "2024-01-17T15:00:00Z",
  },
];
