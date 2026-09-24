import { AlertCircle, LogIn, Loader2, Mail, ShieldCheck } from "lucide-react";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

const LOGO_URL = "/manus-storage/pasted_file_YYT9iG_image_fa68451c.png";

export default function Login() {
  const { isAuthenticated, loading, error: authError } = useAuth();
  const [loginError, setLoginError] = useState("");
  const [startingLogin, setStartingLogin] = useState(false);
  useEffect(() => {
    if (!loading && isAuthenticated) window.location.replace("/");
  }, [isAuthenticated, loading]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error") || params.get("oauth_error") || params.get("message");
    if (error) {
      const normalized = error.toLowerCase();
      setLoginError(normalized.includes("cancel") || normalized.includes("denied") ? "تم إلغاء تسجيل الدخول. يمكنك المحاولة مرة أخرى." : "لم ينجح تسجيل الدخول. تأكد من الحساب ثم حاول مرة أخرى.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);
  useEffect(() => {
    if (!authError || isAuthenticated) return;
    setLoginError("تعذر التحقق من تسجيل الدخول. تحقق من اتصال الإنترنت وحاول مرة أخرى.");
  }, [authError, isAuthenticated]);
  const beginLogin = () => {
    setLoginError("");
    setStartingLogin(true);
    try { startLogin(); } catch { setStartingLogin(false); setLoginError("تعذر فتح صفحة تسجيل الدخول. تحقق من اتصال الإنترنت وحاول مرة أخرى."); }
  };

  return (
    <main className="login-page" dir="rtl">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src={LOGO_URL} alt="RONIPLANNER" />
        <span className="login-kicker">مخططك اليومي الذكي</span>
        <h1 id="login-title">مرحبًا بك في RONI Planner</h1>
        <p className="login-description">سجّل الدخول لحفظ مهامك وتذكيراتك ومزامنتها بين أجهزتك.</p>
        {loginError && <div className="login-error" role="alert"><AlertCircle size={18} /><span>{loginError}</span></div>}
        <button type="button" className="login-primary" onClick={beginLogin} disabled={startingLogin}>
          {startingLogin ? <Loader2 size={18} className="login-spinner" /> : <LogIn size={18} />}
          {startingLogin ? "جارٍ فتح صفحة الدخول…" : "المتابعة عبر Google أو البريد الإلكتروني"}
        </button>
        <div className="login-divider"><span>دخول آمن</span></div>
        <div className="login-benefits">
          <div><ShieldCheck size={18} /><span>حساب محمي وآمن</span></div>
          <div><Mail size={18} /><span>اختر Google أو البريد الإلكتروني من صفحة الدخول</span></div>
        </div>
        <p className="login-note">سيتم فتح بوابة تسجيل الدخول الرسمية. لا نطلب كلمة المرور داخل هذا الموقع.</p>
      </section>
    </main>
  );
}
