import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../../services/auth.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError, showSuccess } from "../../../utils";
import logoHylux from "../../../assets/logo-hylux.png";

type RegisterFormValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptPolicy: boolean;
};

const GOLD = "#c9a227";
const GOLD_LIGHT = "#f5cc4e";
const GOLD_DARK = "#8b6914";

const BUBBLES = [
  { size: 9,  left: "8%",  dur: 8,  delay: 0   },
  { size: 14, left: "20%", dur: 11, delay: 2    },
  { size: 6,  left: "35%", dur: 7,  delay: 0.8  },
  { size: 11, left: "50%", dur: 12, delay: 3    },
  { size: 8,  left: "65%", dur: 9,  delay: 0.4  },
  { size: 16, left: "78%", dur: 10, delay: 1.5  },
  { size: 5,  left: "90%", dur: 8,  delay: 3.5  },
  { size: 10, left: "28%", dur: 13, delay: 5    },
  { size: 7,  left: "60%", dur: 9,  delay: 2.2  },
  { size: 12, left: "45%", dur: 15, delay: 4    },
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

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.58 10.58a2 2 0 002.84 2.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.88 5.09A9.77 9.77 0 0112 5c5.2 0 9.23 3.62 11 7-1.02 2.01-2.76 4.12-5.13 5.54" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.11 6.11C4.09 7.31 2.62 9.05 1 12c1.77 3.38 5.8 7 11 7 1.12 0 2.2-.17 3.22-.49" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M1 12c1.77-3.38 5.8-7 11-7s9.23 3.62 11 7c-1.77 3.38-5.8 7-11 7S2.77 15.38 1 12z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );

type RippleItem = { id: number; x: number; y: number };

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleId = useRef(0);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({ defaultValues: { acceptPolicy: true } });

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      showError("Mật khẩu xác nhận không khớp");
      return;
    }
    try {
      await registerUser({ name: values.name, email: values.email, phone: values.phone, password: values.password });
      showSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.");
      navigate(ROUTER_URL.LOGIN, { replace: true });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Đăng ký thất bại. Vui lòng thử lại sau");
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
        <div className="animate-blob absolute" style={{ width: 400, height: 400, top: "-110px", left: "-80px", background: "radial-gradient(circle, rgba(201,162,39,0.2), transparent)", filter: "blur(70px)", borderRadius: "50%" }} />
        <div className="animate-blob-2 absolute" style={{ width: 340, height: 340, bottom: "-80px", right: "-60px", background: "radial-gradient(circle, rgba(245,204,78,0.16), transparent)", filter: "blur(65px)", borderRadius: "50%" }} />
        <div className="animate-blob-3 absolute" style={{ width: 280, height: 280, top: "40%", right: "20%", background: "radial-gradient(circle, rgba(139,105,20,0.18), transparent)", filter: "blur(55px)", borderRadius: "50%" }} />
      </div>

      {/* ── Rising bubbles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
        {BUBBLES.map((b, i) => (
          <div key={i} className="animate-bubble absolute rounded-full" style={{
            width: b.size, height: b.size, bottom: -20, left: b.left,
            background: "rgba(201,162,39,0.22)", border: "1px solid rgba(245,204,78,0.45)",
            backdropFilter: "blur(2px)", animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
          }} />
        ))}
      </div>

      {/* ── Card ── */}
      <div className="animate-card-pop relative z-10" style={{ width: 420, minHeight: 560 }}>
        <div
          className="animate-water-morph absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: "rgba(15,11,5,0.82)",
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            border: `1.5px solid rgba(201,162,39,0.45)`,
            boxShadow: "0 32px 72px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,204,78,0.15)",
          }}
        >
          {/* Logo */}
          <img src={logoHylux} alt="HyLux Coffee"
            style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 8, filter: "drop-shadow(0 0 12px rgba(201,162,39,0.5))" }}
          />

          {/* Gold divider */}
          <div style={{ width: "55%", height: 2, marginBottom: 10, background: `linear-gradient(90deg, transparent, rgba(245,204,78,0.85), transparent)`, borderRadius: 10 }} />

          {/* Title */}
          <h2 style={{ color: GOLD_LIGHT, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16, textAlign: "center" }}>
            Tạo tài khoản HyLux
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 260 }}
          >
            {/* Name */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input type="text" placeholder="Họ và tên" style={INPUT_STYLE}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("name", { required: "Họ và tên không được để trống" })}
                  onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
              </div>
              {errors.name && <p style={{ marginTop: 3, marginLeft: 14, fontSize: 10, color: GOLD_LIGHT, lineHeight: 1 }}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input type="email" placeholder="Email" autoComplete="email" style={INPUT_STYLE}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("email", { required: "Email không hợp lệ", pattern: { value: /\S+@\S+\.\S+/, message: "Email không hợp lệ" } })}
                  onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
              </div>
              {errors.email && <p style={{ marginTop: 3, marginLeft: 14, fontSize: 10, color: GOLD_LIGHT, lineHeight: 1 }}>{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input type="tel" placeholder="Số điện thoại" style={INPUT_STYLE}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("phone", { required: "SĐT không hợp lệ", pattern: { value: /^[0-9]{9,11}$/, message: "SĐT không hợp lệ" } })}
                  onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
              </div>
              {errors.phone && <p style={{ marginTop: 3, marginLeft: 14, fontSize: 10, color: GOLD_LIGHT, lineHeight: 1 }}>{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" autoComplete="new-password"
                  style={{ ...INPUT_STYLE, paddingRight: 42 }}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("password", { required: "Vui lòng nhập mật khẩu", minLength: { value: 5, message: "Ít nhất 5 ký tự" } })}
                  onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: GOLD, padding: 0, display: "flex" }}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && <p style={{ marginTop: 3, marginLeft: 14, fontSize: 10, color: GOLD_LIGHT, lineHeight: 1 }}>{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Xác nhận mật khẩu" autoComplete="new-password"
                  style={{ ...INPUT_STYLE, paddingRight: 42 }}
                  onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                  {...register("confirmPassword", { required: "Mật khẩu không khớp", validate: (v) => v === watch("password") || "Mật khẩu không khớp" })}
                  onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: GOLD, padding: 0, display: "flex" }}>
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {errors.confirmPassword && <p style={{ marginTop: 3, marginLeft: 14, fontSize: 10, color: GOLD_LIGHT, lineHeight: 1 }}>{errors.confirmPassword.message}</p>}
            </div>

            {/* Policy checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", fontSize: 11, color: "rgba(245,230,176,0.65)", cursor: "pointer" }}>
              <input type="checkbox" style={{ marginTop: 2, accentColor: GOLD }}
                {...register("acceptPolicy", { required: "Bạn cần đồng ý với điều khoản" })}
              />
              <span>
                Tôi đồng ý với{" "}
                <span style={{ fontWeight: 700, color: GOLD }}>Điều khoản</span> và{" "}
                <span style={{ fontWeight: 700, color: GOLD }}>Chính sách</span>.
              </span>
            </label>
            {errors.acceptPolicy && <p style={{ fontSize: 10, color: GOLD_LIGHT, alignSelf: "flex-start", marginTop: -4 }}>{errors.acceptPolicy.message}</p>}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={triggerRipple}
              style={{
                position: "relative", overflow: "hidden",
                marginTop: 6, padding: "12px 52px",
                borderRadius: 30, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em",
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
              ))}
              {isSubmitting ? "···" : "ĐĂNG KÝ"}
            </button>
          </form>
        </div>

        {/* ── Floating circle: Đăng nhập (bên trái) ── */}
        <button type="button" onClick={() => navigate(ROUTER_URL.LOGIN)}
          className="animate-bouncefloat absolute flex flex-col items-center justify-center text-center font-semibold"
          style={{
            width: 90, height: 90, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
            boxShadow: `6px 6px 18px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.25), 0 0 22px rgba(201,162,39,0.4)`,
            fontSize: 10.5, lineHeight: 1.5,
            left: -28, top: "28%",
            border: `1.5px solid rgba(245,204,78,0.6)`,
            color: "#1a1209", cursor: "pointer", transition: "transform 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          Đăng<br />nhập
        </button>

        {/* ── Floating circle: Quên mật khẩu (bên trái) ── */}
        <button type="button" onClick={() => navigate(ROUTER_URL.RESET_PASSWORD)}
          className="animate-bouncefloat-2 absolute flex flex-col items-center justify-center text-center font-semibold"
          style={{
            width: 78, height: 78, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
            boxShadow: `5px 5px 16px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.2), 0 0 18px rgba(201,162,39,0.35)`,
            fontSize: 10.5, lineHeight: 1.5,
            left: -14, top: "62%",
            border: `1.5px solid rgba(201,162,39,0.55)`,
            color: "#1a1209", cursor: "pointer", transition: "transform 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        >
          Quên<br />mật khẩu
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;
