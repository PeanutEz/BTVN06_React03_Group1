import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMenuCartStore } from "@/store/menu-cart.store";
import { useAuthStore } from "@/store/auth.store";
import { cartClient, type CartApiData, type ApiCartItem } from "@/services/cart.client";
import { ROUTER_URL } from "@/routes/router.const";

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

interface DisplayItem {
  key: string;
  apiItemId?: string;
  name: string;
  image: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  isLocal?: boolean;
}

export default function CartPage() {
  const queryClient = useQueryClient();
  const cartId = useMenuCartStore((s) => s.cartId);
  const setCartId = useMenuCartStore((s) => s.setCartId);
  const localItems = useMenuCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const resolved = useRef(false);

  // Always fetch active cart on mount to ensure cartId is correct
  useEffect(() => {
    if (!isLoggedIn || !user || resolved.current) return;
    const customerId = String(
      (user as any)?.user?.id ?? (user as any)?.user?._id ?? (user as any)?.id ?? (user as any)?._id ?? ""
    );
    if (!customerId) return;
    resolved.current = true;
    cartClient
      .getCartsByCustomerId(customerId, { status: "ACTIVE" })
      .then((carts) => {
        const first = (carts as CartApiData[])[0];
        const id = first?._id ?? first?.id;
        if (id) setCartId(String(id));
      })
      .catch(() => {});
  }, [isLoggedIn, user, setCartId]);

  const { data: apiCart, isLoading } = useQuery({
    queryKey: ["cart-detail", cartId],
    queryFn: () => cartClient.getCartDetail(cartId!),
    enabled: !!cartId && isLoggedIn,
    staleTime: 5_000,
  });

  const apiItems: DisplayItem[] = (apiCart?.items ?? []).map((item: ApiCartItem, idx: number) => {
    const qty = item.quantity ?? 1;
    const price = item.price_snapshot ?? item.price ?? 0;
    return {
      key: item._id ?? item.id ?? `api-${idx}`,
      apiItemId: item._id ?? item.id,
      name: item.product_name_snapshot ?? item.name ?? "Sản phẩm",
      image: item.image_url ?? "",
      size: item.size,
      quantity: qty,
      unitPrice: price,
      lineTotal: item.line_total ?? price * qty,
      note: item.note,
    };
  });

  const localDisplayItems: DisplayItem[] = localItems.map((li) => ({
    key: li.cartKey,
    name: li.name,
    image: li.image,
    size: li.options.size,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    lineTotal: li.unitPrice * li.quantity,
    note: li.note,
    isLocal: true,
  }));

  const hasApiItems = apiItems.length > 0;
  const items = hasApiItems ? apiItems : localDisplayItems;
  const totalAmount = hasApiItems
    ? (apiCart?.total_amount ?? apiItems.reduce((s, i) => s + i.lineTotal, 0))
    : localDisplayItems.reduce((s, i) => s + i.lineTotal, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  async function handleUpdateQty(item: DisplayItem, newQty: number) {
    if (newQty < 1) {
      handleRemove(item);
      return;
    }
    if (item.apiItemId) {
      try {
        await cartClient.updateCartItemQuantity({ cart_item_id: item.apiItemId, quantity: newQty });
        queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
      } catch {
        toast.error("Không thể cập nhật số lượng");
      }
    } else {
      useMenuCartStore.getState().updateQuantity(item.key, newQty);
    }
  }

  async function handleRemove(item: DisplayItem) {
    if (item.apiItemId) {
      try {
        await cartClient.deleteCartItem(item.apiItemId);
        queryClient.invalidateQueries({ queryKey: ["cart-detail"] });
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      } catch {
        toast.error("Không thể xóa sản phẩm");
      }
    } else {
      useMenuCartStore.getState().removeItem(item.key);
      toast.success("Đã xóa sản phẩm");
    }
  }

  if (!isLoggedIn) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
          <span className="text-5xl mb-4">🔒</span>
          <p className="text-gray-500 font-medium">Vui lòng đăng nhập</p>
          <p className="mt-1 text-sm text-gray-400">Đăng nhập để xem giỏ hàng của bạn</p>
          <Link to={ROUTER_URL.LOGIN} className="mt-4 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-colors">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold text-green-700 mb-6">Giỏ hàng</h2>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-20">
          <span className="text-5xl mb-4">🛒</span>
          <p className="text-gray-500 font-medium">Giỏ hàng trống</p>
          <p className="mt-1 text-sm text-gray-400">Thêm sản phẩm vào giỏ hàng để tiến hành thanh toán</p>
          <Link to={ROUTER_URL.MENU} className="mt-4 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-colors">
            Xem Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-green-700">
          Giỏ hàng <span className="text-gray-400 font-normal text-base">({itemCount} sản phẩm)</span>
        </h2>
        <Link to={ROUTER_URL.MENU} className="text-sm text-green-700 hover:underline font-medium">
          + Thêm món
        </Link>
      </div>

      {!hasApiItems && localDisplayItems.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-sm">⚠️</span>
          <p className="text-xs text-amber-800">
            Giỏ hàng đang hiển thị từ dữ liệu cục bộ. Hãy thử thêm sản phẩm lại từ menu để đồng bộ với hệ thống.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {items.map((item) => (
          <div key={item.key} className="flex gap-4 p-4">
            {item.image && (
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  {item.size && <p className="text-xs text-gray-400 mt-0.5">Size {item.size}</p>}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5 italic">{item.note}</p>}
                  <p className="text-xs text-green-700 font-medium mt-0.5">{fmt(item.unitPrice)}</p>
                </div>
                <button
                  onClick={() => handleRemove(item)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Xóa"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => item.quantity > 1 ? handleUpdateQty(item, item.quantity - 1) : handleRemove(item)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    {item.quantity === 1 ? "×" : "−"}
                  </button>
                  <span className="w-7 text-center text-xs font-semibold select-none">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQty(item, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-bold text-gray-900">{fmt(item.lineTotal)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính ({itemCount} sản phẩm)</span>
            <span>{fmt(totalAmount)}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>Tổng cộng</span>
            <span className="text-green-700">{fmt(totalAmount)}</span>
          </div>
        </div>
        <Link
          to={ROUTER_URL.MENU_CHECKOUT}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Tiến hành thanh toán · {fmt(totalAmount)}
        </Link>
      </div>
    </div>
  );
}
