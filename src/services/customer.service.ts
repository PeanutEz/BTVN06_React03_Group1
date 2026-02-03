import type { Customer, LoyaltyTier } from "../models/customer.model";

// Mock data
const mockCustomers: Customer[] = [
  {
    id: "CUST001",
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com",
    phone: "0912345678",
    avatar: "https://i.pravatar.cc/150?img=1",
    tier: "GOLD",
    loyaltyPoints: 5200,
    status: "ACTIVE",
    createDate: "2025-01-15T10:00:00Z",
    updateDate: "2026-02-01T11:00:00Z",
    orderCount: 45,
    totalSpent: 5200000,
  },
  {
    id: "CUST002",
    name: "Trần Thị B",
    email: "tranthib@example.com",
    phone: "0987654321",
    avatar: "https://i.pravatar.cc/150?img=2",
    tier: "SILVER",
    loyaltyPoints: 1500,
    status: "ACTIVE",
    createDate: "2025-03-20T14:30:00Z",
    updateDate: "2026-01-31T09:15:00Z",
    orderCount: 28,
    totalSpent: 1500000,
  },
  {
    id: "CUST003",
    name: "Lê Văn C",
    email: "levanc@example.com",
    phone: "0901234567",
    avatar: "https://i.pravatar.cc/150?img=3",
    tier: "BRONZE",
    loyaltyPoints: 450,
    status: "ACTIVE",
    createDate: "2025-11-05T08:00:00Z",
    updateDate: "2026-02-02T08:45:00Z",
    orderCount: 12,
    totalSpent: 450000,
  },
  {
    id: "CUST004",
    name: "Phạm Thị D",
    email: "phamthid@example.com",
    phone: "0911223344",
    avatar: "https://i.pravatar.cc/150?img=4",
    tier: "BRONZE",
    loyaltyPoints: 200,
    status: "INACTIVE",
    createDate: "2025-06-12T16:20:00Z",
    updateDate: "2025-12-01T10:00:00Z",
    orderCount: 8,
    totalSpent: 200000,
  },
];

export const fetchCustomers = async (): Promise<Customer[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockCustomers;
};

export const fetchCustomerById = async (id: string): Promise<Customer | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCustomers.find((customer) => customer.id === id) || null;
};

export const createCustomer = async (data: Omit<Customer, "id" | "createDate" | "updateDate">): Promise<Customer> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newCustomer: Customer = {
    ...data,
    id: `CUST${String(mockCustomers.length + 1).padStart(3, "0")}`,
    createDate: new Date().toISOString(),
    updateDate: new Date().toISOString(),
  };
  mockCustomers.push(newCustomer);
  return newCustomer;
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const customer = mockCustomers.find((c) => c.id === id);
  if (customer) {
    Object.assign(customer, data, { updateDate: new Date().toISOString() });
  }
  return customer || null;
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = mockCustomers.findIndex((c) => c.id === id);
  if (index > -1) {
    mockCustomers.splice(index, 1);
    return true;
  }
  return false;
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  return mockCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      customer.email.toLowerCase().includes(lowerQuery) ||
      customer.phone.includes(query)
  );
};

export const filterCustomersByTier = async (tier: LoyaltyTier): Promise<Customer[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCustomers.filter((customer) => customer.tier === tier);
};
