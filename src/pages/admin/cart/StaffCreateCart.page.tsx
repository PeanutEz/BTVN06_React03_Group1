import { useEffect, useMemo, useState } from "react";
import { GlassSearchSelect } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import type { ClientProductListItem } from "../../../models/product.model";
import { buildCartSelectionNote } from "../../../utils/cartSelectionNote.util";
import { ICE_LEVELS, SUGAR_LEVELS, type IceLevel, type SugarLevel, type Topping } from "../../../types/menu.types";
import { useManagerFranchiseId } from "../../../hooks/useManagerFranchiseId";
import { cartClient } from "../../../services/cart.client";
import { clientService } from "../../../services/client.service";
import { searchCustomersPaged } from "../../../services/customer.service";
import { fetchFranchiseSelect } from "../../../services/store.service";
import type { FranchiseSelectItem } from "../../../services/store.service";
import { showError, showSuccess } from "../../../utils";

type DraftItem = {
  product_franchise_id: string;
  label: string;
  quantity: number;
  note?: string;
  options?: Array<{ product_franchise_id: string; quantity: number }>;
};

type SellableItem = {
  product_franchise_id: string;
  label: string;
  name: string;
  description: string;
  image_url: string;
  size: string;
  price: number;
  category_id: string;
  category_name: string;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export default function StaffCreateCartPage() {
  const managerFranchiseId = useManagerFranchiseId();

  const [franchises, setFranchises] = useState<FranchiseSelectItem[]>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [productsLoading, setProductsLoading] = useState(false);
  const [franchiseProducts, setFranchiseProducts] = useState<ClientProductListItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [apiToppings, setApiToppings] = useState<Topping[]>([]);
  const [toppingsLoading, setToppingsLoading] = useState(false);

  const [customizingItem, setCustomizingItem] = useState<SellableItem | null>(null);
  const [customQty, setCustomQty] = useState(1);
  const [customNote, setCustomNote] = useState("");
  const [customSugar, setCustomSugar] = useState<SugarLevel>("100%");
  const [customIce, setCustomIce] = useState<IceLevel>("Đá vừa");
  const [customToppingQtys, setCustomToppingQtys] = useState<Record<string, number>>({});

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const activeFranchiseId = managerFranchiseId ?? selectedFranchiseId;

  useEffect(() => {
    fetchFranchiseSelect().then(setFranchises).catch(() => {});
    searchCustomersPaged({
      searchCondition: { keyword: "", is_active: "", is_deleted: false },
      pageInfo: { pageNum: 1, pageSize: 500 },
    })
      .then((res) => setCustomers(res.pageData.map((c) => ({ id: c.id, name: c.name, email: c.email ?? "" }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!managerFranchiseId) return;
    setSelectedFranchiseId(managerFranchiseId);
  }, [managerFranchiseId]);

  useEffect(() => {
    if (!activeFranchiseId) {
      setFranchiseProducts([]);
      setApiToppings([]);
      setSelectedCategoryId("all");
      return;
    }

    let cancelled = false;
    setProductsLoading(true);

    clientService
      .getProductsByFranchiseAndCategory(activeFranchiseId)
      .then((products) => {
        if (cancelled) return;
        setFranchiseProducts(products);
        setSelectedCategoryId("all");
      })
      .catch(() => {
        if (cancelled) return;
        setFranchiseProducts([]);
      })
      .finally(() => {
        if (cancelled) return;
        setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFranchiseId]);

  useEffect(() => {
    if (!activeFranchiseId) {
      setApiToppings([]);
      return;
    }

    let cancelled = false;
    setToppingsLoading(true);

    clientService
      .getToppingsByFranchise(activeFranchiseId)
      .then((products) => {
        if (cancelled) return;
        const toppings: Topping[] = products.flatMap((p) => {
          const sizes = (p.sizes ?? []).filter((s) => s.is_available !== false);
          const best = sizes[0];
          if (!best) return [];
          return [
            {
              id: p.product_id,
              name: p.name,
              price: Number(best.price ?? 0),
              emoji: "➕",
              image_url: p.image_url,
              product_franchise_id: best.product_franchise_id,
            },
          ];
        });
        setApiToppings(toppings);
      })
      .catch(() => {
        if (cancelled) return;
        setApiToppings([]);
      })
      .finally(() => {
        if (cancelled) return;
        setToppingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFranchiseId]);

  const franchiseOptions = franchises.map((f) => ({ value: f.value, label: `${f.name} (${f.code})` }));
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name }));

  const sellableItems = useMemo(
    () =>
      franchiseProducts.flatMap((p) =>
        (p.sizes ?? [])
          .filter((s) => !!s?.product_franchise_id && s?.is_available !== false)
          .map((s) => ({
            product_franchise_id: String(s.product_franchise_id),
            label: `${p.name} - Size ${s.size} - ${formatCurrency(Number(s.price ?? 0))}`,
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            size: s.size,
            price: Number(s.price ?? 0),
            category_id: p.category_id,
            category_name: p.category_name,
          })),
      ),
    [franchiseProducts],
  );

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of sellableItems) {
      if (!map.has(item.category_id)) {
        map.set(item.category_id, { id: item.category_id, name: item.category_name, count: 0 });
      }
      map.get(item.category_id)!.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sellableItems]);

  const visibleProducts = useMemo(() => {
    if (selectedCategoryId === "all") return sellableItems;
    return sellableItems.filter((item) => item.category_id === selectedCategoryId);
  }, [sellableItems, selectedCategoryId]);

  const categoryByProductFranchiseId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sellableItems) {
      map.set(item.product_franchise_id, item.category_id);
    }
    return map;
  }, [sellableItems]);

  useEffect(() => {
    if (selectedCategoryId === "all") return;
    setDraftItems((prev) =>
      prev.filter((item) => categoryByProductFranchiseId.get(item.product_franchise_id) === selectedCategoryId),
    );
  }, [selectedCategoryId, categoryByProductFranchiseId]);

  const handleAddDraftItem = (
    product: SellableItem,
    payload?: {
      quantity?: number;
      note?: string;
      options?: Array<{ product_franchise_id: string; quantity: number }>;
    },
  ) => {
    const safeQty = Math.max(1, Math.floor(payload?.quantity ?? quantity ?? 1));
    setDraftItems((prev) => [
      ...prev,
      {
        product_franchise_id: product.product_franchise_id,
        label: product.label,
        quantity: safeQty,
        note: (payload?.note ?? note).trim() || undefined,
        options: payload?.options,
      },
    ]);
    setQuantity(1);
    setNote("");
  };

  const openCustomizeModal = (item: SellableItem) => {
    setCustomizingItem(item);
    setCustomQty(Math.max(1, Math.floor(quantity || 1)));
    setCustomNote(note);
    setCustomSugar("100%");
    setCustomIce("Đá vừa");
    setCustomToppingQtys({});
  };

  const confirmAddCustomizedItem = () => {
    if (!customizingItem) return;

    const expandedToppings: Topping[] = [];
    const options: Array<{ product_franchise_id: string; quantity: number }> = [];

    for (const topping of apiToppings) {
      const qty = customToppingQtys[topping.id] ?? 0;
      if (qty <= 0) continue;

      for (let i = 0; i < qty; i += 1) {
        expandedToppings.push(topping);
      }

      if (topping.product_franchise_id) {
        options.push({ product_franchise_id: topping.product_franchise_id, quantity: qty });
      }
    }

    const mergedNote = buildCartSelectionNote({
      sugar: customSugar,
      ice: customIce,
      toppings: expandedToppings,
      userNote: customNote,
    });

    handleAddDraftItem(customizingItem, {
      quantity: customQty,
      note: mergedNote,
      options: options.length > 0 ? options : undefined,
    });

    setCustomizingItem(null);
  };

  const handleSubmitOfflineOrder = async () => {
    if (!activeFranchiseId) {
      showError("Vui lòng chọn chi nhánh");
      return;
    }
    if (!selectedCustomerId) {
      showError("Vui lòng chọn khách hàng");
      return;
    }
    if (draftItems.length === 0) {
      showError("Vui lòng thêm ít nhất 1 món");
      return;
    }

    setSubmitting(true);
    try {
      if (draftItems.length === 1) {
        const item = draftItems[0];
        await cartClient.addProductStaff({
          customer_id: selectedCustomerId,
          franchise_id: activeFranchiseId,
          product_franchise_id: item.product_franchise_id,
          quantity: item.quantity,
          note: item.note,
          options: item.options,
        });
      } else {
        await cartClient.addProductsStaffBulk({
          customer_id: selectedCustomerId,
          franchise_id: activeFranchiseId,
          items: draftItems.map((item) => ({
            product_franchise_id: item.product_franchise_id,
            quantity: item.quantity,
            note: item.note,
            options: item.options,
          })),
        });
      }

      showSuccess("Đặt hàng offline thành công. Cart đã tạo cho customer");
      setDraftItems([]);
      setQuantity(1);
      setNote("");
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || "Tạo cart offline thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Staff Create Cart (Offline)</h1>
        <p className="text-xs sm:text-sm text-slate-600">Trang đặt hàng offline cho nhân viên, tạo cart trực tiếp cho customer</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Chi nhánh</label>
            {managerFranchiseId ? (
              <div className="rounded-lg border border-primary-500/40 bg-primary-50 px-3 py-2 text-sm text-primary-700">
                {franchises.find((f) => f.value === managerFranchiseId)?.name ?? managerFranchiseId}
              </div>
            ) : (
              <GlassSearchSelect
                value={selectedFranchiseId}
                onChange={(v) => {
                  setSelectedFranchiseId(v);
                  setDraftItems([]);
                  setSelectedCategoryId("all");
                }}
                options={franchiseOptions}
                placeholder="-- Chọn chi nhánh --"
                searchPlaceholder="Tìm theo tên hoặc mã..."
                allLabel="-- Chọn chi nhánh --"
              />
            )}
          </div>

          <div className="min-w-[220px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</label>
            <GlassSearchSelect
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={customerOptions}
              placeholder="-- Chọn khách hàng --"
              searchPlaceholder="Tìm theo tên khách hàng..."
              allLabel="-- Chọn khách hàng --"
            />
          </div>

          <div className="w-[120px] space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-400"
            />
          </div>

          <div className="min-w-[260px] flex-1 space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: ít đá, ít đường..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-400"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 sm:gap-5">
        <aside className="xl:w-64 shrink-0 xl:sticky xl:top-24 self-start rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Danh mục</h2>
            <span className="text-xs text-slate-500">{categories.length}</span>
          </div>
          <nav className="p-2 max-h-[420px] overflow-auto">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={cn(
                "w-full mb-1 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                selectedCategoryId === "all"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              Tất cả sản phẩm ({sellableItems.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "w-full mb-1 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  selectedCategoryId === cat.id
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{cat.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{cat.count}</span>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          {!activeFranchiseId ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Chọn chi nhánh để hiển thị menu sản phẩm.
            </div>
          ) : productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-100" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-8 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : sellableItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Chi nhánh này hiện chưa có sản phẩm khả dụng.
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Danh mục này hiện chưa có sản phẩm.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Menu sản phẩm</h3>
                <span className="text-xs text-slate-500">{visibleProducts.length} món</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {visibleProducts.map((item) => (
                  <div
                    key={item.product_franchise_id}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-amber-200 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                        Size {item.size}
                      </div>
                    </div>

                    <div className="p-3.5">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-1 mb-1">{item.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{item.description}</p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-amber-700">{formatCurrency(item.price)}</span>
                        <button
                          type="button"
                          onClick={() => openCustomizeModal(item)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]",
                            "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
                          )}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>

        <aside className="xl:w-[360px] shrink-0 xl:sticky xl:top-24 self-start rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Cart offline</h2>
            <span className="text-xs text-slate-500">{draftItems.length} món</span>
          </div>

          {draftItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-400 text-sm">Chưa có món nào trong đơn</div>
          ) : (
            <div className="max-h-[360px] overflow-auto divide-y divide-slate-100">
              {draftItems.map((item, idx) => (
                <div key={`${item.product_franchise_id}-${idx}`} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>SL: {item.quantity}</span>
                    <button
                      onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </div>
                  {item.note ? <p className="mt-1 text-xs text-slate-500">Ghi chú: {item.note}</p> : null}
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              onClick={() => setDraftItems([])}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Xóa nháp
            </button>
            <button
              onClick={handleSubmitOfflineOrder}
              disabled={submitting || draftItems.length === 0 || !selectedCustomerId || !activeFranchiseId}
              className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
            >
              {submitting ? "Đang tạo cart..." : "Tạo cart"}
            </button>
          </div>
        </aside>
      </div>

      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCustomizingItem(null)} />
          <div className="relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tùy chọn món</h3>
                <p className="text-xs text-slate-500">{customizingItem.name} - Size {customizingItem.size}</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</label>
                  <input
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="VD: ít đá, ít đường..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Lượng đường</p>
                <div className="flex flex-wrap gap-2">
                  {SUGAR_LEVELS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomSugar(s)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors",
                        customSugar === s
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Lượng đá</p>
                <div className="flex flex-wrap gap-2">
                  {ICE_LEVELS.map((iceLevel) => (
                    <button
                      key={iceLevel}
                      type="button"
                      onClick={() => setCustomIce(iceLevel)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors",
                        customIce === iceLevel
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {iceLevel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Topping</p>
                {toppingsLoading ? (
                  <div className="text-sm text-slate-400">Đang tải topping...</div>
                ) : apiToppings.length === 0 ? (
                  <div className="text-sm text-slate-400">Franchise này chưa có topping khả dụng.</div>
                ) : (
                  <div className="space-y-2">
                    {apiToppings.map((topping) => {
                      const qty = customToppingQtys[topping.id] ?? 0;
                      return (
                        <div key={topping.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{topping.name}</p>
                            <p className="text-xs text-amber-700 font-semibold">{formatCurrency(topping.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setCustomToppingQtys((prev) => ({
                                  ...prev,
                                  [topping.id]: Math.max(0, (prev[topping.id] ?? 0) - 1),
                                }))
                              }
                              className="w-7 h-7 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-slate-700">{qty}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomToppingQtys((prev) => ({
                                  ...prev,
                                  [topping.id]: (prev[topping.id] ?? 0) + 1,
                                }))
                              }
                              className="w-7 h-7 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setCustomizingItem(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmAddCustomizedItem}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              >
                Xác nhận thêm món
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
