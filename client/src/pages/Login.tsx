import { LogIn, Mail, ShieldCheck } from "lucide-react";
import { startLogin } from "@/const";

const LOGO_URL = "/manus-storage/pasted_file_YYT9iG_image_fa68451c.png";

export default function Login() {
  return (
    <main className="login-page" dir="rtl">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src={LOGO_URL} alt="RONIPLANNER" />
        <span className="login-kicker">مخططك اليومي الذكي</span>
        <h1 id="login-title">مرحبًا بك في RONI Planner</h1>
        <p className="login-description">سجّل الدخول لحفظ مهامك وتذكيراتك ومزامنتها بين أجهزتك.</p>
        <button type="button" className="login-primary" onClick={() => startLogin()}>
          <LogIn size={18} />
          المتابعة عبر Google أو البريد الإلكتروني
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
