import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useLoadingStore } from "@/store/loading.store";
import { cartClient, toCustomerCartEntry } from "@/services/cart.client";
import { buildCartSelectionNote } from "@/utils/cartSelectionNote.util";
import {
  SUGAR_LEVELS,
  ICE_LEVELS,
  TOPPINGS,
  type MenuProduct,
  type SugarLevel,
  type IceLevel,
  type Topping,
} from "@/types/menu.types";
import { clientService } from "@/services/client.service";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
      {children}
    </p>
  );
}

interface MenuProductModalProps {
  product: MenuProduct | null;
  onClose: () => void;
  // When editing from cart, prefill sugar/ice/toppings/size/note.
  initialSelection?: {
    size?: string;
    productFranchiseId?: string; // _api product_franchise_id of chosen size
    sugar?: SugarLevel;
    ice?: IceLevel;
    toppings?: Topping[]; // Flattened toppings array (each entry = one unit)
    note?: string;
  };
  initialQuantity?: number;
  // If provided, remove the old API cart item before adding the updated one.
  replaceApiItemId?: string;
  // Khi sửa item API: truyền cartId để refetch cart sau khi xóa, tránh duplicate (xóa xong mới thêm).
  replaceCartId?: string;

  // Used by cart pages to keep item position stable after edit (delete+add can change backend ordering).
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
  }) => void;
}

interface ApiSize {
  product_franchise_id: string;
  size: string;
  price: number;
  is_available: boolean;
}

function getCustomerIdFromUser(user: unknown): string {
  const raw = user as Record<string, unknown> | null;
  const nestedUser =
    raw?.user && typeof raw.user === "object"
      ? (raw.user as Record<string, unknown>)
      : null;

  return String(
    nestedUser?.id ??
    nestedUser?._id ??
    raw?.id ??
    raw?._id ??
    "",
  );
}

function resolveCartIdFromAddResponse(raw: unknown): string | null {
  const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const nestedCart =
    rawObj?.cart && typeof rawObj.cart === "object"
      ? (rawObj.cart as Record<string, unknown>)
      : null;

  const resolved =
    rawObj?._id ??
    rawObj?.id ??
    rawObj?.cart_id ??
    rawObj?.cartId ??
    nestedCart?._id ??
    nestedCart?.id;

  return resolved == null ? null : String(resolved);
}

export default function MenuProductModal({
  product,
  onClose,
  initialSelection,
  initialQuantity,
  replaceApiItemId,
  replaceCartId,
  onSaved,
}: MenuProductModalProps) {  const queryClient = useQueryClient();
  const setCartId = useMenuCartStore((s) => s.setCartId);
  const setCarts = useMenuCartStore((s) => s.setCarts);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const user = useAuthStore((s) => s.user);
  const showGlobalLoading = useLoadingStore((s) => s.show);
  const hideGlobalLoading = useLoadingStore((s) => s.hide);

  const [tab, setTab] = useState<"order" | "content">("order");
  const [selectedSize, setSelectedSize] = useState<ApiSize | null>(null);
  const [sugar, setSugar] = useState<SugarLevel>("100%");
  const [ice, setIce] = useState<IceLevel>("Đá vừa");
  const [toppingQtys, setToppingQtys] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch toppings from API
  const [apiToppings, setApiToppings] = useState<Topping[]>([]);
  const [isFetchingToppings, setIsFetchingToppings] = useState(false);
  const desiredToppingsByNameRef = useRef<Record<string, number>>({});
  const initialToppingQtysRef = useRef<Record<string, number> | null>(null);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setTab("order");
      setSugar(initialSelection?.sugar ?? "100%");
      setIce(initialSelection?.ice ?? "Đá vừa");
      setNote(initialSelection?.note ?? "");
      setQuantity(initialQuantity ?? 1);

      // Prefill toppings quantities by topping name (diacritics-insensitive).
      // API toppings ids may differ from what is stored in cart, so we map by name.
      const norm = (s: unknown) =>
        String(s ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();
      const desiredByName: Record<string, number> = {};
      for (const t of initialSelection?.toppings ?? []) {
        const key = norm(t.name);
        if (!key) continue;
        desiredByName[key] = (desiredByName[key] ?? 0) + 1;
      }
      desiredToppingsByNameRef.current = desiredByName;
      setToppingQtys({});

      // Auto-select first available size from list-level sizes
      const listSizes: ApiSize[] = (product as any)._apiSizes ?? [];
      const desiredProductFranchiseId = initialSelection?.productFranchiseId;
      const desiredSizeLabel = initialSelection?.size?.trim().toUpperCase();
      const desiredByProductFranchiseId =
        desiredProductFranchiseId && listSizes.some((s) => s.product_franchise_id === desiredProductFranchiseId)
          ? listSizes.find((s) => s.product_franchise_id === desiredProductFranchiseId) ?? null
          : null;

      const desiredBySizeLabel =
        !desiredByProductFranchiseId && desiredSizeLabel
          ? (() => {
              const matches = listSizes.filter((s) => String(s.size ?? "").trim().toUpperCase() === desiredSizeLabel);
              return matches.length ? (matches.find((s) => s.is_available) ?? matches[0]) : null;
            })()
          : null;

      const firstAvailable = desiredByProductFranchiseId ?? desiredBySizeLabel ?? listSizes.find((s) => s.is_available) ?? listSizes[0] ?? null;
      setSelectedSize(firstAvailable);
    }
  }, [
    product?.id,
    initialQuantity,
    initialSelection?.productFranchiseId,
    initialSelection?.size,
    initialSelection?.sugar,
    initialSelection?.ice,
    initialSelection?.note,
  ]);

  // Fetch full product detail from API (CLIENT-05) to get real sizes
  const [productDetail, setProductDetail] = useState<any>(null);
  useEffect(() => {
    if (!product) {
      setProductDetail(null);
      return;
    }
    const apiFranchiseId = (product as any)?._apiFranchiseId;
    const apiProductId = (product as any)?._apiProductId;
    if (!apiFranchiseId || !apiProductId) return;

    let cancelled = false;
    (async () => {
      try {
        const { clientService } = await import("@/services/client.service");
        const detail = await clientService.getProductDetail(apiFranchiseId, apiProductId);
        if (!cancelled) {
          setProductDetail(detail);
          // Update selectedSize from detail sizes (more accurate than list-level data)
          if (detail?.sizes?.length) {
            const detailSizes: ApiSize[] = detail.sizes;
            setSelectedSize((prev) => {
              // Keep selection if product_franchise_id still exists in detail
              if (prev && detailSizes.some((s) => s.product_franchise_id === prev.product_franchise_id)) {
                return detailSizes.find((s) => s.product_franchise_id === prev.product_franchise_id) ?? prev;
              }
              return detailSizes.find((s) => s.is_available) ?? detailSizes[0] ?? null;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch product detail:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [product?.id]);

  // When editing cart items, ensure the selected size matches the cart selection,
  // even if product detail was already fetched for the same product.
  useEffect(() => {
    if (!productDetail?.sizes?.length) return;
    if (!initialSelection?.size && !initialSelection?.productFranchiseId) return;

    const detailSizes: ApiSize[] = productDetail.sizes;
    const desiredProductFranchiseId = initialSelection?.productFranchiseId;
    const desiredSizeLabel = initialSelection?.size?.trim().toUpperCase();

    setSelectedSize((prev) => {
      // Prefer match by product_franchise_id when provided.
      if (desiredProductFranchiseId && detailSizes.some((s) => s.product_franchise_id === desiredProductFranchiseId)) {
        return detailSizes.find((s) => s.product_franchise_id === desiredProductFranchiseId) ?? prev;
      }

      // Otherwise fall back to match by size label.
      if (desiredSizeLabel) {
        const bySize = detailSizes.filter((s) => String(s.size ?? "").trim().toUpperCase() === desiredSizeLabel);
        if (bySize.length) return (bySize.find((s) => s.is_available) ?? bySize[0]) as any;
      }

      return prev;
    });
  }, [productDetail, initialSelection?.productFranchiseId, initialSelection?.size]);

  // Fetch topping products from API
  useEffect(() => {
    if (!product) {
      setApiToppings([]);
      return;
    }
    const isToppingProductByCategory = normalizeText((product as any)?._apiCategoryName).includes("topping");
    if (isToppingProductByCategory) {
      setApiToppings([]);
      setToppingQtys({});
      return;
    }
    const franchiseId = (product as any)?._apiFranchiseId;
    if (!franchiseId) return;

    let cancelled = false;
    setIsFetchingToppings(true);

    (async () => {
      try {
        const toppingProducts = await clientService.getToppingsByFranchise(franchiseId);
        if (!cancelled) {
          // Map API products to Topping format with product_franchise_id
          const mappedToppings: Topping[] = toppingProducts.flatMap((p) => {
            // Use first available size or first size (guard missing/empty sizes)
            const sizes = (p as any).sizes ?? [];
            const availableSize = sizes.find((s: any) => s.is_available) ?? sizes[0];
            if (!availableSize) return [];

            // Find matching topping from TOPPINGS constant by name similarity
            const matchingTopping = TOPPINGS.find((t) =>
              p.name.toLowerCase().includes(t.name.toLowerCase()) ||
              t.name.toLowerCase().includes(p.name.toLowerCase())
            );            return [{
              id: p.product_id,
              name: p.name,
              price: availableSize.price,
              emoji: matchingTopping?.emoji ?? "➕",
              image_url: (p as any).image_url ?? undefined,
              product_franchise_id: availableSize.product_franchise_id,
            }];
          });

          setApiToppings(mappedToppings);
          // Prefill topping quantities by matching name (ids can differ between cached cart and API response).
          const desiredByName = desiredToppingsByNameRef.current;
          const normalize = (s: unknown) =>
            String(s ?? "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim()
              .toLowerCase();
          const nextQtys: Record<string, number> = {};
          for (const t of mappedToppings) {
            const key = normalize(t.name);
            nextQtys[t.id] = desiredByName[key] ?? 0;
          }
          setToppingQtys(nextQtys);
          initialToppingQtysRef.current = nextQtys;
        }
      } catch (err) {
        console.error("Failed to fetch toppings:", err);
        if (!cancelled) {
          // Don't fallback to static "fake api" toppings.
          setApiToppings([]);
          setToppingQtys({});
        }
      } finally {
        if (!cancelled) {
          setIsFetchingToppings(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [product?.id]);

  // Lock body scroll
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  if (!product) return null;

  // Use detail content if loaded, fallback to list data
  const displayContent = productDetail?.content || product.content;
  const displayImage = productDetail?.image_url || product.image;

  // Chuẩn hóa giá size: API có thể trả price_base thay vì price
  const sizePrice = (s: ApiSize & { price_base?: number }) => Number(s?.price ?? (s as any)?.price_base ?? 0);
  // Real sizes from API detail (preferred) or fallback to list-level sizes
  const displaySizesRaw: (ApiSize & { price_base?: number })[] = productDetail?.sizes ?? (product as any)._apiSizes ?? [];
  // API đôi khi trả duplicate size (vd: "M" 2 lần). Dedupe theo `size`, ưu tiên item available; chuẩn hóa price.
  const displaySizes: ApiSize[] = (() => {
    const bySize = new Map<string, ApiSize>();
    for (const s of displaySizesRaw) {
      const key = String(s.size ?? "").trim();
      if (!key) continue;
      const normalized: ApiSize = { ...s, price: sizePrice(s) };
      const prev = bySize.get(key);
      if (!prev) {
        bySize.set(key, normalized);
        continue;
      }
      if (!prev.is_available && s.is_available) {
        bySize.set(key, normalized);
      }
    }
    const order = ["S", "M", "L"];
    return Array.from(bySize.values()).sort((a, b) => {
      const ai = order.indexOf(String(a.size).toUpperCase());
      const bi = order.indexOf(String(b.size).toUpperCase());
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.price - b.price;
    });
  })();

  // Derive category info from API-enriched product or fallback
  const categoryName = (product as any)._apiCategoryName ?? "";
  const isToppingProduct = normalizeText(categoryName).includes("topping");

  // Use API toppings only (no static fallback)
  const displayToppings = isToppingProduct ? [] : apiToppings;

  const toppingTotal = displayToppings.reduce((sum, t) => sum + t.price * (toppingQtys[t.id] ?? 0), 0);
  const basePrice = selectedSize ? sizePrice(selectedSize as ApiSize & { price_base?: number }) : product.price;
  const unitPrice = basePrice + toppingTotal;
  const totalPrice = unitPrice * quantity;

  function changeToppingQty(topping: Topping, delta: number) {
    setToppingQtys((prev) => {
      const next = Math.min(3, Math.max(0, (prev[topping.id] ?? 0) + delta));
      if (next === 0) {
        const { [topping.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [topping.id]: next };
    });
  }
  async function handleAddToCart() {
    if (!product || isAdding) return;
    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      return;
    }

    const franchiseId = (product as any)._apiFranchiseId as string | undefined;
    const productFranchiseId = selectedSize?.product_franchise_id;

    if (!franchiseId || !productFranchiseId) {
      toast.error("Không thể xác định sản phẩm. Vui lòng thử lại.");
      return;
    }

    setIsAdding(true);
    // Đóng popup ngay, hiện loading toàn trang trong khi API chạy
    onClose();
    showGlobalLoading("Đang thêm vào giỏ hàng...");

    const isEditingApi = !!replaceApiItemId;
    const initSizeLabel = initialSelection?.size?.trim().toUpperCase();
    const initProductFranchiseId = initialSelection?.productFranchiseId;
    const initSugar = initialSelection?.sugar;
    const initIce = initialSelection?.ice;
    const initNote = (initialSelection?.note ?? "").trim();

    const currentSizeLabel = selectedSize?.size?.trim().toUpperCase();
    const currentProductFranchiseId = selectedSize?.product_franchise_id;

    const sizeChanged = (() => {
      if (initProductFranchiseId && currentProductFranchiseId) {
        return initProductFranchiseId !== currentProductFranchiseId;
      }
      if (initSizeLabel && currentSizeLabel) {
        return initSizeLabel !== currentSizeLabel;
      }
      return false;
    })();

    const sugarChanged = isToppingProduct ? false : (initSugar !== undefined ? initSugar !== sugar : false);
    const iceChanged = isToppingProduct ? false : (initIce !== undefined ? initIce !== ice : false);
    const noteChanged = initNote !== note.trim();

    const quantityChanged = initialQuantity !== undefined ? initialQuantity !== quantity : false;

    const initToppingQtys = initialToppingQtysRef.current;
    const toppingsChanged = (() => {
      if (!initToppingQtys) return true;
      const keys = new Set([...Object.keys(initToppingQtys), ...Object.keys(toppingQtys)]);
      for (const k of keys) {
        if ((initToppingQtys[k] ?? 0) !== (toppingQtys[k] ?? 0)) return true;
      }
      return false;
    })();

    const computeFingerprintFromCurrentSelection = () => {
      const currentToppingsFlat: Topping[] = displayToppings.flatMap((t) =>
        Array(toppingQtys[t.id] ?? 0).fill(t),
      );
      const currentUserNote = note.trim() || undefined;
      const currentApiNote = isToppingProduct
        ? currentUserNote
        : buildCartSelectionNote({
            sugar,
            ice,
            toppings: currentToppingsFlat,
            userNote: currentUserNote,
          });

      const map = new Map<string, number>();
      for (const t of currentToppingsFlat) {
        map.set(t.name, (map.get(t.name) ?? 0) + 1);
      }
      const toppingAgg = Array.from(map.entries()).map(([name, quantity]) => ({
        name,
        quantity,
      }));

      return {
        apiProductId: (product as any)?._apiProductId as string | undefined,
        apiProductFranchiseId: selectedSize?.product_franchise_id as string | undefined,
        size: selectedSize?.size,
        sugar: isToppingProduct ? undefined : sugar,
        ice: isToppingProduct ? undefined : ice,
        toppings: isToppingProduct ? undefined : (toppingAgg.length ? toppingAgg : undefined),
        note: currentApiNote,
      };
    };

    // Chỉ dùng in-place khi không có topping MỚI (thêm topping mới có thể khiến API tạo dòng riêng → duplicate).
    // Khi có topping mới (prevQty === 0, nextQty > 0) luôn dùng delete+add để thay thế 1 item bằng 1 item.
    const hasNewTopping =
      !isToppingProduct &&
      initToppingQtys &&
      displayToppings.some((t) => (initToppingQtys[t.id] ?? 0) === 0 && (toppingQtys[t.id] ?? 0) > 0);

    // Optimistic UX: for API edit, if only topping qty/quantity changed (no new toppings, size/sugar/ice/note unchanged),
    // update in-place via option endpoints instead of delete+add.
    if (
      isEditingApi &&
      !sizeChanged &&
      !sugarChanged &&
      !iceChanged &&
      !noteChanged &&
      initToppingQtys &&
      (toppingsChanged || quantityChanged) &&
      displayToppings.length > 0 &&
      replaceApiItemId &&
      !hasNewTopping
    ) {
      try {
        const cart_item_id = replaceApiItemId;
        const ops: Promise<any>[] = [];

        for (const t of displayToppings) {
          const prevQty = initToppingQtys[t.id] ?? 0;
          const nextQty = toppingQtys[t.id] ?? 0;
          if (prevQty === nextQty) continue;
          const option_product_franchise_id = t.product_franchise_id;
          if (!option_product_franchise_id) continue;

          if (nextQty <= 0) {
            ops.push(cartClient.removeOption({ cart_item_id, option_product_franchise_id }));
          } else {
            ops.push(
              cartClient.updateOption({
                cart_item_id,
                option_product_franchise_id,
                quantity: nextQty,
              }),
            );
          }
        }

        if (quantityChanged) {
          ops.push(cartClient.updateCartItemQuantity({ cart_item_id, quantity }));
        }        await Promise.all(ops);
        if (replaceCartId) {
          queryClient.invalidateQueries({ queryKey: ["cart-detail", replaceCartId] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
        }
        toast.success(`Đã cập nhật "${product.name}" trong giỏ!`);
        onSaved?.({
          replacedApiItemId: replaceApiItemId,
          fingerprint: computeFingerprintFromCurrentSelection(),
        });
        setIsAdding(false);
        hideGlobalLoading();
        return;
      } catch (err) {
        console.error("Update cart item in-place failed:", err);
        // Fallback to delete+add flow below.
      }
    }

    const toppingsFlat: Topping[] = displayToppings.flatMap((t) =>
      Array(toppingQtys[t.id] ?? 0).fill(t)
    );
    const userNote = note.trim() || undefined;
    const apiNote = isToppingProduct
      ? userNote
      : buildCartSelectionNote({
          sugar,
          ice,
          toppings: toppingsFlat,
          userNote,
        });
    // Editing from cart:
    // Use replace-in-place for local store to keep item order stable in UI.

    // 2) remove old API cart item (if any) before creating a new one
    // (we already tried in-place updates above when possible)
    if (replaceApiItemId) {
      try {
        await cartClient.deleteCartItem(replaceApiItemId);
        if (replaceCartId) {
          await queryClient.fetchQuery({
            queryKey: ["cart-detail", replaceCartId],
            queryFn: () => cartClient.getCartDetail(replaceCartId),
          });
        }      } catch {
        toast.error("Không thể cập nhật giỏ hàng (xóa item cũ thất bại).");
        setIsAdding(false);
        hideGlobalLoading();
        return;
      }
    }

    // Build options array for API (topping products)
    const apiOptions = displayToppings
      .filter((t) => (toppingQtys[t.id] ?? 0) > 0 && t.product_franchise_id)
      .map((t) => ({
        product_franchise_id: t.product_franchise_id!,
        quantity: toppingQtys[t.id] ?? 1,
      }));

    // Then call API to persist to backend
    try {
      const apiCart = await cartClient.addProduct({
        franchise_id: franchiseId,
        product_franchise_id: productFranchiseId,
        quantity,
        note: apiNote,
        options: apiOptions.length > 0 ? apiOptions : undefined,
      });

      const customerId = getCustomerIdFromUser(user);
      const resolvedId = resolveCartIdFromAddResponse(apiCart);
      if (resolvedId) {
        setCartId(resolvedId);
      }
      if (customerId) {
        try {
          const carts = await cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" });
          const entries = carts
            .map(toCustomerCartEntry)
            .filter((entry): entry is NonNullable<typeof entry> => !!entry);
          if (entries.length) setCarts(entries);
          else if (resolvedId) setCartId(resolvedId);
        } catch {
          if (resolvedId) setCartId(resolvedId);
        }
      }

      if (replaceCartId) {
        queryClient.invalidateQueries({ queryKey: ["cart-detail", replaceCartId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
      }
      queryClient.invalidateQueries({ queryKey: ["carts-by-customer"] });
      queryClient.refetchQueries({ queryKey: ["carts-by-customer"], type: "active" });
      queryClient.refetchQueries({ queryKey: ["cart-detail"], type: "active" });

      if (replaceApiItemId) {
        onSaved?.({
          replacedApiItemId: replaceApiItemId,
          fingerprint: computeFingerprintFromCurrentSelection(),
        });
      }
    } catch (err) {
      console.error("Add to cart API failed:", err);
      toast.error("Không thể cập nhật giỏ hàng. Vui lòng thử lại.");
      setIsAdding(false);
      hideGlobalLoading();
      return;
    }
    const toppingDesc = displayToppings
      .filter((t) => (toppingQtys[t.id] ?? 0) > 0)
      .map((t) => `${t.name}${toppingQtys[t.id]! > 1 ? ` x${toppingQtys[t.id]}` : ""}`)
      .join(", ");
    const selectionDesc = isToppingProduct
      ? `Size ${selectedSize?.size}${note.trim() ? ` • "${note.trim()}"` : ""}`
      : `Size ${selectedSize?.size} • ${sugar} đường • ${ice}${toppingDesc ? ` • ${toppingDesc}` : ""}${note.trim() ? ` • "${note.trim()}"` : ""}`;
    toast.success(`Đã cập nhật "${product.name}" trong giỏ!`, {
      description: selectionDesc,
    });
    setIsAdding(false);
    hideGlobalLoading();
  }

  const modal = (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-white text-black sm:rounded-2xl shadow-2xl overflow-hidden h-[92dvh] sm:h-[88dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + image */}
        <div className="relative shrink-0">
          <div className="h-44 sm:h-52 overflow-hidden bg-gray-100">
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.tags?.includes("bestseller") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">🔥 Bestseller</span>
            )}
            {product.tags?.includes("new") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">✨ Mới</span>
            )}
          </div>

          {/* Product info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            {categoryName && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {categoryName}
              </span>
            )}
            <h2 className="text-lg font-bold text-white mt-1 tracking-tight leading-tight">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={cn("w-3 h-3", i < Math.floor(product.rating) ? "text-amber-400 fill-current" : "text-white/40 fill-current")} viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-white/80">{product.rating.toFixed(1)} ({product.reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="shrink-0 flex border-b border-gray-100 bg-white">
          <button
            onClick={() => setTab("order")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all duration-150 border-b-2",
              tab === "order"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-gray-400 hover:text-gray-600",
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Đặt hàng
          </button>
          <button
            onClick={() => setTab("content")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all duration-150 border-b-2",
              tab === "content"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-gray-400 hover:text-gray-600",
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Nội dung
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
          {tab === "order" ? (
            <>
              {/* Size – from real API (product_franchise_id) */}
              <div>
                <SectionLabel>Chọn size</SectionLabel>
                {displaySizes.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Đang tải kích cỡ...</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {displaySizes.map((s) => (
                      <button
                        key={s.product_franchise_id}
                        onClick={() => s.is_available && setSelectedSize(s)}
                        disabled={!s.is_available}
                        className={cn(
                          "flex-1 min-w-[72px] py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150",
                          !s.is_available
                            ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : selectedSize?.product_franchise_id === s.product_franchise_id
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                        )}
                      >
                        <div>{s.size}</div>
                        <div className="text-[10px] font-normal mt-0.5 opacity-70">
                          {fmt(s.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isToppingProduct && (
                <>
                  {/* Sugar */}
                  <div>
                    <SectionLabel>Lượng đường</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {SUGAR_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setSugar(level)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                            sugar === level
                              ? "border-amber-500 bg-amber-50 text-amber-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ice */}
                  <div>
                    <SectionLabel>Lượng đá</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {ICE_LEVELS.map((level) => (
                        <button
                          key={level}
                          onClick={() => setIce(level)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150",
                            ice === level
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white",
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Note */}
              <div>
                <SectionLabel>Ghi chú</SectionLabel>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: ít đường hơn, không hành, dị ứng..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent placeholder:text-gray-400 transition-all"
                />
              </div>

              {!isToppingProduct && (
                <div>
                  <SectionLabel>Topping (tuỳ chọn)</SectionLabel>
                  {isFetchingToppings ? (
                    <div className="text-xs text-gray-400 py-2">Đang tải topping...</div>
                  ) : (
                    displayToppings.length === 0 ? (
                      <div className="text-xs text-gray-400 py-2">Không có topping để chọn</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {displayToppings.map((topping) => {
                          const qty = toppingQtys[topping.id] ?? 0;
                          return (
                            <div
                              key={topping.id}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-150",
                                qty > 0 ? "border-amber-500 bg-amber-50" : "border-gray-200 bg-white",
                              )}                          >
                              {/* Ảnh topping: dùng image_url từ API, fallback emoji */}
                              {topping.image_url ? (
                                <img
                                  src={topping.image_url}
                                  alt={topping.name}
                                  className="shrink-0 w-9 h-9 rounded-lg object-cover border border-gray-100"
                                />
                              ) : (
                                <span className="shrink-0 text-base">{topping.emoji}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className={cn("font-medium truncate", qty > 0 ? "text-amber-800" : "text-gray-700")}>
                                  {topping.name}
                                </div>
                                <div className="text-[10px] text-gray-400">+{fmt(topping.price)}</div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => changeToppingQty(topping, -1)}
                                  disabled={qty === 0}
                                  className="w-6 h-6 rounded-full border flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                                  title="Giảm topping"
                                >
                                  <span className="text-sm font-semibold text-gray-700 leading-none">−</span>
                                </button>
                                <span
                                  className={cn(
                                    "w-5 text-center font-semibold text-sm tabular-nums",
                                    qty > 0 ? "text-amber-800" : "text-gray-600",
                                  )}
                                >
                                  {qty}
                                </span>
                                <button
                                  onClick={() => changeToppingQty(topping, 1)}
                                  disabled={qty >= 3}
                                  className="w-6 h-6 rounded-full border flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed border-gray-300 hover:border-amber-400 hover:bg-amber-50"
                                  title="Tăng topping"
                                >
                                  <span className="text-sm font-semibold text-gray-700 leading-none">+</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            /* Content tab */
            displayContent ? (
              <div
                className="text-sm text-black leading-relaxed space-y-2 [&_*]:text-black [&>h3]:text-black [&>h3]:font-bold [&>h3]:mt-3 [&>ul]:list-disc [&>ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Chưa có mô tả chi tiết</p>
              </div>
            )
          )}
        </div>

        {/* Footer: qty + total + CTA */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="w-8 text-center text-sm font-semibold select-none">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding || !selectedSize}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all duration-150 text-sm",
                isAdding || !selectedSize
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-sm shadow-amber-200",
              )}
            >
              {isAdding ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang thêm...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Thêm vào giỏ · {fmt(totalPrice)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
