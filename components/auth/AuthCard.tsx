"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type View = "login" | "register" | "forgot";

type FieldErrors = Record<string, string>;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function passwordScore(v: string) {
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  return v.length ? Math.max(score, 1) : 0;
}

const strengthColors = ["#F0655F", "#F0655F", "#E8A23C", "#4FD1A5"];
const strengthText = ["Занадто слабкий", "Слабкий", "Добре", "Надійний"];

export default function AuthCard({
  initialView = "login",
  initialInvite,
}: {
  initialView?: View;
  /** Prefills the invite field from a referral link's ?invite= param. */
  initialInvite?: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);

  // ---- shared / login state ----
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});
  const [loginAlert, setLoginAlert] = useState<{ text: string; type: "danger" | "success" } | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const loginHoneypot = useRef<HTMLInputElement>(null);

  // ---- register state ----
  const [regFirst, setRegFirst] = useState("");
  const [regLast, setRegLast] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regInvite, setRegInvite] = useState(initialInvite ?? "");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regShowPw, setRegShowPw] = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<FieldErrors>({});
  const [termsError, setTermsError] = useState(false);
  const [regAlert, setRegAlert] = useState<{ text: string; type: "danger" | "success" } | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const regHoneypot = useRef<HTMLInputElement>(null);

  // ---- forgot state ----
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const forgotHoneypot = useRef<HTMLInputElement>(null);

  function switchView(next: View) {
    setLoginAlert(null);
    setLoginErrors({});
    setRegAlert(null);
    setRegErrors({});
    setTermsError(false);
    if (next === "forgot") {
      setForgotSent(false);
      setForgotEmail("");
      setForgotError(false);
    }
    setView(next);
  }

  // ---------------- LOGIN ----------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginAlert(null);
    setLoginErrors({});

    if (loginHoneypot.current?.value) return; // bot

    const errors: FieldErrors = {};
    if (!isValidEmail(loginEmail)) errors.email = "Введіть коректну email-адресу";
    if (!loginPassword) errors.password = "Введіть пароль";
    if (Object.keys(errors).length) {
      setLoginErrors(errors);
      return;
    }

    setLoginLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoginLoading(false);

    if (error) {
      setLoginAlert({ text: "Невірний email або пароль. Спробуйте ще раз.", type: "danger" });
      return;
    }

    setLoginAlert({ text: "Вхід виконано успішно. Перенаправлення…", type: "success" });
    router.push("/dashboard");
    router.refresh();
  }

  // ---------------- REGISTER ----------------
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegAlert(null);
    setRegErrors({});
    setTermsError(false);

    if (regHoneypot.current?.value) return; // bot

    const errors: FieldErrors = {};
    if (!regFirst.trim()) errors.first = "Обов'язкове поле";
    if (!regLast.trim()) errors.last = "Обов'язкове поле";
    if (!isValidEmail(regEmail)) errors.email = "Введіть коректну email-адресу";
    if (!regInvite.trim()) errors.invite = "Введіть код запрошення";
    if (passwordScore(regPassword) < 2) errors.password = "Оберіть надійніший пароль (мінімум 8 символів)";
    if (regConfirm !== regPassword || !regConfirm) errors.confirm = "Паролі не збігаються";
    let terms = true;
    if (!agreeTerms) {
      terms = false;
      setTermsError(true);
    }
    if (Object.keys(errors).length || !terms) {
      setRegErrors(errors);
      return;
    }

    setRegLoading(true);
    const supabase = createClient();

    try {
      // 1. Validate the code — either an unused invite_codes entry or a
      //    member's persistent referral code.
      const { data: isValid, error: inviteError } = await supabase.rpc("validate_invite_code", {
        p_code: regInvite.trim(),
      });

      if (inviteError || !isValid) {
        setRegErrors({ invite: "Невірний або вже використаний код запрошення" });
        setRegLoading(false);
        return;
      }

      // 2. Sign up. full_name goes into user metadata so the DB trigger
      //    (handle_new_user) creates the profiles row for us automatically —
      //    we must NOT insert into profiles ourselves or it collides with the trigger.
      const { error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            full_name: `${regFirst.trim()} ${regLast.trim()}`.trim(),
            invite_code: regInvite.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setRegErrors({ email: "Акаунт з такою email-адресою вже існує" });
        } else {
          setRegAlert({ text: signUpError.message, type: "danger" });
        }
        setRegLoading(false);
        return;
      }

      // The invite code is marked used server-side by the handle_new_user
      // trigger (reads invite_code from the signup metadata above), so no
      // client-side update is needed here — that would fail RLS whenever
      // email confirmation is required and no session exists yet.
      setRegAlert({ text: "Акаунт створено. Ласкаво просимо до ANEXA.", type: "success" });
      setRegLoading(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setRegAlert({ text: "Сталася помилка. Спробуйте ще раз.", type: "danger" });
      setRegLoading(false);
    }
  }

  // ---------------- FORGOT ----------------
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(false);

    if (forgotHoneypot.current?.value) return; // bot

    if (!isValidEmail(forgotEmail)) {
      setForgotError(true);
      return;
    }

    setForgotLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setForgotLoading(false);
    setForgotSent(true);
  }

  const regScore = passwordScore(regPassword);

  return (
    <div className="page">
      <aside className="brand-panel">
        <div className="brand-top">
          <div className="logo-row">
            <Image className="logo-wordmark" src="/anexa-logo-wordmark.png" alt="ANEXA" width={111} height={34} priority />
          </div>
        </div>

        <div className="brand-mid">
          <div className="brand-eyebrow">Приватна бізнес-мережа</div>
          <h1 className="brand-heading">Простір, де амбітні люди будують майбутнє.</h1>
          <p className="brand-sub">
            Засновники, інвестори та фрілансери — в одному фокусованому просторі. Без шуму, без алгоритмів, лише люди, які будують.
          </p>
        </div>

        <div className="brand-bottom">
          <svg className="constellation" viewBox="0 0 360 180" fill="none">
            <line x1="30" y1="150" x2="90" y2="110" stroke="url(#lg1)" strokeWidth="1.4" />
            <line x1="90" y1="110" x2="150" y2="125" stroke="url(#lg1)" strokeWidth="1.4" />
            <line x1="150" y1="125" x2="210" y2="70" stroke="url(#lg1)" strokeWidth="1.4" />
            <line x1="210" y1="70" x2="270" y2="85" stroke="url(#lg1)" strokeWidth="1.4" />
            <line x1="270" y1="85" x2="330" y2="30" stroke="url(#lg1)" strokeWidth="1.4" />
            <line x1="150" y1="125" x2="180" y2="150" stroke="url(#lg1)" strokeWidth="1" opacity="0.5" />
            <line x1="210" y1="70" x2="230" y2="110" stroke="url(#lg1)" strokeWidth="1" opacity="0.5" />
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#6C7CF6" stopOpacity="0.15" />
                <stop offset="1" stopColor="#9B7CF6" stopOpacity="0.65" />
              </linearGradient>
            </defs>
            <g fill="#6C7CF6">
              <circle cx="30" cy="150" r="3" opacity="0.5" />
              <circle cx="90" cy="110" r="3.2" opacity="0.65" />
              <circle cx="150" cy="125" r="3" opacity="0.5" />
              <circle cx="180" cy="150" r="2.2" opacity="0.35" />
              <circle cx="210" cy="70" r="3.6" opacity="0.8" />
              <circle cx="230" cy="110" r="2.2" opacity="0.35" />
              <circle cx="270" cy="85" r="3.4" opacity="0.75" />
            </g>
            <circle cx="330" cy="30" r="5" fill="#B3A3FA" />
            <circle cx="330" cy="30" r="9" fill="none" stroke="#9B7CF6" strokeWidth="1" opacity="0.4" />
          </svg>
          <p className="brand-footer-text">© 2026 ANEXA. Усі права захищено.</p>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="card-wrap">
          <div className="mobile-brand">
            <Image className="logo-wordmark" src="/anexa-logo-wordmark.png" alt="ANEXA" width={151} height={46} priority />
            <p className="brand-sub-mobile">Простір, де амбітні люди будують майбутнє.</p>
          </div>

          <div className="card">
            {view === "login" && (
              <div className="view active">
                <div className="view-head">
                  <h2 className="view-title">З поверненням</h2>
                  <p className="view-sub">Увійдіть у свій акаунт ANEXA</p>
                </div>

                {loginAlert && (
                  <div className={`alert show ${loginAlert.type}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                    <span>{loginAlert.text}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} noValidate>
                  <input ref={loginHoneypot} type="text" name="anexa_hp_x7q2" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                  <div className={`field ${loginErrors.email ? "error" : ""}`}>
                    <label htmlFor="login-email">Email</label>
                    <input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginErrors((p) => ({ ...p, email: "" }));
                      }}
                    />
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v5M12 16h.01" />
                      </svg>
                      <span>{loginErrors.email}</span>
                    </div>
                  </div>

                  <div className={`field ${loginErrors.password ? "error" : ""}`}>
                    <label htmlFor="login-password">Пароль</label>
                    <div className="input-wrap">
                      <input
                        id="login-password"
                        type={loginShowPw ? "text" : "password"}
                        className="has-toggle"
                        placeholder="Введіть пароль"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginErrors((p) => ({ ...p, password: "" }));
                        }}
                      />
                      <button type="button" className="toggle-visibility" onClick={() => setLoginShowPw((s) => !s)} aria-label={loginShowPw ? "Приховати пароль" : "Показати пароль"}>
                        <EyeIcon open={loginShowPw} />
                      </button>
                    </div>
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v5M12 16h.01" />
                      </svg>
                      <span>{loginErrors.password}</span>
                    </div>
                  </div>

                  <div className="form-row">
                    <label className="checkbox-row">
                      <input type="checkbox" />
                      <span className="checkbox-box">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="checkbox-label">Запам&apos;ятати мене</span>
                    </label>
                    <button type="button" className="link-btn" onClick={() => switchView("forgot")}>
                      Забули пароль?
                    </button>
                  </div>

                  <button type="submit" className={`btn-primary ${loginLoading ? "loading" : ""}`} disabled={loginLoading}>
                    <span className="spinner" />
                    <span className="label">Увійти</span>
                  </button>
                </form>

                <p className="switch-line">
                  Немає акаунту?
                  <button type="button" onClick={() => switchView("register")}>
                    Створити акаунт
                  </button>
                </p>
              </div>
            )}

            {view === "register" && (
              <div className="view active">
                <div className="view-head">
                  <h2 className="view-title">Створіть акаунт</h2>
                  <p className="view-sub">Приєднуйтесь до ANEXA та знайомтесь з амбітними людьми, які будують майбутнє.</p>
                </div>

                {regAlert && (
                  <div className={`alert show ${regAlert.type}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                    <span>{regAlert.text}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} noValidate>
                  <input ref={regHoneypot} type="text" name="anexa_hp_x7q2" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                  <div className="name-row">
                    <div className={`field ${regErrors.first ? "error" : ""}`}>
                      <label htmlFor="reg-first">Ім&apos;я</label>
                      <input id="reg-first" type="text" placeholder="Олена" autoComplete="given-name" value={regFirst} onChange={(e) => { setRegFirst(e.target.value); setRegErrors((p) => ({ ...p, first: "" })); }} />
                      <div className="field-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                        <span>{regErrors.first}</span>
                      </div>
                    </div>
                    <div className={`field ${regErrors.last ? "error" : ""}`}>
                      <label htmlFor="reg-last">Прізвище</label>
                      <input id="reg-last" type="text" placeholder="Коваль" autoComplete="family-name" value={regLast} onChange={(e) => { setRegLast(e.target.value); setRegErrors((p) => ({ ...p, last: "" })); }} />
                      <div className="field-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                        <span>{regErrors.last}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`field ${regErrors.email ? "error" : ""}`}>
                    <label htmlFor="reg-email">Email</label>
                    <input id="reg-email" type="email" placeholder="you@company.com" autoComplete="email" value={regEmail} onChange={(e) => { setRegEmail(e.target.value); setRegErrors((p) => ({ ...p, email: "" })); }} />
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                      <span>{regErrors.email}</span>
                    </div>
                  </div>

                  <div className={`field ${regErrors.invite ? "error" : ""}`}>
                    <label htmlFor="reg-invite">Код запрошення</label>
                    <input id="reg-invite" type="text" placeholder="Введіть код" autoComplete="off" value={regInvite} onChange={(e) => { setRegInvite(e.target.value); setRegErrors((p) => ({ ...p, invite: "" })); }} />
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                      <span>{regErrors.invite}</span>
                    </div>
                    <div className="field-hint">ANEXA — приватна спільнота із закритою бетою</div>
                  </div>

                  <div className={`field ${regErrors.password ? "error" : ""}`}>
                    <label htmlFor="reg-password">Пароль</label>
                    <div className="input-wrap">
                      <input
                        id="reg-password"
                        type={regShowPw ? "text" : "password"}
                        className="has-toggle"
                        placeholder="Створіть пароль"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => { setRegPassword(e.target.value); setRegErrors((p) => ({ ...p, password: "" })); }}
                      />
                      <button type="button" className="toggle-visibility" onClick={() => setRegShowPw((s) => !s)} aria-label={regShowPw ? "Приховати пароль" : "Показати пароль"}>
                        <EyeIcon open={regShowPw} />
                      </button>
                    </div>
                    <div className="strength">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} style={{ background: i < regScore ? strengthColors[Math.max(regScore - 1, 0)] : "rgba(255,255,255,0.08)" }} />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: regPassword ? strengthColors[Math.max(regScore - 1, 0)] : "var(--text-muted)" }}>
                      {regPassword ? strengthText[Math.max(regScore - 1, 0)] : "Мінімум 8 символів"}
                    </span>
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                      <span>{regErrors.password}</span>
                    </div>
                  </div>

                  <div className={`field ${regErrors.confirm ? "error" : ""}`}>
                    <label htmlFor="reg-confirm">Підтвердіть пароль</label>
                    <div className="input-wrap">
                      <input
                        id="reg-confirm"
                        type={regShowConfirm ? "text" : "password"}
                        className="has-toggle"
                        placeholder="Введіть пароль ще раз"
                        autoComplete="new-password"
                        value={regConfirm}
                        onChange={(e) => { setRegConfirm(e.target.value); setRegErrors((p) => ({ ...p, confirm: "" })); }}
                      />
                      <button type="button" className="toggle-visibility" onClick={() => setRegShowConfirm((s) => !s)} aria-label={regShowConfirm ? "Приховати пароль" : "Показати пароль"}>
                        <EyeIcon open={regShowConfirm} />
                      </button>
                    </div>
                    <div className="field-error">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                      <span>{regErrors.confirm}</span>
                    </div>
                  </div>

                  <label className="checkbox-row" style={{ marginTop: "2px" }}>
                    <input type="checkbox" checked={agreeTerms} onChange={(e) => { setAgreeTerms(e.target.checked); setTermsError(false); }} />
                    <span className="checkbox-box">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span className="checkbox-label">
                      Я погоджуюсь з <a href="#">Умовами використання</a> та <a href="#">Політикою конфіденційності</a>
                    </span>
                  </label>
                  <div className="field-error" style={{ marginTop: "-8px", display: termsError ? "flex" : "none", maxHeight: termsError ? "30px" : 0, opacity: termsError ? 1 : 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                    <span>Щоб продовжити, прийміть умови</span>
                  </div>

                  <button type="submit" className={`btn-primary ${regLoading ? "loading" : ""}`} disabled={regLoading}>
                    <span className="spinner" />
                    <span className="label">Створити акаунт</span>
                  </button>
                </form>

                <p className="switch-line">
                  Вже маєте акаунт?
                  <button type="button" onClick={() => switchView("login")}>
                    Увійти
                  </button>
                </p>
              </div>
            )}

            {view === "forgot" && (
              <div className="view active">
                <button className="back-row" onClick={() => switchView("login")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Назад до входу
                </button>

                {!forgotSent ? (
                  <>
                    <div className="view-head">
                      <h2 className="view-title">Відновлення пароля</h2>
                      <p className="view-sub">Введіть email, прив&apos;язаний до вашого акаунту, і ми надішлемо посилання для скидання пароля.</p>
                    </div>

                    <form onSubmit={handleForgot} noValidate>
                      <input ref={forgotHoneypot} type="text" name="anexa_hp_x7q2" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                      <div className={`field ${forgotError ? "error" : ""}`}>
                        <label htmlFor="forgot-email">Email</label>
                        <input
                          id="forgot-email"
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          value={forgotEmail}
                          onChange={(e) => { setForgotEmail(e.target.value); setForgotError(false); }}
                        />
                        <div className="field-error">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
                          <span>Введіть коректну email-адресу</span>
                        </div>
                      </div>

                      <button type="submit" className={`btn-primary ${forgotLoading ? "loading" : ""}`} disabled={forgotLoading}>
                        <span className="spinner" />
                        <span className="label">Надіслати посилання</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="success-block">
                    <div className="success-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M22 6L12 15l-4-4M22 6l-10 9-4-4" /></svg>
                    </div>
                    <h2 className="view-title">Перевірте пошту</h2>
                    <p className="view-sub">Ми надіслали посилання для скидання пароля на {forgotEmail}.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{styles}</style>
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a20.3 20.3 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a20.4 20.4 0 01-3.22 4.44M14.12 14.12a3 3 0 11-4.24-4.24" />
        <path d="M1 1l22 22" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const styles = `
  :root{
    --bg: #07080D;
    --bg-2: #0A0C14;
    --panel-glow-1: #1A2352;
    --panel-glow-2: #3B2E6B;
    --card-bg: rgba(16, 18, 28, 0.55);
    --card-border: rgba(255,255,255,0.08);
    --card-border-strong: rgba(255,255,255,0.14);
    --text-primary: #F3F4F8;
    --text-secondary: #9298AC;
    --text-muted: #5C6178;
    --accent: #6C7CF6;
    --accent-2: #9B7CF6;
    --accent-soft: rgba(108,124,246,0.14);
    --accent-ring: rgba(108,124,246,0.35);
    --danger: #F0655F;
    --danger-soft: rgba(240,101,95,0.1);
    --success: #4FD1A5;
    --success-soft: rgba(79,209,165,0.1);
    --input-bg: rgba(255,255,255,0.03);
    --input-border: rgba(255,255,255,0.09);
    --radius-card: 22px;
    --radius-input: 13px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  .page{
    min-height:100vh;
    display:flex;
    background: var(--bg);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x:hidden;
  }

  .brand-panel{
    position:relative;
    width:40%;
    min-width:420px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    padding:56px 64px;
    background:
      radial-gradient(120% 90% at 15% 0%, var(--panel-glow-1) 0%, transparent 55%),
      radial-gradient(90% 70% at 85% 100%, var(--panel-glow-2) 0%, transparent 50%),
      var(--bg-2);
    border-right:1px solid rgba(255,255,255,0.06);
    overflow:hidden;
  }

  .brand-panel::after{
    content:"";
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: radial-gradient(80% 80% at 20% 20%, black 0%, transparent 70%);
    pointer-events:none;
  }

  .brand-top{ position:relative; z-index:2; }
  .logo-row{ display:flex; align-items:center; gap:12px; }
  .logo-wordmark{ display:block; object-fit:contain; filter: drop-shadow(0 4px 16px rgba(108,124,246,0.5)); }

  .brand-mid{ position:relative; z-index:2; max-width:400px; }
  .brand-eyebrow{ font-size:12px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color: var(--accent-2); margin-bottom:18px; }
  .brand-heading{ font-size:32px; font-weight:600; line-height:1.25; letter-spacing:-0.01em; color:var(--text-primary); margin-bottom:14px; }
  .brand-sub{ font-size:15px; line-height:1.6; color: var(--text-secondary); }

  .brand-bottom{ position:relative; z-index:2; }
  .constellation{ width:100%; height:180px; margin-bottom:28px; }
  .brand-footer-text{ font-size:12.5px; color: var(--text-muted); letter-spacing:0.01em; }

  .auth-panel{ flex:1; display:flex; align-items:center; justify-content:center; padding:40px; position:relative; }
  .card-wrap{ width:100%; max-width:400px; position:relative; }
  .mobile-brand{ display:none; }

  .card{
    position:relative;
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border:1px solid var(--card-border);
    border-radius: var(--radius-card);
    padding:38px 36px;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
  }

  .view-head{ margin-bottom:28px; }
  .view-title{ font-size:23px; font-weight:600; letter-spacing:-0.01em; margin-bottom:6px; }
  .view-sub{ font-size:14px; color: var(--text-secondary); line-height:1.5; }

  .alert{
    display:flex; align-items:flex-start; gap:10px;
    padding:12px 14px; border-radius:12px; font-size:13px; line-height:1.5;
    margin-bottom:18px; border:1px solid transparent;
  }
  .alert.danger{ background: var(--danger-soft); border-color: rgba(240,101,95,0.28); color:#FFC7C4; }
  .alert.success{ background: var(--success-soft); border-color: rgba(79,209,165,0.28); color:#BFF3E1; }
  .alert :global(svg){ flex-shrink:0; margin-top:1px; width:16px; height:16px; }

  form{ display:flex; flex-direction:column; gap:16px; }
  .name-row{ display:flex; gap:12px; }
  .name-row .field{ flex:1; }
  .field{ display:flex; flex-direction:column; gap:7px; }
  .field label{ font-size:12.5px; font-weight:500; color: var(--text-secondary); letter-spacing:0.01em; }

  .input-wrap{ position:relative; }
  .field input{
    width:100%; height:52px; padding:0 16px;
    background: var(--input-bg); border:1px solid var(--input-border);
    border-radius: var(--radius-input); color: var(--text-primary);
    font-size:14.5px; font-family:inherit; outline:none;
    transition: border-color .2s var(--ease), background .2s var(--ease), box-shadow .2s var(--ease);
  }
  .field input.has-toggle{ padding-right:46px; }
  .field input::placeholder{ color: var(--text-muted); }
  .field input:hover{ border-color: rgba(255,255,255,0.16); }
  .field input:focus{ border-color: var(--accent); background: rgba(108,124,246,0.05); box-shadow: 0 0 0 4px var(--accent-ring); }
  .field input:disabled{ opacity:0.45; cursor:not-allowed; background: rgba(255,255,255,0.02); }
  .field.error input{ border-color: var(--danger); background: rgba(240,101,95,0.05); }

  .field-error{
    font-size:12.5px; color: var(--danger); display:none; align-items:center; gap:6px;
  }
  .field.error .field-error{ display:flex; margin-top:1px; }
  .field-error :global(svg){ width:13px; height:13px; flex-shrink:0; }

  .field-hint{ font-size:12px; color: var(--text-muted); }

  .toggle-visibility{
    position:absolute; right:14px; top:50%; transform: translateY(-50%);
    background:none; border:none; color: var(--text-muted); cursor:pointer; padding:4px;
    display:flex; transition: color .15s var(--ease);
  }
  .toggle-visibility:hover{ color: var(--text-secondary); }
  .toggle-visibility :global(svg){ width:18px; height:18px; }

  .strength{ display:flex; gap:5px; margin-top:2px; height:3px; }
  .strength span{ flex:1; border-radius:2px; background: rgba(255,255,255,0.08); transition: background .25s var(--ease); }
  .strength-label{ font-size:12px; color: var(--text-muted); margin-top:5px; transition: color .2s var(--ease); }

  .form-row{ display:flex; align-items:center; justify-content:space-between; margin-top:-2px; }
  .checkbox-row{ display:flex; align-items:flex-start; gap:9px; cursor:pointer; user-select:none; }
  .checkbox-row input{ position:absolute; opacity:0; width:18px; height:18px; cursor:pointer; }
  .checkbox-box{
    width:18px; height:18px; border-radius:6px; border:1px solid var(--input-border);
    background: var(--input-bg); flex-shrink:0; display:flex; align-items:center; justify-content:center;
    transition: all .18s var(--ease); margin-top:1px;
  }
  .checkbox-box :global(svg){ width:11px; height:11px; opacity:0; transform: scale(0.6); transition: all .15s var(--ease); color:#fff; }
  .checkbox-row input:checked + .checkbox-box{ background: linear-gradient(135deg, var(--accent), var(--accent-2)); border-color: transparent; }
  .checkbox-row input:checked + .checkbox-box :global(svg){ opacity:1; transform:scale(1); }
  .checkbox-label{ font-size:13.5px; color: var(--text-secondary); line-height:1.5; }
  .checkbox-label :global(a){ color: var(--text-primary); text-decoration: underline; text-decoration-color: rgba(255,255,255,0.25); text-underline-offset:2px; }

  .link-btn{
    background:none; border:none; font-family:inherit; font-size:13.5px; font-weight:500;
    color: var(--text-secondary); cursor:pointer; padding:0; transition: color .15s var(--ease);
  }
  .link-btn:hover{ color: var(--accent-2); }

  .btn-primary{
    position:relative; width:100%; height:52px; border-radius: var(--radius-input); border:none;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
    color:#fff; font-family:inherit; font-size:14.5px; font-weight:600; letter-spacing:0.01em;
    cursor:pointer; margin-top:4px; box-shadow: 0 10px 30px -10px rgba(108,124,246,0.55);
    transition: transform .15s var(--ease), box-shadow .2s var(--ease), filter .15s var(--ease);
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .btn-primary:hover{ filter: brightness(1.08); }
  .btn-primary:active{ transform: scale(0.98); }
  .btn-primary:disabled{ opacity:0.55; cursor:not-allowed; box-shadow:none; filter:none; transform:none; }
  .btn-primary .label{ transition: opacity .15s var(--ease); }
  .btn-primary.loading .label{ opacity:0; }
  .spinner{
    display:none; width:18px; height:18px; border:2px solid rgba(255,255,255,0.35);
    border-top-color:#fff; border-radius:50%; position:absolute; animation: spin .7s linear infinite;
  }
  .btn-primary.loading .spinner{ display:block; }
  @keyframes spin{ to{ transform: rotate(360deg); } }

  .switch-line{ text-align:center; margin-top:26px; font-size:13.5px; color: var(--text-secondary); }
  .switch-line :global(button){
    background:none; border:none; font-family:inherit; font-size:13.5px; font-weight:600;
    color: var(--accent-2); cursor:pointer; padding:0; margin-left:2px; transition: color .15s var(--ease);
  }
  .switch-line :global(button):hover{ color:#B3A3FA; }

  .back-row{
    display:flex; align-items:center; gap:8px; background:none; border:none;
    color: var(--text-secondary); font-family:inherit; font-size:13.5px; font-weight:500;
    cursor:pointer; margin-bottom:22px; transition: color .15s var(--ease);
  }
  .back-row:hover{ color: var(--text-primary); }
  .back-row :global(svg){ width:16px; height:16px; }

  .success-block{ display:flex; flex-direction:column; align-items:center; text-align:center; padding:8px 0 4px; }
  .success-icon{
    width:56px; height:56px; border-radius:50%; background: var(--success-soft);
    border:1px solid rgba(79,209,165,0.3); display:flex; align-items:center; justify-content:center; margin-bottom:20px;
  }
  .success-icon :global(svg){ width:26px; height:26px; color: var(--success); }

  .hp-field{
    position:absolute !important; width:1px; height:1px; padding:0; margin:-1px;
    overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
  }

  @media (max-width: 980px){
    .brand-panel{ width:340px; min-width:340px; padding:44px 40px; }
    .brand-heading{ font-size:26px; }
  }

  @media (max-width: 760px){
    .page{ flex-direction:column; }
    .brand-panel{ display:none; }
    .auth-panel{ padding:28px 20px 48px; align-items:flex-start; }
    .mobile-brand{
      display:flex; flex-direction:column; align-items:center; width:100%; margin:18px 0 26px;
    }
    .mobile-brand .logo-wordmark{ margin-bottom:14px; }
    .mobile-brand .brand-sub-mobile{ font-size:13px; color: var(--text-secondary); text-align:center; max-width:280px; }
    .card{ padding:28px 22px; }
    .name-row{ flex-direction:column; gap:16px; }
    .view-title{ font-size:21px; }
  }
`;
