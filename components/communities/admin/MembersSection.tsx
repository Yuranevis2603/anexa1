"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { kickMember, setMemberRole, type CommunityMember, type CommunityRoleTier } from "@/lib/communities";
import { banMember, ROLE_UA, type CommunityRole } from "@/lib/communityAdmin";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

const ROLE_FILTERS: (CommunityRole | "all")[] = ["all", "owner", "admin", "moderator", "member"];
const PROMOTABLE: CommunityRoleTier[] = ["admin", "moderator", "member"];

export default function MembersSection({
  communityId,
  userId,
  viewerRole,
  initialMembers,
}: {
  communityId: string;
  userId: string;
  viewerRole: CommunityRole;
  initialMembers: CommunityMember[];
}) {
  const { showToast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<CommunityRole | "all">("all");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Role changes are owner-only (community_members_update_role_owner); ban
  // is owner/admin (is_community_admin, same as kick elsewhere in the app).
  const canPromote = viewerRole === "owner";
  const canBan = viewerRole === "owner" || viewerRole === "admin";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return members.filter((m) => {
      const role: CommunityRole = m.isOwner ? "owner" : m.communityRole;
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const matchesQuery = !term || m.fullName.toLowerCase().includes(term) || (m.company ?? "").toLowerCase().includes(term);
      return matchesRole && matchesQuery;
    });
  }, [members, query, roleFilter]);

  async function changeRole(member: CommunityMember, role: CommunityRoleTier) {
    if (!canPromote || member.isOwner) return;
    setBusyId(member.userId);
    try {
      await setMemberRole(createClient(), communityId, member.userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, communityRole: role } : m)));
    } catch (err) {
      showToast("error", "Не вдалося змінити роль.");
      console.error("setMemberRole failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function ban(member: CommunityMember) {
    if (!canBan || member.isOwner) return;
    setMenuFor(null);
    const reason = window.prompt(`Причина блокування ${member.fullName}:`, "");
    if (reason === null) return;
    setBusyId(member.userId);
    try {
      await banMember(createClient(), communityId, member.userId, reason, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      showToast("success", "Учасника заблоковано.");
    } catch (err) {
      showToast("error", "Не вдалося заблокувати учасника.");
      console.error("banMember failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function kick(member: CommunityMember) {
    setMenuFor(null);
    setBusyId(member.userId);
    try {
      await kickMember(createClient(), communityId, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    } catch (err) {
      showToast("error", "Не вдалося видалити учасника.");
      console.error("kickMember failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-2.5">
          <Search size={15} className="shrink-0 text-ink-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук учасників..."
            className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((r) => {
            const on = roleFilter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
                  on
                    ? "border-purple/40 bg-purple/[0.16] text-ink-primary"
                    : "border-border-subtle bg-white/[0.03] text-ink-tertiary hover:text-ink-primary"
                }`}
              >
                {r === "all" ? "Усі" : ROLE_UA[r]}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-16 text-center">
          <Search size={20} className="text-ink-tertiary" />
          <p className="text-[13.5px] text-ink-tertiary">Немає учасників за вашим запитом</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => {
            const hasMenu = (canPromote || canBan) && !m.isOwner;
            return (
              <div
                key={m.userId}
                className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-border-subtle bg-white/[0.028] p-3.5"
              >
                <Avatar
                  src={m.avatarUrl}
                  name={m.fullName}
                  size={42}
                  className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
                />
                <div className="min-w-[150px] flex-1">
                  <p className="text-[14px] font-semibold text-ink-primary">{m.fullName}</p>
                  {m.roleTitle || m.company ? (
                    <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
                      {[m.roleTitle, m.company].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>

                {m.isOwner ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-ink-secondary">
                    <Shield size={12} /> {ROLE_UA.owner}
                  </span>
                ) : canPromote ? (
                  <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border-subtle bg-white/[0.03] p-0.5">
                    {PROMOTABLE.map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={busyId === m.userId}
                        onClick={() => changeRole(m, o)}
                        className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors disabled:opacity-60 ${
                          m.communityRole === o ? "bg-grad-purple-blue text-white" : "text-ink-tertiary hover:text-ink-primary"
                        }`}
                      >
                        {ROLE_UA[o]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="shrink-0 text-[11.5px] font-medium text-ink-tertiary">{ROLE_UA[m.communityRole]}</span>
                )}

                {hasMenu ? (
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setMenuFor(menuFor === m.userId ? null : m.userId)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.03] text-ink-tertiary transition-colors hover:bg-white/[0.08] hover:text-ink-primary"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuFor === m.userId ? (
                      <div className="glass absolute right-0 top-11 z-10 w-48 overflow-hidden rounded-xl border border-border-subtle">
                        {viewerRole === "owner" || m.communityRole !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => kick(m)}
                            className="w-full px-3.5 py-2.5 text-left text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06]"
                          >
                            Видалити зі спільноти
                          </button>
                        ) : null}
                        {canBan ? (
                          <button
                            type="button"
                            onClick={() => ban(m)}
                            className="w-full px-3.5 py-2.5 text-left text-[12.5px] font-medium text-danger transition-colors hover:bg-white/[0.06]"
                          >
                            Заблокувати
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
