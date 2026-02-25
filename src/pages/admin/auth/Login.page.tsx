import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../../components";
import { loginUser } from "../../../services/auth.service";
import { fetchUsers } from "../../../services/user.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { isAdminRole } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess, showError } from "../../../utils";
import bgAdminLogin from "../../../assets/bg-admin-login.jpg";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const [quickLogging, setQuickLogging] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthCredentials>();

  useEffect(() => {
    if (user && isAdminRole(user.role)) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (values: AuthCredentials) => {
    const found = await loginUser(values);
    if (!found || !isAdminRole(found.role)) {
      showError("Bạn không có quyền truy cập admin hoặc thông tin đăng nhập sai");
      return;
    }

    login(found);
    showSuccess("Đăng nhập thành công");
    const redirectTo = (location.state as { from?: Location })?.from?.pathname;
    navigate(redirectTo || `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
  };

  const handleQuickLogin = async (role: "admin" | "client") => {
    setQuickLogging(true);
    try {
      const users = await fetchUsers();
      const target = role === "admin"
        ? users.find((u) => isAdminRole(u.role))
        : users.find((u) => !isAdminRole(u.role));

      if (!target) {
        showError(`Không tìm thấy tài khoản ${role}`);
        return;
      }

      login(target);
      showSuccess(`Đăng nhập nhanh (${target.email})`);

      if (role === "admin") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.HOME, { replace: true });
      }
    } catch {
      showError("Đăng nhập nhanh thất bại");
    } finally {
      setQuickLogging(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-4" style={{ backgroundImage: `url(${bgAdminLogin})` }}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-8 shadow-2xl shadow-primary-500/10 animate-slide-in">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-6">Đăng nhập</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-600 placeholder:font-normal"
              placeholder="Email của bạn"
              {...register("email", { required: "Email không được để trống" })}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
              placeholder="Mật khẩu của bạn"
              {...register("password", { required: "Mật khẩu không được để trống" })}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide">Đăng nhập nhanh</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleQuickLogin("client")}
              disabled={quickLogging}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
            >
              🏠 Client
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("admin")}
              disabled={quickLogging}
              className="flex-1 rounded-lg border border-primary-500 bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/30 transition hover:from-primary-600 hover:to-primary-700 disabled:opacity-50"
            >
              🛡️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
