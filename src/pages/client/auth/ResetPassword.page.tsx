import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { customerForgotPassword } from "../../../services/auth.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError, showSuccess } from "../../../utils";
import logoHylux from "../../../assets/logo-hylux.png";

type ForgotPasswordFormValues = {
  email: string;
};

const GOLD = "#c9a227";
const GOLD_LIGHT = "#f5cc4e";
const GOLD_DARK = "#8b6914";

const BUBBLES = [
  { size: 7,  left: "8%",  dur: 8,  delay: 0   },
  { size: 12, left: "22%", dur: 11, delay: 1.5  },
  { size: 5,  left: "38%", dur: 7,  delay: 0.8  },
  { size: 9,  left: "55%", dur: 10, delay: 2.8  },
  { size: 6,  left: "70%", dur: 9,  delay: 0.3  },
  { size: 13, left: "84%", dur: 12, delay: 1.8  },
  { size: 4,  left: "94%", dur: 8,  delay: 4    },
  { size: 10, left: "48%", dur: 14, delay: 3.5  },
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

type RippleItem = { id: number; x: number; y: number };

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const rippleId = useRef(0);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormValues>();

  const triggerRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);
  };

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await customerForgotPassword(values.email);
      showSuccess("Mật khẩu mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.");
      navigate(ROUTER_URL.LOGIN, { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Yêu cầu đặt lại mật khẩu thất bại";
      showError(msg);
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
      </div>

      {/* ── Card ── */}
      <div className="animate-card-pop relative z-10" style={{ width: 400, minHeight: 440 }}>
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
          <img
            src={logoHylux}
            alt="HyLux Coffee"
            style={{ width: 85, height: 85, objectFit: "contain", marginBottom: 10, filter: "drop-shadow(0 0 12px rgba(201,162,39,0.5))" }}
          />

          {/* Gold divider */}
          <div style={{
            width: "55%", height: 2, marginBottom: 10,
            background: `linear-gradient(90deg, transparent, rgba(245,204,78,0.85), transparent)`,
            borderRadius: 10,
          }} />

          {/* Title */}
          <h2 style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6, textAlign: "center" }}>
            Quên mật khẩu
          </h2>
          <p style={{ color: "rgba(245,230,176,0.55)", fontSize: 11, marginBottom: 18, textAlign: "center", padding: "0 24px" }}>
            Nhập email để nhận mật khẩu mới qua hộp thư
          </p>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 250 }}
          >
            <div style={{ width: "100%", position: "relative", paddingBottom: 14 }}>
              <input
                type="email"
                placeholder="Email của bạn"
                autoComplete="email"
                style={INPUT_STYLE}
                onFocus={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.75)`; e.currentTarget.style.boxShadow = INPUT_FOCUS_SHADOW; }}
                {...register("email", {
                  required: "Email không được để trống",
                  pattern: { value: /\S+@\S+\.\S+/, message: "Email không hợp lệ" },
                })}
                onBlur={e => { e.currentTarget.style.border = `1px solid rgba(201,162,39,0.35)`; e.currentTarget.style.boxShadow = INPUT_BLUR_SHADOW; }}
              />
              {errors.email && (
                <p style={{ position: "absolute", bottom: 2, left: 14, fontSize: 10, color: GOLD_LIGHT, pointerEvents: "none", lineHeight: 1 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              onClick={triggerRipple}
              style={{
                position: "relative",
                overflow: "hidden",
                marginTop: 4,
                padding: "12px 40px",
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
              ))}
              {isSubmitting ? "···" : "GỬI MẬT KHẨU MỚI"}
            </button>
          </form>
        </div>
      </div>

      {/* ── Floating circle: Đăng nhập ── */}
      <button
        type="button"
        onClick={() => navigate(ROUTER_URL.LOGIN)}
        className="animate-bouncefloat absolute flex flex-col items-center justify-center text-center font-semibold"
        style={{
          width: 84, height: 84,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
          boxShadow: `6px 6px 18px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.25), 0 0 22px rgba(201,162,39,0.4)`,
          fontSize: 10.5, lineHeight: 1.5,
          right: "calc(50% - 260px)",
          top: "30%",
          border: `1.5px solid rgba(245,204,78,0.6)`,
          color: "#1a1209",
          cursor: "pointer",
          transition: "transform 0.15s",
          zIndex: 20,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        Đăng<br />nhập
      </button>

      {/* ── Floating circle: Đăng ký ── */}
      <button
        type="button"
        onClick={() => navigate(ROUTER_URL.REGISTER)}
        className="animate-bouncefloat-2 absolute flex flex-col items-center justify-center text-center font-semibold"
        style={{
          width: 72, height: 72,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`,
          boxShadow: `5px 5px 16px rgba(139,105,20,0.6), -3px -3px 10px rgba(245,204,78,0.2), 0 0 18px rgba(201,162,39,0.35)`,
          fontSize: 10.5, lineHeight: 1.5,
          right: "calc(50% - 240px)",
          top: "58%",
          border: `1.5px solid rgba(201,162,39,0.55)`,
          color: "#1a1209",
          cursor: "pointer",
          transition: "transform 0.15s",
          zIndex: 20,
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
      >
        Đăng<br />ký
      </button>
    </div>
  );
};

export default ResetPasswordPage;
