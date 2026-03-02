import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../../components";
import { verifyToken, resendToken } from "../../../services/auth.service";
import { ROUTER_URL } from "../../../routes/router.const";
import { showError, showSuccess } from "../../../utils";
import bgUserLogin from "../../../assets/bg-user-login.jpg";

type VerifyStatus = "loading" | "success" | "error";

const VerifyEmailPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Token không hợp lệ hoặc không tìm thấy.");
        return;
      }

      try {
        await verifyToken(token);
        setStatus("success");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Xác thực email thất bại. Token có thể đã hết hạn."
        );
      }
    };

    verify();
  }, [token]);

  const handleResendToken = async () => {
    if (!resendEmail.trim()) {
      showError("Vui lòng nhập email");
      return;
    }

    setIsResending(true);
    try {
      await resendToken(resendEmail.trim());
      showSuccess("Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Gửi lại email thất bại";
      showError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: `url(${bgUserLogin})` }}
    >
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute right-0 top-0 h-full w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100 px-6 py-12 animate-slide-in-right">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Loading */}
          {status === "loading" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-700">Đang xác thực email...</h1>
              <p className="text-sm text-slate-500">Vui lòng đợi trong giây lát.</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  Xác thực thành công!
                </h1>
                <p className="text-sm text-slate-600">
                  Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.
                </p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate(ROUTER_URL.LOGIN, { replace: true })}
              >
                Đăng nhập ngay
              </Button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  Xác thực thất bại
                </h1>
                <p className="text-sm text-slate-600">{errorMessage}</p>
              </div>

              {/* Resend token section */}
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Gửi lại email xác thực?</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-primary-200 transition focus:ring placeholder:text-slate-600 placeholder:font-normal"
                  placeholder="Nhập email của bạn"
                />
                <Button
                  type="button"
                  className="w-full"
                  loading={isResending}
                  onClick={handleResendToken}
                >
                  {isResending ? "Đang gửi..." : "Gửi lại email xác thực"}
                </Button>
              </div>

              <button
                type="button"
                onClick={() => navigate(ROUTER_URL.LOGIN)}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
