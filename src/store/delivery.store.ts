import { create } from "zustand";
import type { OrderMode, DeliveryAddress, AddressValidationResult, PlacedOrder } from "@/types/delivery.types";
import type { Branch } from "@/types/delivery.types";
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
  // ── Selection state ──────────────────────────────────────────────
  orderMode: OrderMode;
  selectedBranch: Branch | null;
  deliveryAddress: DeliveryAddress;
  validationResult: AddressValidationResult | null;
  isValidating: boolean;

  // ── Flags ─────────────────────────────────────────────────────────
  isInitialized: boolean; // true after localStorage has been read

  // ── Computed ─────────────────────────────────────────────────────
  isReadyToOrder: boolean;
  currentDeliveryFee: number;
  estimatedPrepMins: number;
  estimatedDeliveryMins: number;

  // ── Order history ────────────────────────────────────────────────
  placedOrders: PlacedOrder[];

  // ── Actions ──────────────────────────────────────────────────────
  hydrate: () => void;
  setOrderMode: (mode: OrderMode) => void;
  setSelectedBranch: (branch: Branch | null, clearCart?: () => void) => void;
  setDeliveryAddress: (address: string) => void;
  validateAddress: () => Promise<void>;
  placeOrder: (order: PlacedOrder) => void;
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
  return true; // pickup: just need an open branch
}

// ── Eagerly read persisted state so guards get correct data on first render ──
function _loadInitialState() {
  const saved = getItem<{
    orderMode: OrderMode;
    selectedBranchId: string | null;
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
  deliveryAddress: { rawAddress: "", coord: null },
  validationResult: null,
  isValidating: false,
  isReadyToOrder: false,
  currentDeliveryFee: 0,
  estimatedPrepMins: 0,
  estimatedDeliveryMins: 0,
  // Apply initial state from localStorage synchronously
  ..._loadInitialState(),

  hydrate: () => {
    const saved = getItem<{
      orderMode: OrderMode;
      selectedBranchId: string | null;
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
      const times = branch ? estimateTotalTime(branch, mode, validation?.distanceKm ?? undefined) : { prepMins: 0, deliveryMins: 0, totalMins: 0 };
      set({
        orderMode: mode,
        selectedBranch: branch,
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

    // Simulate async geocode (in prod: call Maps API)
    await new Promise((r) => setTimeout(r, 600));

    const coord = geocodeAddress(deliveryAddress.rawAddress);
    if (!coord) {
      set({
        isValidating: false,
        deliveryAddress: { rawAddress: deliveryAddress.rawAddress, coord: null },
        validationResult: {
          isValid: false, nearestBranch: null, distanceKm: null,
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
    const times = branch ? estimateTotalTime(branch, orderMode, result.distanceKm ?? undefined) : { prepMins: 0, deliveryMins: 0, totalMins: 0 };

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

  advanceOrderStatus: (orderId) => {
    const { placedOrders } = get();
    const FLOW_DELIVERY: PlacedOrder["status"][] = ["PENDING","CONFIRMED","PREPARING","DELIVERING","COMPLETED"];
    const FLOW_PICKUP: PlacedOrder["status"][] = ["PENDING","CONFIRMED","PREPARING","READY","COMPLETED"];
    const next = placedOrders.map((o) => {
      if (o.id !== orderId) return o;
      const flow = o.mode === "DELIVERY" ? FLOW_DELIVERY : FLOW_PICKUP;
      const idx = flow.indexOf(o.status);
      const nextStatus = idx < flow.length - 1 ? flow[idx + 1] : o.status;
      return { ...o, status: nextStatus, statusUpdatedAt: new Date().toISOString() };
    });
    setItem(STORAGE_KEY_ORDERS, next);
    set({ placedOrders: next });
  },

  reset: () => {
    set({
      orderMode: "DELIVERY",
      selectedBranch: null,
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
}));

function _persist(get: () => DeliveryState) {
  const s = get();
  setItem(STORAGE_KEY_DELIVERY, {
    orderMode: s.orderMode,
    selectedBranchId: s.selectedBranch?.id ?? null,
    deliveryAddress: s.deliveryAddress,
    validationResult: s.validationResult,
  });
}
