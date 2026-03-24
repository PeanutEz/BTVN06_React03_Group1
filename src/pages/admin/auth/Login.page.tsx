import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import { loginAndGetProfile, switchContextAndGetProfile, forgotPassword, type UserProfile, type RoleInfo } from "../../../services/auth.service";
import { useAuthStore } from "../../../store";
import type { AuthCredentials } from "../../../models";
import { ROUTER_URL } from "../../../routes/router.const";
import { showSuccess } from "../../../utils";
import logoHylux from "../../../assets/logo-hylux.png";
import FranchisePickerModal from "../../../components/admin/FranchisePickerModal";

type RippleItem = { id: number; x: number; y: number };

const GOLD = "#c9a227";
const GOLD_LIGHT = "#f5cc4e";
const GOLD_DARK = "#8b6914";

const BUBBLES = [
  { size: 7,  left: "10%", dur: 8,  delay: 0   },
  { size: 12, left: "25%", dur: 11, delay: 1.5  },
  { size: 5,  left: "40%", dur: 7,  delay: 0.8  },
  { size: 9,  left: "58%", dur: 10, delay: 2.8  },
  { size: 6,  left: "72%", dur: 9,  delay: 0.3  },
  { size: 13, left: "85%", dur: 12, delay: 1.8  },
  { size: 4,  left: "95%", dur: 8,  delay: 4    },
  { size: 10, left: "50%", dur: 14, delay: 3.5  },
];

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

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuthStore();
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);
  const [showFranchisePicker, setShowFranchisePicker] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleId = useRef(0);  const [apiErrors, setApiErrors] = useState<{ email?: string[]; password?: string[]; general?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState<string | null>(null);
  const [fpSuccess, setFpSuccess] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AuthCredentials>();

  useEffect(() => {
    const allowedRoles = ["admin", "system", "manager", "staff"];
    const hasAdminRole = user?.roles?.some(r => allowedRoles.includes((r.role ?? "").toString().toLowerCase()));
    if (user && hasAdminRole) {
      navigate(`${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    }
  }, [user, navigate]);

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
  };

  const handleSwitchContextAndNavigate = async (_profile: UserProfile, role: RoleInfo) => {
    try {
      setIsSwitching(true);
      const updatedProfile = await switchContextAndGetProfile(role.franchise_id);
      login(updatedProfile);
      setShowFranchisePicker(false);
      setPendingProfile(null);
      showSuccess("Đăng nhập thành công");
      const redirectTo = (location.state as { from?: Location })?.from?.pathname;
      navigate(redirectTo || `${ROUTER_URL.ADMIN}/${ROUTER_URL.ADMIN_ROUTES.DASHBOARD}`, { replace: true });
    } catch (err) {
      setApiErrors({ general: err instanceof Error ? err.message : "Chuyển context thất bại" });
    } finally {
      setIsSwitching(false);
    }
  };  const onSubmit = async (values: AuthCredentials) => {
    setApiErrors({});
    try {
      const profile = await loginAndGetProfile(values);
      const allowedRoles = ["admin", "system", "manager", "staff"];
      const hasAdminAccess = profile.roles?.some(r => allowedRoles.includes((r.role ?? "").toString().toLowerCase()));
      if (!hasAdminAccess) {
        setApiErrors({ general: `Bạn không có quyền truy cập admin. Role: ${profile.roles?.map(r => r.role).join(", ") || "không có"}` });
        return;
      }
      const allRoles = profile.roles || [];
      if (allRoles.length === 1) {
        await handleSwitchContextAndNavigate(profile, allRoles[0]);
      } else {
        setPendingProfile(profile);
        setShowFranchisePicker(true);
      }    } catch (error) {
      // Đọc responseData từ interceptor (đã attach) hoặc axios error gốc
      const errData = (error as any)?.responseData || (error as any)?.response?.data;      if (Array.isArray(errData?.errors) && errData.errors.length > 0) {
        const mapped: { email?: string[]; password?: string[]; general?: string } = {};
        // Gom tất cả lỗi của cùng field thành mảng
        const getFieldMsgs = (field: string): string[] =>
          errData.errors
            .filter((e: any) => e.field === field && e.message)
            .map((e: any) => e.message as string);
        const emailMsgs = getFieldMsgs("email");
        const passwordMsgs = getFieldMsgs("password");
        if (emailMsgs.length > 0) mapped.email = emailMsgs;
        if (passwordMsgs.length > 0) mapped.password = passwordMsgs;
        // Lỗi không thuộc email/password
        const otherMsgs = errData.errors
          .filter((e: any) => e.field !== "email" && e.field !== "password" && e.message)
          .map((e: any) => e.message)
          .join(". ");
        if (otherMsgs) mapped.general = otherMsgs;
        setApiErrors(mapped);
      } else {
        setApiErrors({ general: errData?.message || (error instanceof Error ? error.message : "Đăng nhập thất bại") });
      }
    }
  };
  const handleForgotPassword = async () => {
    if (!fpEmail.trim()) {
      setFpError("Vui lòng nhập email.");
      return;
    }
    setFpLoading(true);
    setFpError(null);
    try {
      await forgotPassword(fpEmail.trim());
      setFpSuccess(true);
    } catch (err) {
      const responseData = (err as any)?.responseData ?? (err as any)?.response?.data;
      const msg = responseData?.message || (err instanceof Error ? err.message : "Yêu cầu thất bại");
      setFpError(msg);
    } finally {
      setFpLoading(false);
    }
  };

  const openForgotModal = () => {
    setFpEmail("");
    setFpError(null);
    setFpSuccess(false);
    setShowForgotModal(true);
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
        <div className="animate-blob absolute" style={{ width: 380, height: 380, top: "-100px", left: "-80px", background: "radial-gradient(circle, rgba(201,162,39,0.2), transparent)", filter: "blur(70px)", borderRadius: "50%" }} />
        <div className="animate-blob-2 absolute" style={{ width: 320, height: 320, bottom: "-80px", right: "-60px", background: "radial-gradient(circle, rgba(245,204,78,0.16), transparent)", filter: "blur(65px)", borderRadius: "50%" }} />
        <div className="animate-blob-3 absolute" style={{ width: 260, height: 260, top: "40%", right: "20%", background: "radial-gradient(circle, rgba(139,105,20,0.18), transparent)", filter: "blur(55px)", borderRadius: "50%" }} />
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
              background: "rgba(201,162,39,0.22)",
              border: "1px solid rgba(245,204,78,0.45)",
              backdropFilter: "blur(2px)",
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>      {/* ── Card ── */}
      <div className="animate-card-pop relative z-10" style={{ width: 400 }}>        <div
          className="animate-water-morph flex flex-col items-center justify-center"
          style={{
            padding: "36px 24px",
            minHeight: 480,
            background: "rgba(15,11,5,0.82)",
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            border: `1.5px solid rgba(201,162,39,0.45)`,
            boxShadow: "0 32px 72px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,204,78,0.15)",
          }}
        >
          {/* Logo */}
          <img
            src={logoHylux}
            alt="HyLux Coffee"
            style={{ width: 95, height: 95, objectFit: "contain", marginBottom: 10, filter: "drop-shadow(0 0 12px rgba(201,162,39,0.5))" }}
          />

          {/* Gold divider */}
          <div style={{
            width: "55%", height: 2, marginBottom: 10,
            background: `linear-gradient(90deg, transparent, rgba(245,204,78,0.85), transparent)`,
            borderRadius: 10,
          }} />

          {/* Admin badge */}
          <div style={{
            marginBottom: 16,
            padding: "3px 16px",
            border: `1px solid rgba(201,162,39,0.4)`,
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: GOLD,
            background: "rgba(201,162,39,0.08)",
          }}>
            ADMIN PORTAL
          </div>

          {/* Form */}          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 250 }}
          >            <div style={{ width: "100%" }}>
              <input
                type="email"
                placeholder="Email"
                autoComplete="email"
                style={{
                  ...INPUT_STYLE,                  ...(apiErrors.email?.length ? { border: "1px solid rgba(220,38,38,0.7)" } : {}),
                }}
                onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                {...register("email")}
                onBlur={e => { e.currentTarget.style.border = apiErrors.email?.length ? "1px solid rgba(220,38,38,0.7)" : `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
              />              {apiErrors.email && (
                <div style={{ marginTop: 4, paddingLeft: 14 }}>
                  {apiErrors.email.map((msg, i) => (
                    <p key={i} style={{ fontSize: 10, color: "#fca5a5", lineHeight: 1.4, margin: 0 }}>• {msg}</p>
                  ))}
                </div>
              )}
            </div>            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  style={{
                    ...INPUT_STYLE,
                    paddingRight: 40,                  ...(apiErrors.password?.length ? { border: "1px solid rgba(220,38,38,0.7)" } : {}),
                }}
                onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                {...register("password")}
                onBlur={e => { e.currentTarget.style.border = apiErrors.password?.length ? "1px solid rgba(220,38,38,0.7)" : `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "rgba(201,162,39,0.6)",
                    display: "flex",
                    alignItems: "center",
                  }}
                  tabIndex={-1}
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
              </div>              {apiErrors.password && (
                <div style={{ marginTop: 4, paddingLeft: 14 }}>
                  {apiErrors.password.map((msg, i) => (
                    <p key={i} style={{ fontSize: 10, color: "#fca5a5", lineHeight: 1.4, margin: 0 }}>• {msg}</p>
                  ))}
                </div>
              )}
            </div>

            {/* General API Error */}
            {apiErrors.general && (
              <div style={{
                width: "100%",
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(220,38,38,0.15)",
                border: "1px solid rgba(220,38,38,0.4)",
                fontSize: 11,
                color: "#fca5a5",
                lineHeight: 1.5,
                textAlign: "center",
              }}>
                {apiErrors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              onClick={triggerRipple}
              style={{
                position: "relative",
                overflow: "hidden",
                marginTop: 4,
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
                <span key={r.id} className="animate-ripple" style={{ position: "absolute", left: r.x, top: r.y, width: 56, height: 56, borderRadius: "50%", background: "rgba(245,204,78,0.4)", pointerEvents: "none" }} />
              ))}              {isSubmitting ? "···" : "ĐĂNG NHẬP"}
            </button>

            {/* Forgot password link */}
            <button
              type="button"
              onClick={openForgotModal}
              style={{
                marginTop: 2,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                color: `rgba(201,162,39,0.75)`,
                textDecoration: "underline",
                letterSpacing: "0.03em",
                padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(201,162,39,0.75)")}
            >
              Quên mật khẩu?
            </button>
          </form>
        </div>      </div>      {/* ── Forgot Password Modal ── */}
      {showForgotModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              width: 340,
              padding: "32px 28px",
              borderRadius: 20,
              background: "rgba(15,11,5,0.95)",
              backdropFilter: "blur(24px)",
              border: `1.5px solid rgba(201,162,39,0.45)`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(245,204,78,0.15)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(201,162,39,0.12)",
              border: `1.5px solid rgba(201,162,39,0.4)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={GOLD} strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center" }}>
              <h3 style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.05em",
              }}>
                Quên mật khẩu
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "rgba(245,230,176,0.55)", lineHeight: 1.5 }}>
                Nhập email tài khoản admin. Mật khẩu mới sẽ được gửi qua email.
              </p>
            </div>

            {/* Gold divider */}
            <div style={{
              width: "60%", height: 1,
              background: `linear-gradient(90deg, transparent, rgba(201,162,39,0.5), transparent)`,
            }} />

            {fpSuccess ? (
              /* Success state */
              <div style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.35)",
                textAlign: "center",
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2} style={{ display: "block", margin: "0 auto 8px" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ margin: 0, fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>
                  Email đặt lại mật khẩu đã được gửi!<br />
                  Vui lòng kiểm tra hộp thư của bạn.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    marginTop: 14,
                    padding: "8px 28px",
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#0f0b07",
                    cursor: "pointer",
                    letterSpacing: "0.1em",
                  }}
                >
                  ĐÓNG
                </button>
              </div>
            ) : (
              /* Form state */
              <>
                <div style={{ width: "100%" }}>
                  <input
                    type="email"
                    placeholder="Email tài khoản admin"
                    value={fpEmail}
                    onChange={e => { setFpEmail(e.target.value); setFpError(null); }}
                    onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                    style={{
                      ...INPUT_STYLE,
                      ...(fpError ? { border: "1px solid rgba(220,38,38,0.7)" } : {}),
                    }}
                    onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                    onBlur={e => { e.currentTarget.style.border = fpError ? "1px solid rgba(220,38,38,0.7)" : `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                    autoFocus
                  />
                  {fpError && (
                    <p style={{ marginTop: 4, paddingLeft: 14, fontSize: 10, color: "#fca5a5", lineHeight: 1.4 }}>
                      {fpError}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(201,162,39,0.3)`,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(245,230,176,0.6)",
                      cursor: "pointer",
                      letterSpacing: "0.08em",
                      transition: "border 0.15s, color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,162,39,0.6)"; e.currentTarget.style.color = "#f5e6b0"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(201,162,39,0.3)"; e.currentTarget.style.color = "rgba(245,230,176,0.6)"; }}
                  >
                    HỦY
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={fpLoading}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 20,
                      background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD}, ${GOLD_DARK})`,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0f0b07",
                      cursor: fpLoading ? "not-allowed" : "pointer",
                      letterSpacing: "0.1em",
                      boxShadow: "0 4px 16px rgba(201,162,39,0.4)",
                      opacity: fpLoading ? 0.75 : 1,
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { if (!fpLoading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 22px rgba(201,162,39,0.55)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(201,162,39,0.4)"; }}
                  >
                    {fpLoading ? "···" : "GỬI"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Franchise Picker Modal */}
      {showFranchisePicker && pendingProfile && (
        <FranchisePickerModal
          roles={pendingProfile.roles}
          loading={isSwitching}
          onSelect={(role) => handleSwitchContextAndNavigate(pendingProfile, role)}
          onClose={() => { setShowFranchisePicker(false); setPendingProfile(null); }}
        />
      )}
    </div>
  );
};

export default AdminLoginPage;
