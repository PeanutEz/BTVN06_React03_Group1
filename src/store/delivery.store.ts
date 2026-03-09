import { create } from "zustand";
import type {
  OrderMode,
  DeliveryAddress,
  AddressValidationResult,
  PlacedOrder,
  PaymentStatus,
  PaymentTransaction,
  Branch,
} from "@/types/delivery.types";
import {
  validateDeliveryAddress,
  geocodeAddress,
  calcDeliveryFee,
  isBranchOpen,
  getBranchById,
  estimateTotalTime,
} from "@/services/branch.service";
import { getItem, setItem } from "@/utils/localstorage.util";

const STORAGE_KEY_DELIVERY = "hylux_delivery_state";
const STORAGE_KEY_ORDERS = "hylux_placed_orders";

interface DeliveryState {
  orderMode: OrderMode;
  selectedBranch: Branch | null;
  deliveryAddress: DeliveryAddress;
  validationResult: AddressValidationResult | null;
  isValidating: boolean;
<<<<<<< HEAD

  // Franchise selection for client menu
  selectedFranchiseId: string | null;
  selectedFranchiseName: string | null;

  // ── Flags ─────────────────────────────────────────────────────────
  isInitialized: boolean; // true after localStorage has been read

  // ── Computed ─────────────────────────────────────────────────────
=======
  isInitialized: boolean;
>>>>>>> 35e5ea3f50822c6d0514267d3e95762554491e4e
  isReadyToOrder: boolean;
  currentDeliveryFee: number;
  estimatedPrepMins: number;
  estimatedDeliveryMins: number;
  placedOrders: PlacedOrder[];
  hydrate: () => void;
  setOrderMode: (mode: OrderMode) => void;
  setSelectedBranch: (branch: Branch | null, clearCart?: () => void) => void;
  setDeliveryAddress: (address: string) => void;
  validateAddress: () => Promise<void>;
  setSelectedFranchiseId: (id: string | null, name?: string | null) => void;
  placeOrder: (order: PlacedOrder) => void;
  updateOrderPayment: (
    orderId: string,
    paymentStatus: PaymentStatus,
    transaction?: PaymentTransaction,
  ) => void;
  getOrderById: (orderId: string) => PlacedOrder | undefined;
  advanceOrderStatus: (orderId: string) => void;
  reset: () => void;
}

function computeReady(
  mode: OrderMode,
  branch: Branch | null,
  validation: AddressValidationResult | null,
): boolean {
  if (!branch) return false;
  if (!isBranchOpen(branch)) return false;
  if (mode === "DELIVERY") return validation?.isValid === true;
  return true;
}

function _loadInitialState() {
  const saved = getItem<{
    orderMode: OrderMode;
    selectedBranchId: string | null;
    selectedFranchiseId?: string | null;
    selectedFranchiseName?: string | null;
    deliveryAddress: DeliveryAddress;
    validationResult: AddressValidationResult | null;
  }>(STORAGE_KEY_DELIVERY);
  const orders = getItem<PlacedOrder[]>(STORAGE_KEY_ORDERS) || [];

  if (!saved) return { placedOrders: orders, isInitialized: true };

  const branch = saved.selectedBranchId ? getBranchById(saved.selectedBranchId) ?? null : null;
  const mode: OrderMode = saved.orderMode ?? "DELIVERY";
  const validation = saved.validationResult ?? null;
  const fee = branch && validation?.distanceKm != null ? calcDeliveryFee(branch, validation.distanceKm) : 0;
  const times = branch
    ? estimateTotalTime(branch, mode, validation?.distanceKm ?? undefined)
    : { prepMins: 0, deliveryMins: 0, totalMins: 0 };

  return {
    orderMode: mode,
    selectedBranch: branch,
    selectedFranchiseId: saved.selectedFranchiseId ?? null,
    selectedFranchiseName: saved.selectedFranchiseName ?? null,
    deliveryAddress: saved.deliveryAddress ?? { rawAddress: "", coord: null },
    validationResult: validation,
    isReadyToOrder: computeReady(mode, branch, validation),
    currentDeliveryFee: mode === "DELIVERY" ? fee : 0,
    estimatedPrepMins: times.prepMins,
    estimatedDeliveryMins: times.deliveryMins,
    placedOrders: orders,
    isInitialized: true,
  };
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  orderMode: "DELIVERY",
  selectedBranch: null,
  selectedFranchiseId: null,
  selectedFranchiseName: null,
  deliveryAddress: { rawAddress: "", coord: null },
  validationResult: null,
  isValidating: false,
  isReadyToOrder: false,
  currentDeliveryFee: 0,
  estimatedPrepMins: 0,
  estimatedDeliveryMins: 0,
  ..._loadInitialState(),

  hydrate: () => {
    const saved = getItem<{
      orderMode: OrderMode;
      selectedBranchId: string | null;
      selectedFranchiseId?: string | null;
      selectedFranchiseName?: string | null;
      deliveryAddress: DeliveryAddress;
      validationResult: AddressValidationResult | null;
    }>(STORAGE_KEY_DELIVERY);
    const orders = getItem<PlacedOrder[]>(STORAGE_KEY_ORDERS) || [];

    if (saved) {
      const branch = saved.selectedBranchId ? getBranchById(saved.selectedBranchId) ?? null : null;
      const mode = saved.orderMode ?? "DELIVERY";
      const validation = saved.validationResult ?? null;
      const fee = branch && validation?.distanceKm != null
        ? calcDeliveryFee(branch, validation.distanceKm)
        : 0;
      const times = branch
        ? estimateTotalTime(branch, mode, validation?.distanceKm ?? undefined)
        : { prepMins: 0, deliveryMins: 0, totalMins: 0 };
      set({
        orderMode: mode,
        selectedBranch: branch,
        selectedFranchiseId: saved.selectedFranchiseId ?? null,
        selectedFranchiseName: saved.selectedFranchiseName ?? null,
        deliveryAddress: saved.deliveryAddress ?? { rawAddress: "", coord: null },
        validationResult: validation,
        isValidating: false,
        isInitialized: true,
        isReadyToOrder: computeReady(mode, branch, validation),
        currentDeliveryFee: mode === "DELIVERY" ? fee : 0,
        estimatedPrepMins: times.prepMins,
        estimatedDeliveryMins: times.deliveryMins,
        placedOrders: orders,
      });
    } else {
      set({ placedOrders: orders, isInitialized: true });
    }
  },

  setOrderMode: (mode) => {
    const { selectedBranch, validationResult } = get();
    const fee =
      mode === "DELIVERY" && selectedBranch && validationResult?.distanceKm != null
        ? calcDeliveryFee(selectedBranch, validationResult.distanceKm)
        : 0;
    const times = selectedBranch
      ? estimateTotalTime(selectedBranch, mode, validationResult?.distanceKm ?? undefined)
      : { prepMins: 0, deliveryMins: 0, totalMins: 0 };
    set({
      orderMode: mode,
      currentDeliveryFee: fee,
      estimatedPrepMins: times.prepMins,
      estimatedDeliveryMins: times.deliveryMins,
      isReadyToOrder: computeReady(mode, selectedBranch, validationResult),
    });
    _persist(get);
  },

  setSelectedBranch: (branch, clearCart) => {
    const { selectedBranch, orderMode, validationResult } = get();
    if (selectedBranch && branch && selectedBranch.id !== branch.id && clearCart) {
      clearCart();
    }
    const fee =
      orderMode === "DELIVERY" && branch && validationResult?.distanceKm != null
        ? calcDeliveryFee(branch, validationResult.distanceKm)
        : 0;
    const times = branch
      ? estimateTotalTime(branch, orderMode, validationResult?.distanceKm ?? undefined)
      : { prepMins: 0, deliveryMins: 0, totalMins: 0 };
    set({
      selectedBranch: branch,
      currentDeliveryFee: fee,
      estimatedPrepMins: times.prepMins,
      estimatedDeliveryMins: times.deliveryMins,
      isReadyToOrder: computeReady(orderMode, branch, validationResult),
    });
    _persist(get);
  },

  setDeliveryAddress: (rawAddress) => {
    set({
      deliveryAddress: { rawAddress, coord: null },
      validationResult: null,
      isReadyToOrder: false,
    });
  },

  validateAddress: async () => {
    const { deliveryAddress, orderMode } = get();
    if (!deliveryAddress.rawAddress.trim()) return;
    set({ isValidating: true });

    await new Promise((r) => setTimeout(r, 600));

    const coord = geocodeAddress(deliveryAddress.rawAddress);
    if (!coord) {
      set({
        isValidating: false,
        deliveryAddress: { rawAddress: deliveryAddress.rawAddress, coord: null },
        validationResult: {
          isValid: false,
          nearestBranch: null,
          distanceKm: null,
          estimatedDeliveryFee: null,
          message: "Không thể xác định địa chỉ. Vui lòng nhập rõ hơn (ví dụ: Hoàn Kiếm, Hà Nội).",
        },
        isReadyToOrder: false,
        currentDeliveryFee: 0,
      });
      _persist(get);
      return;
    }

    const result = validateDeliveryAddress(coord);
    const branch = result.nearestBranch;
    const fee = branch && result.distanceKm != null ? calcDeliveryFee(branch, result.distanceKm) : 0;
    const times = branch
      ? estimateTotalTime(branch, orderMode, result.distanceKm ?? undefined)
      : { prepMins: 0, deliveryMins: 0, totalMins: 0 };

    set({
      isValidating: false,
      deliveryAddress: { rawAddress: deliveryAddress.rawAddress, coord },
      validationResult: result,
      selectedBranch: result.isValid ? branch : get().selectedBranch,
      currentDeliveryFee: orderMode === "DELIVERY" ? fee : 0,
      estimatedPrepMins: times.prepMins,
      estimatedDeliveryMins: times.deliveryMins,
      isReadyToOrder: computeReady(orderMode, result.isValid ? branch : get().selectedBranch, result),
    });
    _persist(get);
  },

  placeOrder: (order) => {
    const next = [order, ...get().placedOrders];
    setItem(STORAGE_KEY_ORDERS, next);
    set({ placedOrders: next });
  },

  updateOrderPayment: (orderId, paymentStatus, transaction) => {
    const next = get().placedOrders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paymentStatus,
            ...(transaction ? { transaction } : {}),
            statusUpdatedAt: new Date().toISOString(),
          }
        : o,
    );
    setItem(STORAGE_KEY_ORDERS, next);
    set({ placedOrders: next });
  },

  getOrderById: (orderId) => get().placedOrders.find((o) => o.id === orderId),

  advanceOrderStatus: (orderId) => {
    const { placedOrders } = get();
    const FLOW_DELIVERY: PlacedOrder["status"][] = ["PENDING", "CONFIRMED", "PREPARING", "DELIVERING", "COMPLETED"];
    const FLOW_PICKUP: PlacedOrder["status"][] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

    const next = placedOrders.map((o) => {
      if (o.id !== orderId) return o;

      const requiresOnlinePayment = o.paymentMethod !== "CASH";
      if (requiresOnlinePayment && o.paymentStatus !== "PAID" && o.status === "PENDING") {
        return o;
      }

      const flow = o.mode === "DELIVERY" ? FLOW_DELIVERY : FLOW_PICKUP;
      const idx = flow.indexOf(o.status);
      const nextStatus = idx < flow.length - 1 ? flow[idx + 1] : o.status;

      return {
        ...o,
        status: nextStatus,
        statusUpdatedAt: new Date().toISOString(),
      };
    });

    setItem(STORAGE_KEY_ORDERS, next);
    set({ placedOrders: next });
  },

  reset: () => {
    set({
      orderMode: "DELIVERY",
      selectedBranch: null,
      selectedFranchiseId: null,
      deliveryAddress: { rawAddress: "", coord: null },
      validationResult: null,
      isValidating: false,
      isReadyToOrder: false,
      currentDeliveryFee: 0,
      estimatedPrepMins: 0,
      estimatedDeliveryMins: 0,
    });
    _persist(get);
  },

  setSelectedFranchiseId: (id, name) => {
    set({ selectedFranchiseId: id, selectedFranchiseName: name ?? null });
    _persist(get);
  },
}));

function _persist(get: () => DeliveryState) {
  const s = get();
  setItem(STORAGE_KEY_DELIVERY, {
    orderMode: s.orderMode,
    selectedBranchId: s.selectedBranch?.id ?? null,
    selectedFranchiseId: s.selectedFranchiseId,
    selectedFranchiseName: s.selectedFranchiseName,
    deliveryAddress: s.deliveryAddress,
    validationResult: s.validationResult,
  });
}
