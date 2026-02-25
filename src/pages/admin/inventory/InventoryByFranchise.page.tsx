import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../../components";
import type { InventoryItem } from "../../../models/inventory.model";
import { isLowStock } from "../../../models/inventory.model";
import { fetchInventoryByStore, updateInventoryStock } from "../../../services/inventory.service";
import { fetchStoreById } from "../../../services/store.service";

const InventoryByFranchisePage = () => {
  const { id } = useParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inventory, store] = await Promise.all([fetchInventoryByStore(id), fetchStoreById(id)]);
      setItems(inventory);
      setStoreName(store?.name ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleUpdateStock = async (item: InventoryItem) => {
    const value = prompt(`Nhập số lượng tồn mới cho ${item.productName}`, item.stock.toString());
    if (!value) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      alert("Số lượng không hợp lệ");
      return;
    }

    setUpdatingId(item.id);
    try {
      const updated = await updateInventoryStock(item.id, parsed);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const lowStockItems = items.filter(isLowStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tồn kho chi nhánh</h1>
          <p className="text-sm text-slate-600">
            {storeName ? `Franchise: ${storeName}` : "Danh sách tồn kho theo franchise"}
          </p>
        </div>
        <Button variant="outline" onClick={load} loading={loading}>
          Làm mới
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">
            Cảnh báo tồn kho thấp: {lowStockItems.length} mặt hàng cần chú ý.
          </p>
          <p className="mt-1 text-xs">
            Các dòng được đánh dấu màu cam đang ở dưới mức tồn kho tối thiểu. Hãy chủ động điều chỉnh tồn hoặc nhập hàng.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3 text-right">Tồn hiện tại</th>
              <th className="px-4 py-3 text-right">Tồn tối thiểu</th>
              <th className="px-4 py-3">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const low = isLowStock(item);
              return (
                <tr key={item.id} className={low ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                  <td className="px-4 py-3">
                    <div className="leading-tight">
                      <p className="font-semibold text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">ID: {item.productId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.category}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={low ? "font-semibold text-amber-700" : "text-slate-800"}>
                      {item.stock.toLocaleString()} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {item.minStock.toLocaleString()} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStock(item)}
                      loading={updatingId === item.id}
                    >
                      Điều chỉnh
                    </Button>
                    <p className="mt-1 text-xs text-slate-400">
                      Cập nhật: {new Date(item.updatedAt).toLocaleString("vi-VN")}
                    </p>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Không có dữ liệu tồn kho cho chi nhánh này.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Đang tải...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryByFranchisePage;

