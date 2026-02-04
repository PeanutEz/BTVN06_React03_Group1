import { useState } from "react";
import MapboxMap from "../../components/map/MapboxMap";

interface Store {
  id: number;
  name: string;
  address: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
  isOpen: boolean;
  hasWifi: boolean;
  hasCardPayment: boolean;
}

const stores: Store[] = [
  {
    id: 1,
    name: "HYLUX COFFEE 270 VÕ THỊ SÁU - QUẬN 3",
    address: "270L Võ Thị Sáu, Phường 7",
    district: "Quận 3",
    city: "TP. Hồ Chí Minh",
    lat: 10.776889,
    lng: 106.700806,
    phone: "028 7300 3426",
    hours: "7:00 - 23:00",
    isOpen: true,
    hasWifi: true,
    hasCardPayment: true,
  },
  {
    id: 2,
    name: "HYLUX COFFEE LƯƠNG KHẢI SIÊU - THỦ ĐỨC",
    address: "6 Lương Khải Siêu, Phường Bình Thọ",
    district: "Thủ Đức",
    city: "TP. Hồ Chí Minh",
    lat: 10.850813,
    lng: 106.771553,
    phone: "028 7300 3007",
    hours: "7:00 - 23:00",
    isOpen: true,
    hasWifi: true,
    hasCardPayment: true,
  },
  {
    id: 3,
    name: "HYLUX COFFEE NGUYỄN VĂN TRỖI - QUẬN 1",
    address: "123 Nguyễn Văn Trỗi, Phường Bến Thành",
    district: "Quận 1",
    city: "TP. Hồ Chí Minh",
    lat: 10.778526,
    lng: 106.691639,
    phone: "028 7300 4500",
    hours: "6:30 - 23:30",
    isOpen: true,
    hasWifi: true,
    hasCardPayment: true,
  },
];

const cities = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"];
const districts = ["Tất cả", "Quận 1", "Quận 3", "Quận 5", "Quận 7", "Thủ Đức", "Bình Thạnh"];
const amenities = ["Tất cả", "Wifi Miễn Phí", "Thanh toán thẻ", "Bãi đậu xe"];

const StoreLocatorPage = () => {
  const [selectedStore, setSelectedStore] = useState<Store | null>(stores[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState("Chọn Quận/Huyện");
  const [selectedAmenity, setSelectedAmenity] = useState("Tiện ích");

  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "Tất cả" || store.city === selectedCity;
    const matchesDistrict =
      selectedDistrict === "Chọn Quận/Huyện" ||
      selectedDistrict === "Tất cả" ||
      store.district === selectedDistrict;
    return matchesSearch && matchesCity && matchesDistrict;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar Section */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Country Selector */}
            <select className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer min-w-[140px]">
              <option>Việt Nam</option>
            </select>

            {/* City Selector */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer min-w-[180px]"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* District Selector */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer min-w-[180px]"
            >
              <option value="Chọn Quận/Huyện">Chọn Quận/Huyện</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            {/* Amenity Selector */}
            <select
              value={selectedAmenity}
              onChange={(e) => setSelectedAmenity(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer min-w-[140px]"
            >
              <option value="Tiện ích">Tiện ích</option>
              {amenities.map((amenity) => (
                <option key={amenity} value={amenity}>
                  {amenity}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Nhập tên đường, hoặc quán..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />

            {/* Search Button */}
            <button className="px-6 py-2.5 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Store List */}
        <div className="w-[400px] bg-white border-r overflow-y-auto">
          {/* Results Count */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-gray-700 font-medium">
              Tìm được <span className="text-red-900 font-bold">{filteredStores.length}</span> quán
            </p>
          </div>

          {/* Store Cards */}
          <div className="divide-y">
            {filteredStores.map((store) => (
              <button
                key={store.id}
                onClick={() => setSelectedStore(store)}
                className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${
                  selectedStore?.id === store.id ? "bg-blue-50 border-l-4 border-red-900" : ""
                }`}
              >
                <h3 className="font-bold text-gray-900 mb-1 uppercase text-sm">
                  {store.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{store.address}, {store.district}, {store.city}</p>
                
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm text-gray-700">{store.phone}</span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${store.isOpen ? 'bg-red-600 text-white' : 'bg-gray-400 text-white'}`}>
                    {store.isOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                  <span className="text-xs text-gray-600">
                    {store.hours} • 7 ngày/ tuần
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {store.hasWifi && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      <span>Wifi Miễn Phí</span>
                    </div>
                  )}
                  {store.hasCardPayment && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>Thanh toán bằng thẻ</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapboxMap
            center={
              selectedStore
                ? { lat: selectedStore.lat, lng: selectedStore.lng }
                : { lat: 10.776889, lng: 106.700806 }
            }
            zoom={13}
            markers={filteredStores.map((store) => ({
              lat: store.lat,
              lng: store.lng,
              name: store.name,
              address: `${store.address}, ${store.district}`,
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default StoreLocatorPage;
