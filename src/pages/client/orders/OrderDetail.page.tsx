// KAN-88: Order Detail — API: Get Order by Id, Get Payment by OrderId
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Tag, Button, Descriptions, Table, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, FilePdfOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { orderClient } from "../../../services/order.client";
import { paymentClient } from "../../../services/payment.client";
import type { OrderItem } from "../../../models/order.model";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "../../../models/order.model";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = id ?? "";
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => orderClient.getOrderById(orderId),
    enabled: !!orderId,
  });

  const { data: payment } = useQuery({
    queryKey: ["payment-by-order", orderId],
    queryFn: () => paymentClient.getPaymentByOrderId(orderId),
    enabled: !!orderId,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("vi-VN");

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!invoiceRef.current || !order) return;
    setExporting(true);
    try {
      const el = invoiceRef.current;
      await new Promise((r) => setTimeout(r, 80)); // let DOM settle

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;

      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, imgW, imgH);
        y += pageH;
      }

      pdf.save(`HoaDon_${order.code}.pdf`);
    } catch (err) {
      console.error("Export PDF failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: "Sản phẩm",
      dataIndex: "product_name_snapshot",
      key: "product_name_snapshot",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Giá",
      dataIndex: "price_snapshot",
      key: "price_snapshot",
      align: "right",
      width: 150,
      render: (price) => formatCurrency(price),
    },
    {
      title: "SL",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 80,
    },
    {
      title: "Thành tiền",
      dataIndex: "line_total",
      key: "line_total",
      align: "right",
      width: 150,
      render: (total) => <span className="font-semibold">{formatCurrency(total)}</span>,
    },
  ];

  if (isLoading) return <div className="p-6">Đang tải...</div>;

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Quay lại</Button>
        </div>
      </div>
    );
  }

  // ─── Payment & Delivery field labels ────────────────────────────────────────
  const paymentFieldLabels: Record<string, string> = {
    amount: "Số tiền", method: "Phương thức", status: "Trạng thái",
    transaction_id: "Mã giao dịch", paid_at: "Thời gian thanh toán",
    note: "Ghi chú",
  };
  const deliveryFieldLabels: Record<string, string> = {
    address: "Địa chỉ", receiver_name: "Người nhận", receiver_phone: "SĐT nhận",
    status: "Trạng thái", note: "Ghi chú",
  };

  const paymentObj = payment && typeof payment === "object" ? payment as Record<string, unknown> : null;
  const deliveryObj = (() => {
    const orderRecord = order as Record<string, unknown>;
    const embeddedDelivery =
      orderRecord.delivery && typeof orderRecord.delivery === "object"
        ? (orderRecord.delivery as Record<string, unknown>)
        : {};
    const normalizedDelivery = {
      ...embeddedDelivery,
      address:
        embeddedDelivery.address ??
        embeddedDelivery.order_address ??
        order.address ??
        orderRecord.delivery_address,
      receiver_name:
        embeddedDelivery.receiver_name ??
        orderRecord.receiver_name ??
        order.customer?.name,
      receiver_phone:
        embeddedDelivery.receiver_phone ??
        embeddedDelivery.order_phone ??
        order.phone ??
        order.customer?.phone,
      status:
        embeddedDelivery.status ??
        orderRecord.delivery_status,
      note:
        embeddedDelivery.note ??
        embeddedDelivery.order_message ??
        orderRecord.message ??
        orderRecord.note,
    };
    return Object.values(normalizedDelivery).some((value) =>
      typeof value === "string" ? value.trim() : value != null
    )
      ? normalizedDelivery
      : null;
  })();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h1>
            <p className="text-gray-500 text-sm mt-0.5 font-mono">{order.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Tag className={`text-sm px-3 py-1 ${ORDER_STATUS_COLORS[order.status]}`}>
            {ORDER_STATUS_LABELS[order.status]}
          </Tag>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={exporting}
            onClick={handleExportPDF}
            style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
          >
            Xuất hóa đơn PDF
          </Button>
        </div>
      </div>

      {/* ─── Cards ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Thông tin đơn hàng" className="shadow-sm">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Mã đơn">
              <span className="font-mono font-semibold text-amber-600">{order.code}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Loại đơn">
              <Tag color={order.type === "POS" ? "blue" : "green"}>{ORDER_TYPE_LABELS[order.type]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatDate(order.created_at)}</Descriptions.Item>
            {order.confirmed_at && <Descriptions.Item label="Xác nhận">{formatDate(order.confirmed_at)}</Descriptions.Item>}
            {order.completed_at && <Descriptions.Item label="Hoàn thành">{formatDate(order.completed_at)}</Descriptions.Item>}
            {order.cancelled_at && <Descriptions.Item label="Đã hủy">{formatDate(order.cancelled_at)}</Descriptions.Item>}
          </Descriptions>
        </Card>

        <Card title="Thông tin khách hàng" className="shadow-sm">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tên">{order.customer?.name || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{order.customer?.phone || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Email">{order.customer?.email || "N/A"}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Thanh toán" className="shadow-sm">
          {paymentObj ? (
            <Descriptions column={1} bordered size="small">
              {Object.entries(paymentObj).map(([key, value]) =>
                value == null || (typeof value === "object" && !(value instanceof Date)) ? null : (
                  <Descriptions.Item key={key} label={paymentFieldLabels[key] ?? key}>
                    {String(value)}
                  </Descriptions.Item>
                )
              )}
            </Descriptions>
          ) : <p className="text-gray-400 text-sm">Chưa có thông tin thanh toán</p>}
        </Card>

        <Card title="Giao hàng" className="shadow-sm">
          {deliveryObj ? (
            <Descriptions column={1} bordered size="small">
              {Object.entries(deliveryObj).map(([key, value]) =>
                value == null || (typeof value === "object" && !(value instanceof Date)) ? null : (
                  <Descriptions.Item key={key} label={deliveryFieldLabels[key] ?? key}>
                    {String(value)}
                  </Descriptions.Item>
                )
              )}
            </Descriptions>
          ) : <p className="text-gray-400 text-sm">Chưa có thông tin giao hàng</p>}
        </Card>
      </div>

      <Card title="Danh sách sản phẩm" className="shadow-sm">
        <Table columns={itemColumns} dataSource={order.items ?? []} rowKey="id" pagination={false} />
        <Divider />
        <div className="flex justify-end">
          <div className="text-right space-y-1">
            {(order.promotion_discount ?? 0) > 0 && (
              <div className="text-sm text-gray-500">Khuyến mãi: <span className="text-green-600">-{formatCurrency(order.promotion_discount!)}</span></div>
            )}
            {(order.voucher_discount ?? 0) > 0 && (
              <div className="text-sm text-gray-500">Voucher: <span className="text-green-600">-{formatCurrency(order.voucher_discount!)}</span></div>
            )}
            {(order.loyalty_discount ?? 0) > 0 && (
              <div className="text-sm text-gray-500">Điểm tích lũy: <span className="text-green-600">-{formatCurrency(order.loyalty_discount!)}</span></div>
            )}
            <div className="text-lg pt-1 border-t border-gray-200">
              <span className="text-gray-600">Tổng thanh toán: </span>
              <span className="text-2xl font-bold text-amber-600">
                {formatCurrency(order.final_amount ?? order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </Card>      {/* ─── Hidden Invoice Template (rendered off-screen for PDF export) ─── */}
      <div ref={invoiceRef} style={{
        position: "fixed", top: 0, left: "-9999px", width: "794px",
        pointerEvents: "none", zIndex: -1,
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: "#ffffff", color: "#1a1a1a",
        padding: "40px 48px 48px", boxSizing: "border-box",
      }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "20px", borderBottom: "1.5px solid #f59e0b", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src="/logo-hylux.png" alt="Hylux" style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover" }} />
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "#d97706", letterSpacing: "0.5px" }}>HYLUX COFFEE</div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>Hệ thống quản lý cửa hàng cà phê</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>HÓA ĐƠN</div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Ngày xuất: {new Date().toLocaleDateString("vi-VN")}</div>
          </div>
        </div>

        {/* ── Order code badge ── */}
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "8px", padding: "11px 18px", marginBottom: "24px", display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#78716c", marginRight: "8px" }}>Mã đơn hàng:</span>
          <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 700, color: "#d97706" }}>{order.code}</span>
          {(order as any)?.franchise?.name && (
            <span style={{ marginLeft: "auto", fontSize: "13px", color: "#374151" }}>Cửa hàng: <strong>{String((order as any).franchise.name)}</strong></span>
          )}
        </div>

        {/* ── Info grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>
          <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>KHÁCH HÀNG</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>{order.customer?.name || "—"}</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>SĐT: {order.customer?.phone || "—"}</div>
            {order.customer?.email && <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>{order.customer.email}</div>}
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Loại: {order.type === "POS" ? "Tại quầy" : "Giao hàng Online"}</div>
            {!!deliveryObj?.address && <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>Địa chỉ: {String(deliveryObj.address)}</div>}
          </div>
          <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>THÔNG TIN ĐƠN</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>Đặt lúc: <strong style={{ color: "#111827" }}>{formatDate(order.created_at)}</strong></div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>Trạng thái: <strong style={{ color: "#d97706" }}>{ORDER_STATUS_LABELS[order.status]}</strong></div>
            {order.confirmed_at && <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>Xác nhận: <strong style={{ color: "#111827" }}>{formatDate(order.confirmed_at)}</strong></div>}
            {order.completed_at && <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "3px" }}>Hoàn thành: <strong style={{ color: "#111827" }}>{formatDate(order.completed_at)}</strong></div>}
            {order.cancelled_at && <div style={{ fontSize: "12px", color: "#dc2626" }}>Hủy lúc: <strong>{formatDate(order.cancelled_at)}</strong></div>}
          </div>
        </div>

        {/* ── Items table ── */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>CHI TIẾT SẢN PHẨM</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f59e0b" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#fff" }}>Sản phẩm</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#fff", width: "54px" }}>SL</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#fff", width: "130px" }}>Đơn giá</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#fff", width: "130px" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item, idx) => (
                <tr key={item.id ?? idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{item.product_name_snapshot}</div>
                    {!!item.note && <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>{String(item.note)}</div>}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", color: "#374151" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", color: "#6b7280" }}>{formatCurrency(item.price_snapshot)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px", marginTop: "8px" }}>
          <div style={{ width: "320px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "13px", color: "#374151" }}>
              <span>Tạm tính</span><span style={{ fontWeight: 500 }}>{formatCurrency(order.total_amount)}</span>
            </div>
            {(order.promotion_discount ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "13px" }}>
                <span style={{ color: "#16a34a" }}>Giảm khuyến mãi</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>-{formatCurrency(order.promotion_discount!)}</span>
              </div>
            )}
            {(order.voucher_discount ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "13px" }}>
                <span style={{ color: "#16a34a" }}>Giảm voucher</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>-{formatCurrency(order.voucher_discount!)}</span>
              </div>
            )}
            {(order.loyalty_discount ?? 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "13px" }}>
                <span style={{ color: "#16a34a" }}>Điểm tích lũy</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>-{formatCurrency(order.loyalty_discount!)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", background: "#f59e0b", borderRadius: "8px", marginTop: "10px" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "15px", letterSpacing: "0.5px" }}>TỔNG CỘNG</span>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: "18px" }}>{formatCurrency(order.final_amount ?? order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* ── Payment block ── */}
        {paymentObj && (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px 18px", marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>THANH TOÁN</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "8px", columnGap: "24px", fontSize: "13px" }}>
              <div>
                <span style={{ color: "#6b7280" }}>Phương thức: </span>
                <strong style={{ color: "#111827" }}>{paymentObj.method ? String(paymentObj.method) : "—"}</strong>
              </div>              <div>
                {!!paymentObj.status && (
                  <><span style={{ color: "#6b7280" }}>Trạng thái: </span>
                  <strong style={{ color: ["PAID","CONFIRMED","COMPLETED"].includes(String(paymentObj.status).toUpperCase()) ? "#16a34a" : "#d97706" }}>
                    {["PAID","CONFIRMED","COMPLETED"].includes(String(paymentObj.status).toUpperCase()) ? "✓ Đã thanh toán" : String(paymentObj.status)}
                  </strong></>
                )}
              </div>              <div>
                {!!paymentObj.amount && <><span style={{ color: "#6b7280" }}>Số tiền: </span><strong style={{ color: "#111827" }}>{formatCurrency(Number(paymentObj.amount))}</strong></>}
              </div>
              <div>
                {!!paymentObj.paid_at && <><span style={{ color: "#6b7280" }}>Thời gian: </span><strong style={{ color: "#111827" }}>{formatDate(String(paymentObj.paid_at))}</strong></>}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#d97706", marginBottom: "4px" }}>Cảm ơn quý khách đã sử dụng dịch vụ của HYLUX COFFEE! ☕</div>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>Hóa đơn được xuất tự động — {new Date().toLocaleString("vi-VN")}</div>
        </div>      </div>
    </div>
  );
}
