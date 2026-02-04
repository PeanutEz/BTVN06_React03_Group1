import type { Customer, CustomerFranchise, CustomerDisplay } from "../models/customer.model";

// Mock data
const mockCustomers: Customer[] = [
  {
    id: 1,
    phone: "0912345678",
    email: "nguyenvana@example.com",
    password_hash: "$2b$10$...",
    name: "Nguyễn Văn A",
    avatar_url: "https://i.pravatar.cc/150?img=1",
    is_active: true,
    is_deleted: false,
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 2,
    phone: "0987654321",
    email: "tranthib@example.com",
    password_hash: "$2b$10$...",
    name: "Trần Thị B",
    avatar_url: "https://i.pravatar.cc/150?img=2",
    is_active: true,
    is_deleted: false,
    created_at: "2025-03-20T14:30:00Z",
    updated_at: "2026-01-31T09:15:00Z",
  },
  {
    id: 3,
    phone: "0901234567",
    email: "levanc@example.com",
    password_hash: "$2b$10$...",
    name: "Lê Văn C",
    avatar_url: "https://i.pravatar.cc/150?img=3",
    is_active: true,
    is_deleted: false,
    created_at: "2025-11-05T08:00:00Z",
    updated_at: "2026-02-02T08:45:00Z",
  },
  {
    id: 4,
    phone: "0911223344",
    email: "phamthid@example.com",
    password_hash: "$2b$10$...",
    name: "Phạm Thị D",
    avatar_url: "https://i.pravatar.cc/150?img=4",
    is_active: false,
    is_deleted: false,
    created_at: "2025-06-12T16:20:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
];

const mockCustomerFranchises: CustomerFranchise[] = [
  {
    id: 1,
    customer_id: 1,
    franchise_id: 1,
    loyalty_point: 5200,
    loyalty_tier: "GOLD",
    first_order_at: "2025-01-20T10:00:00Z",
    last_order_at: "2026-02-01T11:00:00Z",
    is_active: true,
    is_deleted: false,
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2026-02-01T11:00:00Z",
  },
  {
    id: 2,
    customer_id: 2,
    franchise_id: 2,
    loyalty_point: 1500,
    loyalty_tier: "SILVER",
    first_order_at: "2025-03-25T14:00:00Z",
    last_order_at: "2026-01-31T09:15:00Z",
    is_active: true,
    is_deleted: false,
    created_at: "2025-03-20T14:30:00Z",
    updated_at: "2026-01-31T09:15:00Z",
  },
  {
    id: 3,
    customer_id: 3,
    franchise_id: 3,
    loyalty_point: 450,
    loyalty_tier: "SILVER",
    first_order_at: "2025-11-10T08:00:00Z",
    last_order_at: "2026-02-02T08:45:00Z",
    is_active: true,
    is_deleted: false,
    created_at: "2025-11-05T08:00:00Z",
    updated_at: "2026-02-02T08:45:00Z",
  },
];

export const fetchCustomers = async (): Promise<CustomerDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockCustomers.map(customer => ({
    ...customer,
    franchises: mockCustomerFranchises
      .filter(cf => cf.customer_id === customer.id)
      .map(cf => ({
        ...cf,
        franchise: cf.franchise_id === 1
          ? { id: 1, code: "WBS-HN-01", name: "WBS Coffee Hoàn Kiếm" }
          : cf.franchise_id === 2
            ? { id: 2, code: "WBS-HCM-01", name: "WBS Coffee Quận 1" }
            : { id: 3, code: "WBS-DN-01", name: "WBS Coffee Hải Châu" },
      })),
  }));
};

export const fetchCustomerById = async (id: number): Promise<CustomerDisplay | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const customer = mockCustomers.find((c) => c.id === id);
  if (!customer) return null;
  return {
    ...customer,
    franchises: mockCustomerFranchises
      .filter(cf => cf.customer_id === customer.id)
      .map(cf => ({
        ...cf,
        franchise: cf.franchise_id === 1
          ? { id: 1, code: "WBS-HN-01", name: "WBS Coffee Hoàn Kiếm" }
          : cf.franchise_id === 2
            ? { id: 2, code: "WBS-HCM-01", name: "WBS Coffee Quận 1" }
            : { id: 3, code: "WBS-DN-01", name: "WBS Coffee Hải Châu" },
      })),
  };
};

export const fetchCustomerFranchises = async (customerId: number): Promise<CustomerFranchise[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockCustomerFranchises.filter(cf => cf.customer_id === customerId && !cf.is_deleted);
};

export const createCustomer = async (data: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newCustomer: Customer = {
    ...data,
    id: mockCustomers.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockCustomers.push(newCustomer);
  return newCustomer;
};

export const updateCustomer = async (id: number, data: Partial<Customer>): Promise<Customer | null> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const customer = mockCustomers.find((c) => c.id === id);
  if (customer) {
    Object.assign(customer, data, { updated_at: new Date().toISOString() });
  }
  return customer || null;
};

export const deleteCustomer = async (id: number): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const customer = mockCustomers.find((c) => c.id === id);
  if (customer) {
    customer.is_deleted = true;
    customer.updated_at = new Date().toISOString();
    return true;
  }
  return false;
};

export const searchCustomers = async (query: string): Promise<CustomerDisplay[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const lowerQuery = query.toLowerCase();
  const filtered = mockCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(lowerQuery) ||
      (customer.email && customer.email.toLowerCase().includes(lowerQuery)) ||
      customer.phone.includes(query)
  );
  return filtered.map(customer => ({
    ...customer,
    franchises: mockCustomerFranchises.filter(cf => cf.customer_id === customer.id),
  }));
};

export const updateCustomerLoyalty = async (
  customerFranchiseId: number,
  pointChange: number
): Promise<CustomerFranchise | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const cf = mockCustomerFranchises.find((cf) => cf.id === customerFranchiseId);
  if (cf) {
    cf.loyalty_point += pointChange;
    cf.updated_at = new Date().toISOString();
    
    // Update tier based on points
    if (cf.loyalty_point >= 5000) {
      cf.loyalty_tier = "PLATINUM";
    } else if (cf.loyalty_point >= 1000) {
      cf.loyalty_tier = "GOLD";
    } else {
      cf.loyalty_tier = "SILVER";
    }
    return cf;
  }
  return null;
};
