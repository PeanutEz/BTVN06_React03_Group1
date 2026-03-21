export interface Voucher {
  id: string;
  code: string;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  quota_total: number;
  quota_usage: number; // usually there is a usage tracking
  franchise_id: string | null;
  product_franchise_id: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVoucherDto {
  name: string;
  franchise_id?: string | null;
  product_franchise_id?: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  quota_total: number;
  start_date: string;
  end_date: string;
}

export interface UpdateVoucherDto {
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  quota_total: number;
  start_date: string;
  end_date: string;
}

export interface VoucherSearchCondition {
  code?: string;
  franchise_id?: string;
  product_franchise_id?: string;
  type?: "PERCENT" | "FIXED" | "";
  value?: number | string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean | "";
  is_deleted?: boolean;
}

export interface SearchVoucherDto {
  searchCondition: VoucherSearchCondition;
  pageInfo: {
    pageNum: number;
    pageSize: number;
  };
}

export type VoucherApiResponse = Voucher;

export interface VoucherListResponse {
  data: Voucher[];
  total: number;
  page: number;
  limit: number;
}

export interface VoucherSearchResponse {
  data: VoucherApiResponse[];
  pageInfo: {
    pageNum: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
