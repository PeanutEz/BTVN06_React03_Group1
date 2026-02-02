# WBS Coffee - Admin Dashboard System

## 🏢 Giới thiệu hệ thống

**WBS Coffee Admin Dashboard** là hệ thống quản lý chuỗi cửa hàng cà phê franchise, cho phép headquarters staff quản lý đơn hàng, thanh toán, và chương trình thành viên trên toàn bộ các cửa hàng.

---

## 🔗 Core Business Flow

### Quy trình chính:
```
Khách hàng đặt hàng tại cửa hàng
    ↓
Tạo đơn hàng (Order Created)
    ↓
Xử lý thanh toán (Payment Processing)
    ↓
Thanh toán thành công (Payment Success)
    ↓
Đơn hàng hoàn thành (Order Completed)
    ↓
Tự động cập nhật điểm thưởng (Loyalty Points Updated)
```

### Chi tiết từng bước:

#### 1. **Tạo đơn hàng**
- Nhân viên cửa hàng tạo đơn tại POS
- Thông tin: Khách hàng + Sản phẩm + Cửa hàng + Phương thức thanh toán
- Trạng thái: `CREATED`

#### 2. **Thanh toán**
- COD: Thanh toán trực tiếp
- Online: Qua thẻ/chuyển khoản
- Trạng thái: `PENDING` → `SUCCESS` / `FAILED`

#### 3. **Hoàn thành đơn**
- Sau khi thanh toán thành công
- Trạng thái đơn: `PAID` → `COMPLETED`

#### 4. **Cập nhật loyalty**
- Tự động tính điểm: 1 điểm / 1,000 VNĐ
- Cập nhật hạng thành viên nếu đủ điều kiện
- Ghi lại lịch sử tích điểm

---

## 📦 Modules chính

### 1. **Order Management**
- **Danh sách đơn hàng**: Hiển thị tất cả đơn từ các cửa hàng
- **Chi tiết đơn hàng**: Sản phẩm, khách hàng, cửa hàng, thanh toán
- **Cập nhật trạng thái**: CREATED → PAID → COMPLETED / CANCELLED
- **Timeline**: Theo dõi tiến trình đơn hàng

**Files:**
- `src/pages/admin/order/OrderList.page.tsx`
- `src/pages/admin/order/OrderDetail.page.tsx`
- `src/models/order.model.tsx`
- `src/services/order.service.ts`

---

### 2. **Customer & Loyalty Management**
- **Danh sách khách hàng**: Thông tin, điểm thưởng, hạng
- **Chi tiết khách hàng**: Lịch sử mua hàng cross-store
- **Quản lý loyalty**: Cấu hình quy tắc tích điểm
- **Hạng thành viên**: 
  - 🥉 **Bronze** (0+ điểm): Tích điểm cơ bản
  - 🥈 **Silver** (1,000+ điểm): Tích x1.5, giảm 5%
  - 🥇 **Gold** (5,000+ điểm): Tích x2, giảm 10%

**Files:**
- `src/pages/admin/customer/CustomerList.page.tsx`
- `src/pages/admin/customer/CustomerDetail.page.tsx`
- `src/pages/admin/loyalty/LoyaltyManagement.page.tsx`
- `src/models/customer.model.tsx`
- `src/models/loyalty.model.tsx`
- `src/services/customer.service.ts`
- `src/services/loyalty.service.ts`

---

### 3. **Payment Management**
- **Danh sách thanh toán**: Tất cả giao dịch từ các cửa hàng
- **Chi tiết thanh toán**: Thông tin đơn, phương thức, logs
- **Trạng thái**: PENDING / SUCCESS / FAILED / REFUNDED
- **Transaction tracking**: Mã giao dịch, timeline

**Files:**
- `src/pages/admin/payment/PaymentList.page.tsx`
- `src/pages/admin/payment/PaymentDetail.page.tsx`
- `src/models/payment.model.tsx`
- `src/services/payment.service.ts`

---

### 4. **Store Management**
- **Danh sách cửa hàng**: 4 franchise stores
- **Thông tin**: Địa chỉ, manager, giờ mở cửa, trạng thái
- **Stores**:
  - WBS Coffee Nguyễn Huệ (WBS-NH)
  - WBS Coffee Lê Lợi (WBS-LL)
  - WBS Coffee Thảo Điền (WBS-TD)
  - WBS Coffee Phú Mỹ Hưng (WBS-PMH)

**Files:**
- `src/models/store.model.tsx`
- `src/services/store.service.ts`

---

### 5. **Dashboard**
- **Tổng quan hệ thống**: Stats cards
  - Tổng đơn hàng (+ pending/completed)
  - Doanh thu
  - Khách hàng
  - Cửa hàng
- **Loyalty overview**: Thống kê theo tier
- **Recent orders**: 5 đơn hàng mới nhất

**Files:**
- `src/pages/admin/dashboard/Dashboard.page.tsx`

---

## 🔗 Cross-linking Navigation

### Order Detail → Payment Detail
```tsx
<Link to={`/admin/payments/${paymentId}`}>
  Xem thanh toán
</Link>
```

### Order Detail → Customer Profile
```tsx
<Link to={`/admin/customers/${customerId}`}>
  Xem khách hàng
</Link>
```

### Payment Detail → Order Detail
```tsx
<Link to={`/admin/orders/${orderId}`}>
  {orderId}
</Link>
```

### Customer Detail → Order History
- Hiển thị tất cả đơn hàng của khách
- Link đến chi tiết từng đơn

---

## 🎨 UI/UX Features

### ✅ Đã implement:
- ✅ Admin sidebar navigation (6 items)
- ✅ Responsive tables với pagination-ready structure
- ✅ Search & filter đa điều kiện
- ✅ Status badges với màu sắc:
  - Order: Created (blue), Paid (green), Completed (purple), Cancelled (red)
  - Payment: Pending (yellow), Success (green), Failed (red), Refunded (blue)
  - Customer: Active (green), Inactive (gray)
  - Loyalty: Bronze (orange), Silver (gray), Gold (yellow)
  - Store: Active (green), Inactive (gray), Maintenance (yellow)
- ✅ Confirmation modals cho critical actions
- ✅ Loading states
- ✅ Empty states
- ✅ Vietnamese formatting (currency, date)
- ✅ Cross-link navigation giữa modules

---

## 📊 Mock Data Overview

### Orders (3 đơn):
- ORD001: WBS-NH, 180k (Phin + Croissant + Trà sữa) - PAID
- ORD002: WBS-LL, 275k (Macchiato + Tiramisu + Freeze) - COMPLETED
- ORD003: WBS-TD, 60k (Cà phê đen + Bánh mì) - CREATED

### Customers (4 khách):
- CUST001: Gold tier, 5,200 points, 45 orders
- CUST002: Silver tier, 1,500 points, 28 orders
- CUST003: Bronze tier, 450 points, 12 orders
- CUST004: Bronze tier (Inactive), 200 points

### Payments (3 giao dịch):
- PAY001: ORD001, 180k, ONLINE - SUCCESS
- PAY002: ORD002, 275k, ONLINE - SUCCESS
- PAY003: ORD003, 60k, COD - PENDING

### Stores (4 cửa hàng):
- STORE001: Nguyễn Huệ - ACTIVE
- STORE002: Lê Lợi - ACTIVE
- STORE003: Thảo Điền - ACTIVE
- STORE004: Phú Mỹ Hưng - MAINTENANCE

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State**: Zustand (auth store)
- **Forms**: React Hook Form
- **Icons**: Heroicons (inline SVG)
- **API**: Mock services (async/await)

---

## 📁 Project Structure

```
src/
├── models/
│   ├── order.model.tsx
│   ├── customer.model.tsx
│   ├── payment.model.tsx
│   ├── loyalty.model.tsx
│   ├── store.model.tsx
│   └── index.tsx
├── services/
│   ├── order.service.ts
│   ├── customer.service.ts
│   ├── payment.service.ts
│   ├── loyalty.service.ts
│   └── store.service.ts
├── pages/admin/
│   ├── dashboard/Dashboard.page.tsx
│   ├── order/
│   │   ├── OrderList.page.tsx
│   │   └── OrderDetail.page.tsx
│   ├── customer/
│   │   ├── CustomerList.page.tsx
│   │   └── CustomerDetail.page.tsx
│   ├── payment/
│   │   ├── PaymentList.page.tsx
│   │   └── PaymentDetail.page.tsx
│   └── loyalty/LoyaltyManagement.page.tsx
└── routes/
    └── admin/Admin.menu.tsx
```

---

## 🚀 Features Highlights

### 1. **Multi-Store Management**
- Filter orders/payments by store
- Store info in order/payment details
- Cross-store customer tracking

### 2. **Integrated Business Flow**
- Order → Payment → Loyalty linking
- Auto loyalty update on order completion
- Cross-module navigation

### 3. **Franchise Operations**
- Headquarters dashboard overview
- Per-store performance tracking
- Centralized customer loyalty program

### 4. **Real-time Updates**
- Status change modals with confirmation
- Timeline tracking for orders/payments
- Loyalty tier auto-upgrade

---

## 📈 Next Steps (Backend Integration)

1. Connect to real REST API
2. Add pagination for large datasets
3. Implement real-time notifications
4. Add export reports (Excel/PDF)
5. Role-based access control (HQ staff vs Store manager)
6. Analytics & charts (revenue trends, best-selling products)

---

## ✨ Demo Flow

### Scenario: Customer orders tại WBS Coffee Nguyễn Huệ

1. **Order Creation**:
   - Navigate: Dashboard → Orders → Order Detail (ORD001)
   - View: Customer info + Store info + Products + Status timeline

2. **Payment Processing**:
   - Navigate: Order Detail → Click "PAY001"
   - View: Payment details + Transaction ID + Logs
   - Action: Update status to SUCCESS

3. **Loyalty Update**:
   - Navigate: Payment Detail → Click Customer name
   - View: Customer profile + Order history
   - Navigate: Customers → Loyalty Management
   - View: Points awarded (180 pts for 180k order)

4. **Dashboard Overview**:
   - Navigate: Dashboard
   - View: Total stats + Recent orders + Loyalty breakdown

---

**Built for WBS Coffee Franchise Management 2026** ☕
