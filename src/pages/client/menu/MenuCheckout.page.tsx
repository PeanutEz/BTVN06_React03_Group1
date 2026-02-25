import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore, useMenuCartTotals } from "@/store/menu-cart.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { isBranchOpen } from "@/services/branch.service";
import BranchPickerModal from "@/components/menu/BranchPickerModal";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function InputField({
  label, required, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string; }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          "w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2",
          error ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-200 focus:ring-amber-300 focus:border-amber-400 bg-white",
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function MenuCheckoutPage() {
  const navigate = useNavigate();
  const items = useMenuCartStore((s) => s.items);
  const updateQuantity = useMenuCartStore((s) => s.updateQuantity);
  const removeItem = useMenuCartStore((s) => s.removeItem);
  const clearCart = useMenuCartStore((s) => s.clearCart);

  const {
    orderMode, selectedBranch, deliveryAddress,
    currentDeliveryFee, estimatedPrepMins, estimatedDeliveryMins,
  } = useDeliveryStore();

  const branchOpen = selectedBranch ? isBranchOpen(selectedBranch) : false;
  const { itemCount, subtotal, total } = useMenuCartTotals(
    orderMode === "DELIVERY" ? currentDeliveryFee : 0,
  );

  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [form, setFormState] = useState({ name: "", phone: "", note: "", paymentMethod: "CASH" as "CASH" | "BANK" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOrdering, setIsOrdering] = useState(false);

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Vui long nhap ho ten";
    if (!form.phone.trim()) e.phone = "Vui long nhap so dien thoai";
    else if (!/^(0[3-9])\d{8}$/.test(form.phone.trim())) e.phone = "So dien thoai khong hop le";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const canPlace =
    !!selectedBranch && branchOpen && items.length > 0 &&
    (orderMode === "PICKUP" || !!deliveryAddress.rawAddress);

  async function handleOrder() {
    if (!validate() || !canPlace) return;
    setIsOrdering(true);
    await new Promise((r) => setTimeout(r, 1400));
    clearCart();
    setIsOrdering(false);
    toast.success("Da dat hang thanh cong!");
    navigate("/menu");
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Gio hang trong</h2>
          <Link to="/menu" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Quay lai Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showBranchPicker && (
        <BranchPickerModal onClose={() => { toast.success("Da cap nhat phuong thuc nhan hang"); setShowBranchPicker(false); }} />
      )}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-gray-600">Trang chu</Link>
          <span>/</span>
          <Link to="/menu" className="hover:text-gray-600">Menu</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Thanh toan</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 tracking-tight">Xac nhan don hang</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">

            {/* RECEIVING INFORMATION */}
            <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{orderMode === "PICKUP" ? "🏪" : "🛵"}</span>
                  <h2 className="font-semibold text-gray-900">
                    {orderMode === "PICKUP" ? "Diem lay hang" : "Dia chi giao hang"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowBranchPicker(true)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold border border-amber-200 hover:border-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-all"
                >
                  Thay doi
                </button>
              </div>
              {!selectedBranch ? (
                <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
                  <span className="text-4xl">📍</span>
                  <p className="text-gray-500 text-sm">Chua chon cua hang hoac dia chi</p>
                  <button onClick={() => setShowBranchPicker(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all">
                    Chon ngay
                  </button>
                </div>
              ) : orderMode === "PICKUP" ? (
                <div className="px-5 py-4 flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">🏪</div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-gray-900">{selectedBranch.name}</p>
                    <p className="text-sm text-gray-500">{selectedBranch.address}</p>
                    <p className="text-sm text-gray-400">{selectedBranch.openingHours.open} – {selectedBranch.openingHours.close}</p>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1", branchOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600")}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {branchOpen ? "Dang mo cua" : "Dong cua"}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">⏱ Chuan bi: ~{estimatedPrepMins} phut</p>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">📍</div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Dia chi giao</p>
                      <p className="font-semibold text-gray-900 text-sm">{deliveryAddress.rawAddress || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">🏪</div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Cua hang xu ly</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedBranch.name}</p>
                      <p className="text-xs text-gray-400">{selectedBranch.address}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[{ label: "Chuan bi", value: `${estimatedPrepMins} phut` },
                      { label: "Giao hang", value: `${estimatedDeliveryMins} phut` },
                      { label: "Tong", value: `${estimatedPrepMins + estimatedDeliveryMins} phut` }
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-gray-400">{item.label}</p>
                        <p className="text-xs font-bold text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Cart items */}
            <section className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">San pham <span className="text-gray-400 font-normal text-sm">({itemCount} mon)</span></h2>
                <Link to="/menu" className="text-sm text-amber-600 hover:text-amber-700 font-medium">+ Them mon</Link>
              </div>
              {items.map((item) => (
                <div key={item.cartKey} className="px-5 py-4 flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Size {item.options.size} • {item.options.sugar} — {item.options.ice}
                      {item.options.toppings.length > 0 && ` • ${item.options.toppings.map((t) => t.name).join(", ")}`}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartKey, item.quantity - 1) : removeItem(item.cartKey)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">
                          {item.quantity === 1 ? "×" : "−"}
                        </button>
                        <span className="w-6 text-center text-xs font-semibold select-none">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm">+</button>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{fmt(item.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Customer info */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 mb-1">Thong tin khach hang</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Ho va ten" required placeholder="Nguyen Van A" value={form.name}
                  onChange={(e) => setField("name", (e.target as HTMLInputElement).value)} error={errors.name} />
                <InputField label="So dien thoai" required placeholder="0901234567" type="tel" value={form.phone}
                  onChange={(e) => setField("phone", (e.target as HTMLInputElement).value)} error={errors.phone} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chu</label>
                <textarea rows={2} placeholder="Ghi chu cho cua hang..." value={form.note}
                  onChange={(e) => setField("note", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 text-sm outline-none transition-all resize-none" />
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Phuong thuc thanh toan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { value: "CASH" as const, label: "Tien mat", icon: "💵", desc: "Thanh toan khi nhan hang" },
                  { value: "BANK" as const, label: "Chuyen khoan", icon: "🏦", desc: "QR code / tai khoan ngan hang" },
                ]).map((method) => (
                  <button key={method.value} onClick={() => setField("paymentMethod", method.value)}
                    className={cn("flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150",
                      form.paymentMethod === method.value ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200" : "border-gray-200 hover:border-gray-300 bg-white")}>
                    <span className="text-2xl shrink-0">{method.icon}</span>
                    <div><p className="font-semibold text-sm text-gray-900">{method.label}</p><p className="text-xs text-gray-500 mt-0.5">{method.desc}</p></div>
                    <div className={cn("ml-auto w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-all",
                      form.paymentMethod === method.value ? "border-amber-500 bg-amber-500" : "border-gray-300")} />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Tom tat don hang</h2>
              {selectedBranch && (
                <div className={cn("mb-4 p-3 rounded-xl text-sm", orderMode === "PICKUP" ? "bg-blue-50 border border-blue-100" : "bg-emerald-50 border border-emerald-100")}>
                  <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">
                    {orderMode === "PICKUP" ? "🏪 Diem lay hang" : "🛵 Giao toi"}
                  </p>
                  <p className="text-gray-700 text-xs leading-relaxed">
                    {orderMode === "PICKUP" ? selectedBranch.address : (deliveryAddress.rawAddress || selectedBranch.name)}
                  </p>
                </div>
              )}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>Tam tinh ({itemCount} mon)</span><span>{fmt(subtotal)}</span></div>
                {orderMode === "DELIVERY" && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phi giao hang</span>
                    {currentDeliveryFee === 0 ? <span className="text-emerald-600 font-medium">Mien phi</span> : <span>{fmt(currentDeliveryFee)}</span>}
                  </div>
                )}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-base text-gray-900"><span>Tong cong</span><span className="text-amber-600">{fmt(total)}</span></div>
              </div>
              {!canPlace && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  {!selectedBranch ? "Vui long chon cua hang truoc khi dat hang" : !branchOpen ? "Cua hang dang dong cua" : "Chua xac nhan dia chi giao hang"}
                </div>
              )}
              <button onClick={handleOrder} disabled={isOrdering || !canPlace}
                className={cn("mt-3 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150",
                  isOrdering || !canPlace ? "bg-gray-200 cursor-not-allowed text-gray-400" : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200")}>
                {isOrdering ? "Dang xu ly..." : "Xac nhan dat hang"}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Bang cach dat hang, ban dong y voi <span className="text-amber-600 cursor-pointer hover:underline ml-1">Dieu khoan dich vu</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
