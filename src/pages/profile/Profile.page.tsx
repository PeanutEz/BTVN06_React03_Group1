import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../store";

const ProfilePage = () => {
  const { user, login } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", avatar: "" });

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email || "", avatar: user.avatar || "" });
  }, [user]);

  if (!user) return <div className="p-6">Không có dữ liệu người dùng.</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSave = () => {
    const updated = { ...user, ...form };
    login(updated as any);
    setEditMode(false);
  };

  return (
    <div className="p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-lg bg-slate-900/60 p-6 shadow-lg">
        <div className="flex items-center gap-6">
          <img src={form.avatar || user.avatar} alt={user.name} className="h-28 w-28 rounded-full object-cover" />
          <div className="flex-1">
            <h2 className="mb-1 text-2xl font-bold">{user.name}</h2>
            <p className="text-sm text-primary-100/80">Vai trò: {user.role}</p>
            <p className="text-sm text-slate-300">{user.email}</p>
          </div>
          <div>
            <button
              onClick={() => setEditMode((v) => !v)}
              className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-400"
            >
              {editMode ? "Hủy" : "Chỉnh sửa"}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="mt-6 grid gap-4">
            <label className="flex flex-col text-sm">
              Tên
              <input name="name" value={form.name} onChange={handleChange} className="mt-1 rounded-md bg-slate-800 p-2" />
            </label>
            <label className="flex flex-col text-sm">
              Email
              <input name="email" value={form.email} onChange={handleChange} className="mt-1 rounded-md bg-slate-800 p-2" />
            </label>
            <label className="flex flex-col text-sm">
              Ảnh đại diện (URL)
              <input name="avatar" value={form.avatar} onChange={handleChange} className="mt-1 rounded-md bg-slate-800 p-2" />
            </label>
            <div className="mt-2 flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold">
                Lưu
              </button>
              <button onClick={() => setEditMode(false)} className="rounded-md bg-slate-700 px-4 py-2 text-sm">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
