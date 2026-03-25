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
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-2 after:flex-1 after:h-px after:bg-gray-100 after:content-['']">
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
  const rawContent = productDetail?.content || product.content;
  // Decode HTML entities if the string contains escaped tags (e.g. &lt;h3&gt;)
  const displayContent = (() => {
    if (!rawContent) return rawContent;
    // If it looks like escaped HTML, decode it via a textarea trick
    if (rawContent.includes("&lt;") || rawContent.includes("&amp;") || rawContent.includes("&#")) {
      try {
        const txt = document.createElement("textarea");
        txt.innerHTML = rawContent;
        return txt.value;
      } catch {
        return rawContent;
      }
    }
    return rawContent;
  })();
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
  }  const modal = (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-3xl bg-white text-black rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row h-[92dvh] sm:h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── LEFT: image panel ─────────────────────────── */}
        <div className="relative sm:w-[42%] shrink-0 bg-gray-100 overflow-hidden">
          {/* mobile: fixed height, desktop: full panel */}
          <div className="h-48 sm:h-full w-full">
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Close — always top-right of image panel */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg"
            aria-label="Đóng"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tags */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {product.tags?.includes("bestseller") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow">🔥 Bestseller</span>
            )}
            {product.tags?.includes("new") && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow">✨ Mới</span>
            )}
          </div>

          {/* Product info overlay — bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8 bg-gradient-to-t from-black/80 to-transparent">
            {categoryName && (
              <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white/90 backdrop-blur-sm border border-white/20 mb-2">
                {categoryName}
              </span>
            )}
            <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className={cn("w-3 h-3", i < Math.floor(product.rating) ? "text-amber-400 fill-current" : "text-white/30 fill-current")} viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-white/70">{product.rating.toFixed(1)} ({product.reviewCount})</span>
            </div>
            {/* Base price chip — desktop */}
            <div className="hidden sm:inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-amber-500/90 backdrop-blur-sm">
              <span className="text-sm font-bold text-white">
                {selectedSize ? fmt(sizePrice(selectedSize as ApiSize & { price_base?: number })) : fmt(product.price)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: order panel ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 bg-white sm:rounded-r-3xl">
          {/* Tab switcher */}
          <div className="shrink-0 flex border-b border-gray-100 bg-white sm:rounded-tr-3xl">
            <button
              onClick={() => setTab("order")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold transition-all duration-150 border-b-2",
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
                "flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-semibold transition-all duration-150 border-b-2",
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
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {tab === "order" ? (
              <>
                {/* Size */}
                <div>
                  <SectionLabel>Chọn size</SectionLabel>
                  {displaySizes.length === 0 ? (
                    <div className="flex gap-2">
                      {[1,2,3].map(i => <div key={i} className="flex-1 h-14 rounded-xl bg-gray-100 animate-pulse" />)}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {displaySizes.map((s) => (
                        <button
                          key={s.product_franchise_id}
                          onClick={() => s.is_available && setSelectedSize(s)}
                          disabled={!s.is_available}
                          className={cn(
                            "flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all duration-150 relative",
                            !s.is_available
                              ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                              : selectedSize?.product_franchise_id === s.product_franchise_id
                              ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm shadow-amber-100"
                              : "border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50/40 bg-white",
                          )}
                        >
                          {selectedSize?.product_franchise_id === s.product_franchise_id && s.is_available && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                          )}
                          <div className="text-base">{s.size}</div>
                          <div className={cn("text-[11px] font-normal mt-0.5", selectedSize?.product_franchise_id === s.product_franchise_id ? "text-amber-500" : "text-gray-400")}>
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
                              "px-3.5 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150",
                              sugar === level
                                ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                                : "border-gray-200 text-gray-500 hover:border-amber-300 hover:bg-amber-50/40 bg-white",
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
                              "px-3.5 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all duration-150",
                              ice === level
                                ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                                : "border-gray-200 text-gray-500 hover:border-sky-300 hover:bg-sky-50/40 bg-white",
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
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 resize-none focus:outline-none focus:ring-0 focus:border-amber-400 focus:bg-white placeholder:text-gray-300 transition-all"
                  />
                </div>                {/* Toppings */}
                {!isToppingProduct && (
                  <div>
                    <SectionLabel>Topping (tuỳ chọn)</SectionLabel>
                    {isFetchingToppings ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
                      </div>
                    ) : displayToppings.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">Không có topping</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {displayToppings.map((topping) => {
                          const qty = toppingQtys[topping.id] ?? 0;
                          return (
                            <div
                              key={topping.id}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-xs transition-all duration-150",
                                qty > 0
                                  ? "border-amber-400 bg-amber-50 shadow-sm shadow-amber-100"
                                  : "border-gray-200 bg-white hover:border-gray-300",
                              )}
                            >
                              {/* Ảnh topping */}
                              {topping.image_url ? (
                                <img
                                  src={topping.image_url}
                                  alt={topping.name}
                                  className="shrink-0 w-10 h-10 rounded-lg object-cover border border-gray-100"
                                />
                              ) : (
                                <span className="shrink-0 text-xl">{topping.emoji}</span>
                              )}

                              {/* Tên + giá */}
                              <div className="flex-1 min-w-0">
                                <div className={cn("font-semibold text-[12px] leading-tight", qty > 0 ? "text-amber-800" : "text-gray-700")}>
                                  {topping.name}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5">+{fmt(topping.price)}</div>
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => changeToppingQty(topping, -1)}
                                  disabled={qty === 0}
                                  className={cn(
                                    "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-base font-bold leading-none",
                                    qty > 0
                                      ? "border-amber-400 text-amber-600 hover:bg-amber-100 active:scale-95"
                                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                                  )}
                                >−</button>
                                <span className={cn("w-5 text-center font-bold text-sm tabular-nums", qty > 0 ? "text-amber-700" : "text-gray-400")}>
                                  {qty}
                                </span>
                                <button
                                  onClick={() => changeToppingQty(topping, 1)}
                                  disabled={qty >= 3}
                                  className={cn(
                                    "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-base font-bold leading-none",
                                    qty < 3
                                      ? "border-amber-400 text-amber-600 hover:bg-amber-100 active:scale-95"
                                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                                  )}
                                >+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (              /* Content tab */
              displayContent ? (
                <div
                  className={[
                    "product-content text-sm text-gray-800 leading-relaxed",
                    // headings
                    "[&_h1]:text-xl [&_h1]:font-extrabold [&_h1]:text-gray-900 [&_h1]:mt-5 [&_h1]:mb-2",
                    "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-1.5",
                    "[&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-1",
                    "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:mt-3 [&_h4]:mb-1",
                    // paragraphs
                    "[&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-2",
                    // bold / italic
                    "[&_b]:font-bold [&_b]:text-gray-900",
                    "[&_strong]:font-bold [&_strong]:text-gray-900",
                    "[&_i]:italic [&_em]:italic",
                    // lists
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1",
                    "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1",
                    "[&_li]:text-gray-700",
                    // links
                    "[&_a]:text-amber-600 [&_a]:underline [&_a]:hover:text-amber-700",
                    // tables
                    "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3",
                    "[&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-600 [&_th]:border [&_th]:border-gray-200",
                    "[&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-gray-700 [&_td]:border [&_td]:border-gray-200",
                    // spans (don't force color on all spans, let inherit)
                    "[&_span]:leading-relaxed",
                    // first element no top margin
                    "[&>*:first-child]:mt-0",
                  ].join(" ")}
                  dangerouslySetInnerHTML={{ __html: displayContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">Chưa có mô tả chi tiết</p>
                </div>
              )
            )}
          </div>

          {/* Footer: qty + CTA */}
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:rounded-br-3xl">
            <div className="flex items-center gap-3">
              {/* Quantity stepper */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                  </svg>
                </button>
                <span className="w-7 text-center text-sm font-bold select-none tabular-nums">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-white hover:shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={isAdding || !selectedSize}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-150 text-sm tracking-wide",
                  isAdding || !selectedSize
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white shadow-lg shadow-amber-200/60",
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
          </div>        </div>
      </div>
    </div>
  );
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
