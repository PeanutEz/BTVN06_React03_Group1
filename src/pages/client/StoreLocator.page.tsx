import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientService, type ClientFranchiseDetail } from "../../services/client.service";

type StoreListItem = {
  id: string;
  code: string;
  name: string;
};

type StoreDetailViewModel = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  logoUrl: string;
  mapEmbedUrl: string | null;
  mapLink: string | null;
};

function parseMinutes(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getOpenStatus(opensAt?: string, closesAt?: string, isActive?: boolean): boolean {
  if (isActive === false) return false;
  const openMinutes = parseMinutes(opensAt);
  const closeMinutes = parseMinutes(closesAt);
  if (openMinutes == null || closeMinutes == null) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function extractMapEmbedUrl(mapScript?: string): string | null {
  if (!mapScript) return null;
  const trimmed = mapScript.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const iframeSrc = trimmed.match(/src=["']([^"']+)["']/i)?.[1];
  return iframeSrc ?? null;
}

function extractCoordsFromText(value?: string): { lat: number | null; lng: number | null } {
  if (!value) return { lat: null, lng: null };

  const pairMatch = value.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (pairMatch) {
    return {
      lat: Number(pairMatch[1]),
      lng: Number(pairMatch[2]),
    };
  }

  const llMatch = value.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (llMatch) {
    return {
      lat: Number(llMatch[1]),
      lng: Number(llMatch[2]),
    };
  }

  const qMatch = value.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (qMatch) {
    return {
      lat: Number(qMatch[1]),
      lng: Number(qMatch[2]),
    };
  }

  return { lat: null, lng: null };
}

function toStoreDetailViewModel(detail: ClientFranchiseDetail | null | undefined): StoreDetailViewModel | null {
  if (!detail?.id) return null;

  const mapEmbedUrl = extractMapEmbedUrl(detail.map_script);
  const coords = extractCoordsFromText(`${detail.map_script ?? ""} ${detail.address ?? ""}`);
  const phone = detail.hotline || detail.phone || "Chưa cập nhật hotline";
  const address = detail.address || "Chưa cập nhật địa chỉ";
  const mapLink =
    coords.lat != null && coords.lng != null
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : detail.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.address)}`
        : null;

  return {
    id: detail.id,
    code: detail.code || "Chưa cập nhật mã cửa hàng",
    name: detail.name || "Cửa hàng",
    address,
    phone,
    hours: `${detail.opened_at || "--:--"} - ${detail.closed_at || "--:--"}`,
    isOpen: getOpenStatus(detail.opened_at, detail.closed_at, detail.is_active),
    logoUrl: detail.logo_url || "",
    mapEmbedUrl,
    mapLink,
  };
}

export default function StoreLocatorPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const {
    data: franchiseOptions = [],
    isLoading: isLoadingStores,
    isError: isStoreListError,
    error: storeListError,
  } = useQuery({
    queryKey: ["client-store-locator", "list"],
    queryFn: () => clientService.getAllFranchises(),
    staleTime: 60_000,
  });

  const filteredStores = useMemo<StoreListItem[]>(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return franchiseOptions.filter((store) => {
      if (!keyword) return true;
      return (
        store.name.toLowerCase().includes(keyword) ||
        (store.code ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [franchiseOptions, searchQuery]);

  useEffect(() => {
    if (!filteredStores.length) {
      setSelectedStoreId("");
      return;
    }

    const exists = filteredStores.some((store) => store.id === selectedStoreId);
    if (!exists) {
      setSelectedStoreId(filteredStores[0].id);
    }
  }, [filteredStores, selectedStoreId]);

  const {
    data: selectedStoreDetail,
    isLoading: isLoadingSelectedStore,
    isError: isSelectedStoreError,
    error: selectedStoreError,
  } = useQuery({
    queryKey: ["client-store-locator", "detail", selectedStoreId],
    queryFn: () => clientService.getFranchiseDetail(selectedStoreId),
    enabled: !!selectedStoreId,
    staleTime: 60_000,
  });

  const selectedStore = useMemo(
    () => toStoreDetailViewModel(selectedStoreDetail),
    [selectedStoreDetail],
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Hệ thống cửa hàng
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">
              Chọn cửa hàng để xem thông tin chi tiết
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-stone-600">
              Chọn một cửa hàng trong danh sách để xem địa chỉ, hotline, giờ hoạt động và bản đồ của cửa hàng đó.
            </p>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập tên hoặc mã cửa hàng..."
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-6">
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-sm font-medium text-stone-700">
              {isLoadingStores ? "Đang tải danh sách cửa hàng..." : `Tìm thấy ${filteredStores.length} cửa hàng`}
            </p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {isLoadingStores && (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-2xl border border-stone-200 p-4">
                    <div className="h-4 w-2/3 rounded bg-stone-200" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-stone-100" />
                  </div>
                ))}
              </div>
            )}

            {!isLoadingStores && isStoreListError && (
              <div className="p-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Không thể tải danh sách cửa hàng. {(storeListError as Error)?.message || "Vui lòng thử lại sau."}
                </div>
              </div>
            )}

            {!isLoadingStores && !isStoreListError && filteredStores.length === 0 && (
              <div className="p-4">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">
                  Không tìm thấy cửa hàng phù hợp.
                </div>
              </div>
            )}

            {!isLoadingStores &&
              !isStoreListError &&
              filteredStores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedStoreId(store.id)}
                  className={`w-full border-b border-stone-100 px-4 py-4 text-left transition hover:bg-amber-50/50 ${
                    selectedStoreId === store.id ? "bg-amber-50" : "bg-white"
                  }`}
                >
                    <p className="text-sm font-bold uppercase tracking-wide text-stone-900">{store.name}</p>
                    <p className="mt-1 text-xs text-stone-500">{store.code || "Chưa cập nhật mã cửa hàng"}</p>
                </button>
              ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-4">
              <h2 className="text-xl font-bold text-stone-900">
                {selectedStore?.name || "Thong tin cua hang"}
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                {selectedStore?.code ? `Mã cửa hàng: ${selectedStore.code}` : "Chọn cửa hàng để xem chi tiết"}
              </p>
            </div>

            {!selectedStoreId && (
              <div className="p-5 text-sm text-stone-600">Chọn một cửa hàng để xem thông tin chi tiết.</div>
            )}

            {selectedStoreId && isLoadingSelectedStore && (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-2xl bg-stone-50 p-4">
                      <div className="h-3 w-24 rounded bg-stone-200" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-stone-100" />
                    </div>
                  ))}
                </div>
                <div className="h-48 animate-pulse rounded-3xl bg-stone-100" />
              </div>
            )}

            {selectedStoreId && !isLoadingSelectedStore && isSelectedStoreError && (
              <div className="p-5">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Không thể tải thông tin cửa hàng này. {(selectedStoreError as Error)?.message || "Vui lòng thử lại sau."}
                </div>
              </div>
            )}

            {selectedStoreId && !isLoadingSelectedStore && !isSelectedStoreError && selectedStore && (
              <div className="p-5">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Địa chỉ</p>
                      <p className="mt-2 text-sm font-medium text-stone-900">{selectedStore.address}</p>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Hotline</p>
                      <p className="mt-2 text-sm font-medium text-stone-900">{selectedStore.phone}</p>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Giờ hoạt động</p>
                      <p className="mt-2 text-sm font-medium text-stone-900">{selectedStore.hours}</p>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Trang thai</p>
                      <p className="mt-2 text-sm font-medium text-stone-900">
                        {selectedStore.isOpen ? "Đang phục vụ" : "Ngoài giờ hoặc đang tạm dừng"}
                      </p>
                    </div>
                  </div>

                  {selectedStore.mapLink && (
                    <a
                      href={selectedStore.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                    >
                      Mở bản đồ của cửa hàng
                    </a>
                  )}

                  {selectedStore.mapEmbedUrl ? (
                    <div className="overflow-hidden rounded-3xl border border-stone-200">
                      <iframe
                        title={`Ban do ${selectedStore.name}`}
                        src={selectedStore.mapEmbedUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="h-[420px] w-full border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
