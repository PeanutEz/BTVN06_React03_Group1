import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { customerLoginAndGetProfile, resendToken } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import { useLoadingStore } from "../../../store/loading.store";
import { useMenuCartStore } from "../../../store/menu-cart.store";
import { cartClient, type CartApiData } from "../../../services/cart.client";
import type { AuthCredentials } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess } from "../../../utils";
import logoHylux from "../../../assets/logo-hylux.png";

type RippleItem = { id: number; x: number; y: number };

const BUBBLES = [
  { size: 8,  left: "7%",  dur: 7,  delay: 0   },
  { size: 13, left: "18%", dur: 10, delay: 1.8  },
  { size: 5,  left: "32%", dur: 6,  delay: 0.6  },
  { size: 10, left: "47%", dur: 11, delay: 2.5  },
  { size: 7,  left: "61%", dur: 8,  delay: 0.3  },
  { size: 15, left: "75%", dur: 9,  delay: 1.2  },
  { size: 6,  left: "87%", dur: 7,  delay: 3.2  },
  { size: 9,  left: "95%", dur: 12, delay: 4.5  },
  { size: 4,  left: "24%", dur: 8,  delay: 5    },
  { size: 11, left: "55%", dur: 14, delay: 2    },
];

const GOLD = "#c9a227";
const GOLD_LIGHT = "#f5cc4e";
const GOLD_DARK = "#8b6914";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 20px",
  borderRadius: 30,
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(8px)",
  border: `1px solid rgba(201,162,39,0.35)`,
  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.35), 0 1px 0 rgba(245,204,78,0.08)",
  fontSize: 13,
  color: "#f5e6b0",
  outline: "none",
  boxSizing: "border-box" as const,
  transition: "border 0.2s, box-shadow 0.2s",
};
const INPUT_FOCUS_SHADOW = "inset 0 2px 6px rgba(0,0,0,0.3), 0 0 0 3px rgba(201,162,39,0.4)";
const INPUT_BLUR_SHADOW  = "inset 0 2px 6px rgba(0,0,0,0.35), 0 1px 0 rgba(245,204,78,0.08)";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const showLoading = useLoadingStore((s) => s.show);
  const hideLoading = useLoadingStore((s) => s.hide);  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiErrors, setApiErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleId = useRef(0);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AuthCredentials>();

  useEffect(() => {
    if (user) {
      const role = (user.role ?? "").toString().toLowerCase();
      if (role === "admin") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }
    }
  }, [user, navigate]);

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
  };
  const onSubmit = async (values: AuthCredentials) => {
    setApiErrors({});
    showLoading("Đang đăng nhập...");
    try {
      const profile = await customerLoginAndGetProfile(values);
      login(profile);

      // Restore cart from API after login
      const p = profile as {
        user?: { id?: string; _id?: string };
        id?: string;
        role?: string;
      };
      const customerId = String(p.user?.id ?? p.user?._id ?? p.id ?? "");
      if (customerId) {
        try {
          const carts = await cartClient.getCartsByCustomerId(customerId, { status: "ACTIVE" });
          const entries = (carts as CartApiData[]).map((c) => ({
            cartId: String(c._id ?? c.id ?? ""),
            franchise_id: c.franchise_id,
            franchise_name: c.franchise_name ?? (c as CartApiData & { franchise?: { name?: string } }).franchise?.name,
          })).filter((e) => e.cartId);
          if (entries.length) useMenuCartStore.getState().setCarts(entries);
        } catch { /* cart restore is best-effort */ }
      }

      showSuccess("Đăng nhập thành công");
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      if (redirectTo) { navigate(redirectTo, { replace: true }); return; }
      const role = (profile.role ?? "").toString().toLowerCase();
      if (role === "admin") {
        navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
      } else {
        navigate(ROUTER_URL.MENU, { replace: true });
      }
    } catch (error) {
      hideLoading();
      const errData = (error as { response?: { data?: { message?: string; errors?: Array<{ field?: string; message?: string }> } } })?.response?.data;
      if (errData?.errors?.length) {
        const mapped: { email?: string; password?: string; general?: string } = {};
        const pickMsg = (field: string) => {
          const fieldErrs = errData.errors!.filter(e => e.field === field);
          return (fieldErrs.find(e => e.message?.toLowerCase().includes("empty")) ?? fieldErrs[0])?.message;
        };
        mapped.email = pickMsg("email");
        mapped.password = pickMsg("password");
        const other = errData.errors!.find(e => e.field !== "email" && e.field !== "password");
        if (other) mapped.general = other.message;
        setApiErrors(mapped);
      } else {
        const msg = errData?.message || (error instanceof Error ? error.message : "Sai email hoặc mật khẩu");
        if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("chưa xác thực")) {
          setNotVerifiedEmail(values.email);
        }
        setApiErrors({ general: msg });
      }
    }
  };

  const handleResendVerification = async () => {
    if (!notVerifiedEmail) return;
    setIsResending(true);
    try {
      await resendToken(notVerifiedEmail);
      showSuccess("Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.");    } catch (error) {
      const msg = error instanceof Error ? error.message : "Gửi lại email thất bại";
      setApiErrors({ general: msg });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-x-hidden relative"
      style={{
        background: "linear-gradient(160deg, #0f0b07 0%, #1a1209 50%, #241808 100%)",
        fontFamily: "'Inter', system-ui, sans-serif",
        paddingTop: "60px",
        paddingBottom: "60px",
      }}
    >
      {/* ── Background gold blobs ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
        <div className="animate-blob absolute" style={{ width: 420, height: 420, top: "-110px", left: "-90px", background: "radial-gradient(circle, rgba(201,162,39,0.22), transparent)", filter: "blur(70px)", borderRadius: "50%" }} />
        <div className="animate-blob-2 absolute" style={{ width: 360, height: 360, bottom: "-90px", right: "-70px", background: "radial-gradient(circle, rgba(245,204,78,0.18), transparent)", filter: "blur(65px)", borderRadius: "50%" }} />
        <div className="animate-blob-3 absolute" style={{ width: 300, height: 300, top: "38%", right: "18%", background: "radial-gradient(circle, rgba(139,105,20,0.2), transparent)", filter: "blur(55px)", borderRadius: "50%" }} />
        <div className="animate-blob absolute" style={{ width: 220, height: 220, bottom: "12%", left: "8%", background: "radial-gradient(circle, rgba(201,162,39,0.18), transparent)", filter: "blur(50px)", borderRadius: "50%", animationDelay: "5s" }} />
      </div>

      {/* ── Rising bubbles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            className="animate-bubble absolute rounded-full"
            style={{
              width: b.size, height: b.size,
              bottom: -20, left: b.left,
              background: "rgba(201,162,39,0.25)",
              border: "1px solid rgba(245,204,78,0.5)",
              backdropFilter: "blur(2px)",
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ── Main area: morphing water-drop card + floating circles ── */}      <div className="animate-card-pop relative z-10" style={{ width: 420 }}>

        {/* Morphing water-drop glassmorphism card */}
        <div
          className="animate-water-morph flex flex-col items-center justify-center"
          style={{
            padding: "40px 24px",
            minHeight: 540,
            background: "rgba(15,11,5,0.78)",
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            border: "1.5px solid rgba(201,162,39,0.45)",
            boxShadow:
              "0 32px 72px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(245,204,78,0.18), inset 0 -1px 0 rgba(139,105,20,0.2)",
          }}
        >
          {/* HyLux Logo image */}
          <img
            src={logoHylux}
            alt="HyLux Coffee"
            style={{ width: 110, height: 110, objectFit: "contain", marginBottom: 10, filter: "drop-shadow(0 0 12px rgba(201,162,39,0.5))" }}
          />

          {/* Gold divider below logo */}
          <div style={{
            width: "55%", height: 2, marginBottom: 10,
            background: `linear-gradient(90deg, transparent, rgba(245,204,78,0.85), transparent)`,
            borderRadius: 10,
          }} />

          {/* Title */}
          <h2 style={{
            marginBottom: 22,
            fontSize: 17,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
            letterSpacing: "0.06em",
            lineHeight: 1.4,
          }}>
            Đăng nhập vào HyLux
          </h2>          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 240 }}
          >
            {/* Email */}
            <div style={{ width: "100%" }}>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                style={{
                  ...INPUT_STYLE,
                  ...(apiErrors.email ? { border: "1px solid rgba(220,38,38,0.7)" } : {}),
                }}
                onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                {...register("email")}
                onBlur={e => { e.currentTarget.style.border = apiErrors.email ? "1px solid rgba(220,38,38,0.7)" : `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
              />
              {apiErrors.email && (
                <p style={{ marginTop: 4, paddingLeft: 14, fontSize: 10, color: "#fca5a5", lineHeight: 1 }}>
                  {apiErrors.email}
                </p>
              )}
            </div>

            {/* Password + toggle */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  style={{
                    ...INPUT_STYLE,
                    paddingRight: 40,
                    ...(apiErrors.password ? { border: "1px solid rgba(220,38,38,0.7)" } : {}),
                  }}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("password")}
                  onBlur={e => { e.currentTarget.style.border = apiErrors.password ? "1px solid rgba(220,38,38,0.7)" : `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(201,162,39,0.6)", display: "flex", alignItems: "center" }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {apiErrors.password && (
                <p style={{ marginTop: 4, paddingLeft: 14, fontSize: 10, color: "#fca5a5", lineHeight: 1 }}>
                  {apiErrors.password}
                </p>
              )}
            </div>

            {/* General error */}
            {apiErrors.general && (
              <div style={{ width: "100%", padding: "8px 14px", borderRadius: 10, background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", fontSize: 11, color: "#fca5a5", lineHeight: 1.5, textAlign: "center" }}>
                {apiErrors.general}
              </div>
            )}

            {notVerifiedEmail && (
              <div style={{ textAlign: "center", fontSize: 11, color: "#d4a843" }}>
                <p>Tài khoản chưa xác thực.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResending}
                  style={{ fontWeight: 600, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: isResending ? 0.5 : 1 }}
                >
                  {isResending ? "Đang gửi..." : "Gửi lại email →"}
                </button>
              </div>
            )}

            {/* LOGIN button + water ripple */}
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={triggerRipple}
              style={{
                position: "relative",
                overflow: "hidden",
                marginTop: 6,
                padding: "12px 52px",
                borderRadius: 30,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#0f0b07",
                background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
                border: "none",
                boxShadow: "0 6px 22px rgba(201,162,39,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.04)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(201,162,39,0.65), inset 0 1px 0 rgba(255,255,255,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(201,162,39,0.45), inset 0 1px 0 rgba(255,255,255,0.2)"; }}
            >
              {ripples.map(r => (
                <span
                  key={r.id}
                  className="animate-ripple"
                  style={{
                    position: "absolute",
                    left: r.x, top: r.y,
                    width: 56, height: 56,
                    borderRadius: "50%",
                    background: "rgba(245,204,78,0.4)",
                    pointerEvents: "none",
                  }}
                />
              ))}
              {isSubmitting ? "···" : "ĐĂNG NHẬP"}
            </button>
          </form>
        </div>        {/* ── Floating circle: Sign up ── */}
        <button
          type="button"
          onClick={() => navigate(ROUTER_URL.REGISTER)}
          className="animate-bouncefloat absolute flex flex-col items-center justify-center text-center text-white font-semibold"
          style={{
            width: 90, height: 90,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            boxShadow: `6px 6px 18px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.25), 0 0 22px rgba(201,162,39,0.4)`,
            fontSize: 10.5, lineHeight: 1.5,
            right: -28, top: "28%",
            border: `1.5px solid rgba(245,204,78,0.6)`,
            color: "#1a1209",
            cursor: "pointer",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          Đăng ký<br />HyLux
        </button>

        {/* ── Floating circle: Forgot password ── */}
        <button
          type="button"
          onClick={() => navigate(ROUTER_URL.RESET_PASSWORD)}
          className="animate-bouncefloat-2 absolute flex flex-col items-center justify-center text-center text-white font-semibold"
          style={{
            width: 78, height: 78,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
            boxShadow: `5px 5px 16px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.2), 0 0 18px rgba(201,162,39,0.35)`,
            fontSize: 10.5, lineHeight: 1.5,
            right: -14, top: "62%",
            border: `1.5px solid rgba(201,162,39,0.55)`,
            color: "#1a1209",
            cursor: "pointer",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          Quên<br />Mật khẩu
        </button>
      </div>
    </div>
  );
};

export default LoginPage;