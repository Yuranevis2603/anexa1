export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-ink-primary">
        Головна
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-secondary">
        Тут з'явиться стрічка (Feed) — модуль №1 у черзі розробки.
      </p>

      <div className="glass mt-6 rounded-2xl border border-border-subtle p-6">
        <p className="text-[13.5px] text-ink-tertiary">
          Каркас застосунку готовий: Sidebar, Header, dark theme, дизайн-система.
          Наступний крок — модуль Feed.
        </p>
      </div>
    </div>
  );
}
