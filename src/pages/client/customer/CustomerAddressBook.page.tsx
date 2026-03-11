import { useState } from "react";
import { useAddressStore } from "@/store/address.store";
import type { SavedAddress } from "@/store/address.store";

export default function CustomerAddressBookPage() {
  const { addresses, add, update, remove, setDefault } = useAddressStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const resetForm = () => {
    setForm({ name: "", phone: "", address: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.name || !form.phone || !form.address) return;
    if (editingId !== null) {
      update(editingId, form);
    } else {
      add(form);
    }
    resetForm();
  };

  const handleEdit = (addr: SavedAddress) => {
    setForm({ name: addr.name, phone: addr.phone, address: addr.address });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => remove(id);

  const handleSetDefault = (id: number) => setDefault(id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-green-700">Sổ địa chỉ</h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Thêm địa chỉ
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border-2 border-green-200 bg-green-50/30 p-5 space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900">
            {editingId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Họ tên người nhận</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Địa chỉ</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Đường ABC, Quận 1, TP. Hồ Chí Minh"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="border border-gray-300 bg-white px-4 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.phone || !form.address}
              className="bg-green-700 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? "Cập nhật" : "Thêm địa chỉ"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16">
            <span className="mb-3 text-4xl">📍</span>
            <p className="text-gray-500">Bạn chưa có địa chỉ nào</p>
            <p className="mt-1 text-sm text-gray-400">Thêm địa chỉ để đặt hàng nhanh hơn</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-lg border p-4 ${addr.isDefault ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{addr.name}</h3>
                {addr.isDefault && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Mặc định
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Số điện thoại: {addr.phone}</p>
              <p className="mt-1 text-sm text-gray-600">Địa chỉ: {addr.address}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => handleEdit(addr)} className="border border-gray-300 bg-white px-3 py-1.5 text-xs rounded-lg text-gray-700 hover:bg-gray-50">Chỉnh sửa</button>
                <button onClick={() => handleDelete(addr.id)} className="border border-gray-300 bg-white px-3 py-1.5 text-xs rounded-lg text-gray-700 hover:bg-gray-50">Xóa</button>
                {!addr.isDefault && (
                  <button onClick={() => handleSetDefault(addr.id)} className="border border-gray-300 bg-white px-3 py-1.5 text-xs rounded-lg text-gray-700 hover:bg-gray-50">Đặt mặc định</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
