import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cartClient,
  type CartItemOption,
} from "@/services/cart.client";
import { clientService } from "@/services/client.service";
import { posService } from "@/services/pos.service";
import { buildCartSelectionNote } from "@/utils/cartSelectionNote.util";
import type {
  IceLevel,
  MenuProduct,
  SugarLevel,
  Topping,
} from "@/types/menu.types";
import { useLoadingStore } from "@/store/loading.store";
import { lockDocumentScroll } from "@/utils/scrollLock.util";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function waitForNextPaint() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

interface CartItemEditDialogProps {
  product: MenuProduct | null;
  onClose: () => void;
  initialApiOptions?: CartItemOption[];
  staffRecreateContext?: {
    customerId: string;
    franchiseId: string;
  };
  initialSelection?: {
    size?: string;
    productFranchiseId?: string;
    sugar?: SugarLevel;
    ice?: IceLevel;
    toppings?: Topping[];
    note?: string;
  };
  initialQuantity?: number;
  replaceApiItemId?: string;
  replaceCartId?: string;
  onSaved?: (payload: {
    replacedApiItemId?: string;
    fingerprint: {
      apiProductId?: string;
      apiProductFranchiseId?: string;
      size?: string;
      sugar?: SugarLevel;
      ice?: IceLevel;
      toppings?: Array<{ name: string; quantity: number }>;
      note?: string;
    };
  }) => void | Promise<void>;
}

export default function CartItemEditDialog({
  product,
  onClose,
  initialApiOptions,
  staffRecreateContext,
  initialSelection,
  initialQuantity,
  replaceApiItemId,
  replaceCartId,
  onSaved,
}: CartItemEditDialogProps) {
  const queryClient = useQueryClient();
  const showGlobalLoading = useLoadingStore((s) => s.show);
  const hideGlobalLoading = useLoadingStore((s) => s.hide);
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  const [apiToppings, setApiToppings] = useState<Topping[]>([]);
  const [toppingQtys, setToppingQtys] = useState<Record<string, number>>({});
  const [note, setNote] = useState(initialSelection?.note ?? "");
  const [isFetchingToppings, setIsFetchingToppings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialToppingQtysRef = useRef<Record<string, number>>({});
  const toppingsLoadingActiveRef = useRef(false);
  const saveLoadingActiveRef = useRef(false);
  const categoryName = (product as any)?._apiCategoryName ?? "";
  const isToppingProduct = normalizeText(categoryName).includes("topping");
  const franchiseId = String((product as any)?._apiFranchiseId ?? "").trim();

  useEffect(() => {
    setQuantity(initialQuantity ?? 1);
  }, [initialQuantity, product?.id, replaceApiItemId]);

  useEffect(() => {
    setNote(initialSelection?.note ?? "");
  }, [initialSelection?.note, product?.id, replaceApiItemId]);

  useEffect(() => {
    if (!product) return;
    return lockDocumentScroll();
  }, [product]);

  useEffect(() => {
    if (!product) {
      setApiToppings([]);
      setToppingQtys({});
      initialToppingQtysRef.current = {};
      setIsFetchingToppings(false);
      return;
    }

    if (isToppingProduct) {
      setApiToppings([]);
      setToppingQtys({});
      initialToppingQtysRef.current = {};
      setIsFetchingToppings(false);
      return;
    }

    if (!franchiseId) {
      setApiToppings([]);
      setToppingQtys({});
      initialToppingQtysRef.current = {};
      setIsFetchingToppings(false);
      return;
    }

    const desiredByOptionId = new Map<string, number>();
    for (const option of initialApiOptions ?? []) {
      const optionId = String(option.product_franchise_id ?? "").trim();
      if (!optionId) continue;
      desiredByOptionId.set(optionId, Math.max(0, option.quantity ?? 0));
    }

    const desiredByName = new Map<string, number>();
    for (const topping of initialSelection?.toppings ?? []) {
      const key = normalizeText(topping.name);
      if (!key) continue;
      desiredByName.set(key, (desiredByName.get(key) ?? 0) + 1);
    }

    let cancelled = false;
    setIsFetchingToppings(true);
    toppingsLoadingActiveRef.current = true;
    showGlobalLoading("Đang tải tùy chọn chỉnh sửa...");

    (async () => {
      try {
        const toppingProducts = await clientService.getToppingsByFranchise(franchiseId);
        if (cancelled) return;

        const mappedToppings: Topping[] = toppingProducts.flatMap((item) => {
          const sizes = (item as any).sizes ?? [];
          const availableSize = sizes.find((size: any) => size.is_available) ?? sizes[0];
          if (!availableSize) return [];
          return [{
            id: String((item as any).product_id ?? availableSize.product_franchise_id),
            name: item.name,
            price: Number(availableSize.price ?? 0),
            emoji: "🍮",
            image_url: (item as any).image_url ?? undefined,
            product_franchise_id: availableSize.product_franchise_id,
          }];
        });

        const nextQtys: Record<string, number> = {};
        mappedToppings.forEach((topping) => {
          const optionId = String(topping.product_franchise_id ?? "").trim();
          nextQtys[topping.id] =
            (optionId ? desiredByOptionId.get(optionId) : undefined) ??
            desiredByName.get(normalizeText(topping.name)) ??
            0;
        });

        setApiToppings(mappedToppings);
        setToppingQtys(nextQtys);
        initialToppingQtysRef.current = nextQtys;
      } catch (error) {
        console.error("Failed to fetch toppings for cart edit dialog:", error);
        if (!cancelled) {
          setApiToppings([]);
          setToppingQtys({});
          initialToppingQtysRef.current = {};
        }
      } finally {
        if (!cancelled) {
          setIsFetchingToppings(false);
          await waitForNextPaint();
          if (cancelled) return;
          if (toppingsLoadingActiveRef.current) {
            toppingsLoadingActiveRef.current = false;
            if (!saveLoadingActiveRef.current) {
              hideGlobalLoading();
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (toppingsLoadingActiveRef.current) {
        toppingsLoadingActiveRef.current = false;
        if (!saveLoadingActiveRef.current) {
          hideGlobalLoading();
        }
      }
    };
  }, [
    product?.id,
    replaceApiItemId,
    isToppingProduct,
    franchiseId,
    initialSelection?.toppings,
    initialApiOptions,
    staffRecreateContext,
    showGlobalLoading,
    hideGlobalLoading,
  ]);

  const itemName = product?.name ?? "Sản phẩm";
  const itemImage = product?.image ?? "";
  const canEdit = !!product && !!replaceApiItemId;
  const displayToppings = apiToppings;
  const isLoadingOverlayActive = isFetchingToppings || isSaving;

  const toppingNameByOptionId = useMemo(() => {
    const map = new Map<string, string>();
    displayToppings.forEach((topping) => {
      const optionId = String(topping.product_franchise_id ?? "").trim();
      if (!optionId) return;
      map.set(optionId, topping.name);
    });
    return map;
  }, [displayToppings]);

  const currentOptionBadges = useMemo(
    () =>
      (initialApiOptions ?? []).flatMap((option) => {
        const optionId = String(option.product_franchise_id ?? "").trim();
        if (!optionId) return [];
        const optionName =
          String(
            (option as any).product_name ??
            option.product_name_snapshot ??
            option.name ??
            toppingNameByOptionId.get(optionId) ??
            "",
          ).trim() || "Topping";
        return [`${optionName} x${option.quantity ?? 0}`];
      }),
    [initialApiOptions, toppingNameByOptionId],
  );

  function changeToppingQty(topping: Topping, delta: number) {
    setToppingQtys((prev) => {
      const nextValue = Math.max(0, Math.min(3, (prev[topping.id] ?? 0) + delta));
      if (nextValue === 0) {
        const { [topping.id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [topping.id]: nextValue };
    });
  }

  function buildFingerprint() {
    const toppingMap = new Map<string, number>();
    displayToppings.forEach((topping) => {
      const qty = toppingQtys[topping.id] ?? 0;
      if (qty <= 0) return;
      toppingMap.set(topping.name, qty);
    });

    const userNote = note.trim() || undefined;
    const noteForApi = isToppingProduct
      ? userNote
      : (initialSelection?.sugar && initialSelection?.ice)
        ? buildCartSelectionNote({
            sugar: initialSelection.sugar,
            ice: initialSelection.ice,
            userNote,
          })
        : userNote;

    return {
      apiProductId: (product as any)?._apiProductId as string | undefined,
      apiProductFranchiseId: initialSelection?.productFranchiseId,
      size: initialSelection?.size,
      sugar: initialSelection?.sugar,
      ice: initialSelection?.ice,
      toppings: toppingMap.size
        ? Array.from(toppingMap.entries()).map(([name, qty]) => ({
            name,
            quantity: qty,
          }))
        : undefined,
      note: noteForApi,
    };
  }

  async function handleSave() {
    if (!canEdit || !replaceApiItemId || isSaving) return;

    const initialQty = initialQuantity ?? 1;
    const quantityChanged = quantity !== initialQty;
    const initialNote = (initialSelection?.note ?? "").trim();
    const currentNote = note.trim();
    const noteChanged = initialNote !== currentNote;
    const changedToppings = displayToppings.filter((topping) => {
      const prevQty = initialToppingQtysRef.current[topping.id] ?? 0;
      const nextQty = toppingQtys[topping.id] ?? 0;
      return prevQty !== nextQty;
    });

    if (!quantityChanged && changedToppings.length === 0 && !noteChanged) {
      onClose();
      return;
    }

    const noteForApi = isToppingProduct
      ? currentNote || undefined
      : (initialSelection?.sugar && initialSelection?.ice)
        ? buildCartSelectionNote({
            sugar: initialSelection.sugar,
            ice: initialSelection.ice,
            userNote: currentNote || undefined,
          })
        : (currentNote || undefined);

    const selectedOptions: CartItemOption[] = displayToppings
      .filter((topping) => (toppingQtys[topping.id] ?? 0) > 0 && topping.product_franchise_id)
      .map((topping) => ({
        product_franchise_id: topping.product_franchise_id!,
        quantity: toppingQtys[topping.id] ?? 0,
      }));

    setIsSaving(true);
    saveLoadingActiveRef.current = true;
    showGlobalLoading("Đang lưu thay đổi...");

    try {
      if (noteChanged) {
        const franchiseId = String((product as any)?._apiFranchiseId ?? "").trim();
        const productFranchiseId = String(initialSelection?.productFranchiseId ?? "").trim();

        if (franchiseId && productFranchiseId) {
          await cartClient.deleteCartItem(replaceApiItemId);
          if (staffRecreateContext?.customerId && staffRecreateContext?.franchiseId) {
            await posService.addProductToCart({
              customer_id: staffRecreateContext.customerId,
              franchise_id: staffRecreateContext.franchiseId,
              product_franchise_id: productFranchiseId,
              quantity,
              note: noteForApi,
              options: selectedOptions.length > 0 ? selectedOptions : undefined,
            });
          } else {
            await cartClient.addProduct({
              franchise_id: franchiseId,
              product_franchise_id: productFranchiseId,
              quantity,
              note: noteForApi,
              options: selectedOptions.length > 0 ? selectedOptions : undefined,
            });
          }
        } else {
          await cartClient.updateCartItemQuantity({
            cart_item_id: replaceApiItemId,
            quantity,
            note: noteForApi,
          });
        }
      } else {
        if (quantityChanged) {
          await cartClient.updateCartItemQuantity({
            cart_item_id: replaceApiItemId,
            quantity,
          });
        }

        if (changedToppings.length > 0) {
        const hasAddedNewTopping = changedToppings.some((topping) => {
          const prevQty = initialToppingQtysRef.current[topping.id] ?? 0;
          const nextQty = toppingQtys[topping.id] ?? 0;
          return prevQty === 0 && nextQty > 0;
        });

        if (
          selectedOptions.length > 0 &&
          (hasAddedNewTopping || changedToppings.length > 1)
        ) {
          await cartClient.updateOptionsCartItem({
            cart_item_id: replaceApiItemId,
            options: selectedOptions,
          });
        } else {
          for (const topping of changedToppings) {
            const optionId = topping.product_franchise_id;
            if (!optionId) continue;
            const nextQty = toppingQtys[topping.id] ?? 0;
            if (nextQty <= 0) {
              await cartClient.removeOption({
                cart_item_id: replaceApiItemId,
                option_product_franchise_id: optionId,
              });
            } else {
              await cartClient.updateOption({
                cart_item_id: replaceApiItemId,
                option_product_franchise_id: optionId,
                quantity: nextQty,
              });
            }
          }
        }
        }
      }

      if (replaceCartId) {
        await queryClient.invalidateQueries({ queryKey: ["cart-detail", replaceCartId] });
        await queryClient.refetchQueries({ queryKey: ["cart-detail", replaceCartId], type: "active" });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
        await queryClient.refetchQueries({ queryKey: ["cart-detail"], type: "active" });
      }
      await queryClient.invalidateQueries({ queryKey: ["carts-by-customer"] });
      await queryClient.refetchQueries({ queryKey: ["carts-by-customer"], type: "active" });

      await onSaved?.({
        replacedApiItemId: replaceApiItemId,
        fingerprint: buildFingerprint(),
      });

      toast.success(`Đã cập nhật "${itemName}" trong giỏ hàng`);
      await waitForNextPaint();
      onClose();
    } catch (error) {
      console.error("Cart item edit failed:", error);
      toast.error("Không thể cập nhật sản phẩm trong giỏ hàng.");
    } finally {
      saveLoadingActiveRef.current = false;
      setIsSaving(false);
      hideGlobalLoading();
    }
  }

  if (!canEdit) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      onClick={isLoadingOverlayActive ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[92dvh] min-h-0 w-full flex-col overflow-hidden bg-white text-black shadow-2xl sm:max-h-[88dvh] sm:max-w-lg sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-100 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_46%),linear-gradient(180deg,_#fff,_#fffaf1)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                Chỉnh sửa món
              </p>
              <h2 className="mt-3 text-lg font-bold text-gray-900">Cập nhật giỏ hàng</h2>
              <p className="mt-1 text-sm text-gray-500">
                Điều chỉnh số lượng, topping và ghi chú theo ý bạn.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm ring-1 ring-gray-200 transition hover:bg-white hover:text-gray-700"
              aria-label="Đóng"
              disabled={isLoadingOverlayActive}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <>
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-5">
              <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-sm">
                <div className="flex gap-4">
                  {itemImage ? (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                      <img src={itemImage} alt={itemName} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-black/5">
                      🍵
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-gray-900">{itemName}</h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {initialSelection?.size && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Size: {initialSelection.size}
                        </span>
                      )}
                      {initialSelection?.sugar && (
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                          Đường: {initialSelection.sugar}
                        </span>
                      )}
                      {initialSelection?.ice && (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                          Đá: {initialSelection.ice}
                        </span>
                      )}
                    </div>

                    {currentOptionBadges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentOptionBadges.map((label, idx) => (
                          <span
                            key={`${label}-${idx}`}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {initialSelection?.note && (
                      <div className="mt-3 rounded-2xl bg-white/90 px-3 py-2 text-xs text-gray-600 ring-1 ring-amber-100">
                        <span className="font-semibold text-gray-800">Ghi chú:</span> {initialSelection.note}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Topping
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {displayToppings.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                      Sản phẩm này hiện chưa có topping để chỉnh sửa.
                    </p>
                  )}

                  {displayToppings.map((topping) => {
                    const qty = toppingQtys[topping.id] ?? 0;

                    return (
                      <div
                        key={topping.id}
                        className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/90 px-3 py-3"
                      >
                        {topping.image_url ? (
                          <img
                            src={topping.image_url}
                            alt={topping.name}
                            className="h-12 w-12 shrink-0 rounded-xl bg-white object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                            {topping.emoji || "🍮"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{topping.name}</p>
                          <p className="text-xs text-gray-500">{fmt(topping.price)}</p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-2 py-1 shadow-sm">
                          <button
                            onClick={() => changeToppingQty(topping, -1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-base text-gray-600 transition hover:bg-gray-100"
                            disabled={isSaving || qty <= 0}
                          >
                            -
                          </button>
                          <span className="w-5 text-center text-sm font-semibold text-gray-900">{qty}</span>
                          <button
                            onClick={() => changeToppingQty(topping, 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-base text-gray-600 transition hover:bg-gray-100"
                            disabled={isSaving || qty >= 3}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Note
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-gray-900">Ghi chú thêm cho món</h4>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ví dụ: Ít ngọt hơn bình thường, giao ly lớn..."
                  rows={3}
                  maxLength={160}
                  disabled={isSaving}
                  className="mt-3 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">
                  {note.trim().length}/160
                </p>
              </section>
            </div>

            <div className="border-t border-gray-100 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 px-2 shadow-sm">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-100"
                    disabled={quantity <= 1 || isSaving}
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-100"
                    disabled={isSaving}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => void handleSave()}
                  className="flex h-12 flex-[1.3] items-center justify-center gap-2 rounded-2xl bg-amber-500 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                  disabled={isSaving}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
        </>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
