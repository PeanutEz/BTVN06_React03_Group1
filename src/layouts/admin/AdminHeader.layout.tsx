import { useAuthStore } from "../../store";

const AdminHeader = () => {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Admin Panel</h1>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1">
            <img src={user.avatar} alt={user.name} className="size-8 rounded-full object-cover" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
