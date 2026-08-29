import type { LucideIcon } from "lucide-react";

export default function ComingSoon({ icon: Icon, title, note }: { icon: LucideIcon; title: string; note: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-ink-tertiary">
        <Icon size={22} />
      </div>
      <h1 className="font-display mt-4 text-lg font-semibold text-ink-primary">{title}</h1>
      <p className="mt-1.5 max-w-sm text-[13px] text-ink-tertiary">{note}</p>
      <a
        href="/admin"
        className="mt-5 rounded-lg border border-border-subtle px-4 py-2 text-[12.5px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
      >
        До огляду
      </a>
    </div>
  );
}
