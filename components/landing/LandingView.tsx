import Link from "next/link";
import Image from "next/image";
import { Users, MessageSquare, Calendar, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Бізнес-стрічка",
    description: "Ідеї, проєкти, пошук партнерів і фахівців — контент, який перетворюється на знайомства й угоди.",
  },
  {
    icon: Users,
    title: "Спільноти",
    description: "Закриті групи за інтересами, з обговореннями, подіями та ефірами всередині.",
  },
  {
    icon: MessageSquare,
    title: "Мережа знайомств",
    description: "Запити на співпрацю, рекомендації на основі спільних інтересів, приватні повідомлення в реальному часі.",
  },
  {
    icon: Calendar,
    title: "Заходи",
    description: "Створюйте події спільноти й реєструйте на них учасників.",
  },
];

export default function LandingView() {
  return (
    <div className="min-h-screen bg-base text-ink-primary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Image src="/anexa-logo-wordmark.png" alt="ANEXA" width={111} height={34} priority />
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-[13.5px] font-medium text-ink-secondary transition-colors hover:text-ink-primary"
          >
            Увійти
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-grad-purple-blue px-4 py-2 text-[13.5px] font-semibold text-white shadow-glow-purple transition-opacity hover:opacity-90"
          >
            Приєднатися
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 text-center sm:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,92,255,0.18)_0%,transparent_70%)]"
          />
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-base-card px-4 py-1.5 text-[12.5px] font-medium text-purple-soft">
            Приватна бізнес-спільнота · Закрита бета
          </div>
          <h1 className="mx-auto max-w-3xl text-[40px] font-semibold leading-[1.15] tracking-tight sm:text-[52px]">
            Простір, де амбітні люди будують майбутнє.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-secondary">
            Засновники, інвестори та фрілансери — в одному фокусованому просторі. Без шуму, без
            алгоритмів, лише люди, які будують.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-grad-purple-blue px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-glow-purple transition-opacity hover:opacity-90 sm:w-auto"
            >
              Приєднатися до ANEXA
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-border-subtle px-7 py-3.5 text-[14.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.04] sm:w-auto"
            >
              Увійти в акаунт
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-ink-tertiary">
            Реєстрація за запрошенням — введіть код або посилання від учасника спільноти.
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-border-subtle bg-base-card p-5 transition-colors hover:border-border-strong"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-grad-purple-blue">
                  <Icon size={17} className="text-white" />
                </div>
                <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink-primary">{title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-secondary">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-[12.5px] text-ink-tertiary">
        © 2026 ANEXA. Усі права захищено.
      </footer>
    </div>
  );
}
