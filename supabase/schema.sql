-- Anexa Club schema — snapshot of the live Supabase database.
-- Regenerated to match project "Anexa.club" (ref: oqearxviszstqxxhaptq) as of 2026-09-05 (latest: community_livestream_messages — per-stream chat).
-- This file is a reference snapshot, not a migration — apply changes via
-- `supabase db push` / the SQL editor, then regenerate this file from the live DB.

-- ============================================================================
-- profiles
-- One row per auth.users, public-facing member profile.
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role_title text,       -- e.g. "Співвласник · Lumen Studio"
  company text,
  avatar_url text,
  bio text,
  is_approved boolean not null default false, -- closed beta / invite gating
  is_platform_admin boolean not null default false, -- site-wide admin (approves pending profiles)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  industries text[] not null default '{}',
  links jsonb not null default '{}',
  location text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  username text unique,
  cover_url text,
  membership_tier text not null default 'standard'
    check (membership_tier in ('standard', 'black')),
  business_goals text[] not null default '{}',
  languages jsonb not null default '[]',
  -- Persistent, reusable referral code — assigned once at signup by
  -- handle_new_user(), never regenerated. Distinct from invite_codes,
  -- which stays single-use (closed-beta admission gating).
  referral_code text unique,
  -- Settings → Приватність: when true, OnlinePresenceProvider stops
  -- broadcasting this member's own presence key.
  hide_online_status boolean not null default false,
  -- Settings → danger zone: soft-delete flag set by requestAccountDeletion();
  -- an admin processes the actual removal (see profile.ts for why this
  -- isn't an instant hard delete).
  deletion_requested_at timestamptz,
  -- First-run guided setup after signup (see app/onboarding). Gates the
  -- /dashboard redirect in app/dashboard/layout.tsx; onboarding_step
  -- remembers which screen to resume on if a member closes the tab
  -- mid-flow. Pre-existing profiles were backfilled to completed/8 so
  -- already-active members never see it.
  onboarding_completed boolean not null default false,
  onboarding_step smallint not null default 1
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to public
  using ((select auth.uid()) = id);

-- ============================================================================
-- invite_codes
-- Closed-beta gating for the private community.
-- ============================================================================
create table if not exists public.invite_codes (
  code text primary key,
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invite_codes_created_by on public.invite_codes (created_by);
create index if not exists idx_invite_codes_used_by on public.invite_codes (used_by);

alter table public.invite_codes enable row level security;

create policy "Invite codes are readable by authenticated users"
  on public.invite_codes for select
  to authenticated
  using (true);

-- Anonymous (not-yet-signed-up) visitors must be able to validate an invite
-- code during registration, before they have a session. Only expose unused
-- codes, and only via an exact code match (no way to list them).
create policy "Unused invite codes are readable for registration"
  on public.invite_codes for select
  to anon
  using (used_by is null);

-- Referral system: any member can generate their own invite code (not just
-- hand-seeded ones) to invite people into the club.
create policy "invite_codes_insert_own"
  on public.invite_codes for insert
  to public
  with check (created_by = (select auth.uid()));

-- ============================================================================
-- referral_joins
-- Every successful signup through a member's persistent referral link
-- (profiles.referral_code) or a legacy single-use invite_codes code.
-- Multi-use, unlike invite_codes' single used_by/used_at — a referral link
-- never expires. Written only by handle_new_user() (see Triggers & functions
-- below); referred_id is unique so a member is credited to one referrer.
-- ============================================================================
create table if not exists public.referral_joins (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_joins_referrer_id on public.referral_joins (referrer_id, created_at desc);

alter table public.referral_joins enable row level security;

create policy "referral_joins_select_own"
  on public.referral_joins for select
  to authenticated
  using (referrer_id = (select auth.uid()));

-- ============================================================================
-- experience
-- Work-experience entries shown on a member's profile.
-- ============================================================================
create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  company text not null,
  location text,
  start_date date,
  end_date date,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_experience_user_id on public.experience (user_id);

alter table public.experience enable row level security;

create policy "experience_select_all"
  on public.experience for select
  to authenticated
  using (true);

create policy "experience_insert_own"
  on public.experience for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "experience_update_own"
  on public.experience for update
  to public
  using (user_id = (select auth.uid()));

create policy "experience_delete_own"
  on public.experience for delete
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- projects
-- Portfolio projects shown on a member's profile.
-- ============================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  team_size integer,
  image_url text,
  link_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_user_id on public.projects (user_id);

alter table public.projects enable row level security;

create policy "projects_select_all"
  on public.projects for select
  to authenticated
  using (true);

create policy "projects_insert_own"
  on public.projects for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "projects_update_own"
  on public.projects for update
  to public
  using (user_id = (select auth.uid()));

create policy "projects_delete_own"
  on public.projects for delete
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- communities
-- Sub-communities members can join. Any member can create one — the unique
-- index on created_by caps it at one community per creator, enforced at the
-- database level rather than just in the client.
-- ============================================================================
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  description text,
  category text,
  -- Owner-editable guidelines shown on "Про спільноту" ({title, body}[]).
  rules jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_communities_created_by_unique on public.communities (created_by);

alter table public.communities enable row level security;

create policy "communities_select_all"
  on public.communities for select
  to authenticated
  using (true);

create policy "communities_insert_own"
  on public.communities for insert
  to public
  with check (created_by = (select auth.uid()));

create policy "communities_update_own"
  on public.communities for update
  to public
  using (created_by = (select auth.uid()));

-- ============================================================================
-- community_members
-- Join table: which members belong to which community.
-- ============================================================================
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id),
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  -- Owner identity stays on communities.created_by — this only marks staff
  -- among the rest of the membership. See is_community_owner/admin/staff.
  role text not null default 'member'
    check (role in ('admin', 'moderator', 'member')),
  primary key (community_id, user_id)
);

create index if not exists idx_community_members_user_id on public.community_members (user_id);

alter table public.community_members enable row level security;

create policy "community_members_select_all"
  on public.community_members for select
  to authenticated
  using (true);

create policy "community_members_insert_own"
  on public.community_members for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "community_members_delete_own"
  on public.community_members for delete
  to public
  using (user_id = (select auth.uid()));

create or replace function public.is_community_owner(p_community_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community_id and c.created_by = p_user_id
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_community_admin(p_community_id uuid, p_user_id uuid)
returns boolean as $$
  select public.is_community_owner(p_community_id, p_user_id) or exists (
    select 1 from public.community_members cm
    where cm.community_id = p_community_id and cm.user_id = p_user_id and cm.role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_community_staff(p_community_id uuid, p_user_id uuid)
returns boolean as $$
  select public.is_community_admin(p_community_id, p_user_id) or exists (
    select 1 from public.community_members cm
    where cm.community_id = p_community_id and cm.user_id = p_user_id and cm.role = 'moderator'
  );
$$ language sql stable security definer set search_path = public;

-- Owner-only: grant/revoke Admin or Moderator on any member row.
create policy "community_members_update_role_owner"
  on public.community_members for update
  to public
  using (public.is_community_owner(community_id, (select auth.uid())));

-- Owner or Admin can remove a plain member; only the owner can remove an
-- Admin; the owner's own row (identified via communities.created_by, not
-- this table) can never be removed this way.
create policy "community_members_delete_staff"
  on public.community_members for delete
  to public
  using (
    public.is_community_admin(community_id, (select auth.uid()))
    and user_id <> (select created_by from public.communities c where c.id = community_members.community_id)
    and (role <> 'admin' or public.is_community_owner(community_id, (select auth.uid())))
  );

-- ============================================================================
-- events
-- Community events. Any member can create one (unlike communities, not
-- capped at one per creator — an organizer routinely runs several).
-- ============================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  created_by uuid references public.profiles(id),
  community_id uuid references public.communities(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_community_id on public.events (community_id);

alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  to authenticated
  using (true);

create policy "events_insert_own"
  on public.events for insert
  to public
  with check (created_by = (select auth.uid()));

create policy "events_update_own"
  on public.events for update
  to public
  using (created_by = (select auth.uid()));

create policy "events_delete_own"
  on public.events for delete
  to public
  using (created_by = (select auth.uid()));

-- ============================================================================
-- event_registrations
-- Join table: which members registered for which event.
-- ============================================================================
create table if not exists public.event_registrations (
  event_id uuid not null references public.events(id),
  user_id uuid not null references public.profiles(id),
  status text not null default 'registered'
    check (status in ('registered', 'attended', 'cancelled')),
  primary key (event_id, user_id)
);

create index if not exists idx_event_registrations_user_id on public.event_registrations (user_id);

alter table public.event_registrations enable row level security;

create policy "event_registrations_select_all"
  on public.event_registrations for select
  to authenticated
  using (true);

create policy "event_registrations_insert_own"
  on public.event_registrations for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "event_registrations_update_own"
  on public.event_registrations for update
  to public
  using (user_id = (select auth.uid()));

create policy "event_registrations_delete_own"
  on public.event_registrations for delete
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- community_livestreams
-- "Ефір" tab — live video sessions hosted inside a community, backed by
-- Daily.co (see app/api/daily/rooms/route.ts). Rooms are created public
-- (no per-viewer meeting tokens), so `room_url` alone is enough to join —
-- deliberately simple for a v1; no recording/replay, no scheduling queue.
-- Starting/ending one is restricted to the community's owner or an Admin
-- (not Moderator — hosting is an operational role, not a content-moderation
-- one).
-- ============================================================================
create table if not exists public.community_livestreams (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id),
  host_id uuid not null references public.profiles(id),
  title text not null,
  status text not null default 'live'
    check (status in ('live', 'ended')),
  room_url text,
  room_name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  -- Bumped every ~45s by the hosting browser (LivestreamPanel) while the
  -- stream is live; end_stale_livestreams() below auto-ends anything that
  -- goes quiet for 2+ minutes (host closed the tab without ending it).
  last_heartbeat_at timestamptz not null default now()
);

create index if not exists idx_community_livestreams_community_id on public.community_livestreams (community_id);

alter table public.community_livestreams enable row level security;

create policy "community_livestreams_select_all"
  on public.community_livestreams for select
  to authenticated
  using (true);

-- Owner/admin/moderator ("staff") can start a stream, not just the owner —
-- matches is_community_staff, the same tier community_audit_log/discussion
-- pinning/etc. already use.
create policy "community_livestreams_insert_own_community"
  on public.community_livestreams for insert
  to public
  with check (
    host_id = (select auth.uid())
    and public.is_community_staff(community_id, (select auth.uid()))
  );

-- The host can always update their own stream; staff can also step in (e.g.
-- force-end) even when they're not the one who started it.
create policy "community_livestreams_update_own"
  on public.community_livestreams for update
  to public
  using (
    host_id = (select auth.uid())
    or public.is_community_staff(community_id, (select auth.uid()))
  );

-- Any authenticated member can trigger this (called from getActiveLivestream
-- on every "Ефір" tab load); only rows 2+ minutes past their last heartbeat
-- are touched, so it's a no-op for a genuinely live stream. SECURITY
-- DEFINER because community_livestreams_update_own only lets the host
-- update their own row — a stale stream's host is, by definition, gone.
create or replace function public.end_stale_livestreams(p_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_livestreams
  set status = 'ended', ended_at = now()
  where community_id = p_community_id
    and status = 'live'
    and last_heartbeat_at < now() - interval '2 minutes';
end;
$$;

grant execute on function public.end_stale_livestreams(uuid) to authenticated;

-- ============================================================================
-- community_livestream_messages
-- Per-stream chat for the "Ефір" tab — deliberately separate from
-- discussion_threads/discussion_replies (ephemeral, tied to one livestream
-- row, cascade-deleted with it) and from direct messages.
-- ============================================================================
create table if not exists public.community_livestream_messages (
  id uuid primary key default gen_random_uuid(),
  livestream_id uuid not null references public.community_livestreams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_livestream_messages_livestream_id
  on public.community_livestream_messages (livestream_id, created_at);

alter table public.community_livestream_messages enable row level security;

-- Only members of the stream's own community can read or post — same
-- membership boundary the community's other content already respects.
create policy "community_livestream_messages_select_members"
  on public.community_livestream_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.community_livestreams cl
      join public.community_members cm on cm.community_id = cl.community_id
      where cl.id = livestream_id and cm.user_id = (select auth.uid())
    )
  );

create policy "community_livestream_messages_insert_members"
  on public.community_livestream_messages for insert
  to public
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.community_livestreams cl
      join public.community_members cm on cm.community_id = cl.community_id
      where cl.id = livestream_id and cm.user_id = (select auth.uid())
    )
  );

-- Required for the chat rail's realtime subscription to receive anything —
-- RLS alone doesn't put a table on the wire (same gotcha as notifications/
-- community_livestreams above).
alter publication supabase_realtime add table public.community_livestream_messages;

-- ============================================================================
-- discussion_threads / discussion_replies
-- "Обговорення" tab: real forum-style threads, separate from the "Стрічка"
-- feed posts. reply_count is kept in sync by a trigger, same pattern as
-- activity_items.like_count/comment_count.
-- ============================================================================
create table if not exists public.discussion_threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id),
  user_id uuid not null references public.profiles(id),
  topic text,
  title text not null,
  body text,
  pinned boolean not null default false,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_discussion_threads_community_id on public.discussion_threads (community_id, pinned desc, created_at desc);

alter table public.discussion_threads enable row level security;

create policy "discussion_threads_select_all"
  on public.discussion_threads for select
  to authenticated
  using (true);

-- Starting a thread requires community membership, same rule as posting
-- into the community's feed (activity_insert_own).
create policy "discussion_threads_insert_member"
  on public.discussion_threads for insert
  to public
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = discussion_threads.community_id and cm.user_id = (select auth.uid())
    )
  );

-- Author can edit their own thread; Admin/Moderator can additionally
-- pin/unpin or remove any thread in their community.
create policy "discussion_threads_update"
  on public.discussion_threads for update
  to public
  using (
    user_id = (select auth.uid())
    or public.is_community_staff(community_id, (select auth.uid()))
  );

create policy "discussion_threads_delete"
  on public.discussion_threads for delete
  to public
  using (
    user_id = (select auth.uid())
    or public.is_community_staff(community_id, (select auth.uid()))
  );

create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.discussion_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_discussion_replies_thread_id on public.discussion_replies (thread_id, created_at asc);

alter table public.discussion_replies enable row level security;

create policy "discussion_replies_select_all"
  on public.discussion_replies for select
  to authenticated
  using (true);

create policy "discussion_replies_insert_member"
  on public.discussion_replies for insert
  to public
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.discussion_threads dt
      join public.community_members cm on cm.community_id = dt.community_id
      where dt.id = discussion_replies.thread_id and cm.user_id = (select auth.uid())
    )
  );

create policy "discussion_replies_delete_own"
  on public.discussion_replies for delete
  to public
  using (user_id = (select auth.uid()));

create policy "discussion_replies_delete_staff"
  on public.discussion_replies for delete
  to public
  using (
    exists (
      select 1 from public.discussion_threads dt
      where dt.id = discussion_replies.thread_id
      and public.is_community_staff(dt.community_id, (select auth.uid()))
    )
  );

create or replace function public.sync_discussion_reply_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.discussion_threads set reply_count = reply_count + 1 where id = new.thread_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.discussion_threads set reply_count = greatest(reply_count - 1, 0) where id = old.thread_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_discussion_replies_count on public.discussion_replies;
create trigger trg_discussion_replies_count
  after insert or delete on public.discussion_replies
  for each row execute function public.sync_discussion_reply_count();

-- ============================================================================
-- connections
-- Member-to-member connection requests (LinkedIn-style).
-- ============================================================================
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id),
  addressee_id uuid not null references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint connections_check check (requester_id <> addressee_id),
  constraint connections_requester_id_addressee_id_key unique (requester_id, addressee_id)
);

create index if not exists idx_connections_addressee_id on public.connections (addressee_id);

alter table public.connections enable row level security;

create policy "connections_select_own"
  on public.connections for select
  to public
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy "connections_insert_own"
  on public.connections for insert
  to public
  with check (requester_id = (select auth.uid()));

create policy "connections_update_own"
  on public.connections for update
  to public
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

create policy "connections_delete_own"
  on public.connections for delete
  to public
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- ============================================================================
-- follows
-- One-directional member follow graph.
-- ============================================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id),
  followee_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_check check (follower_id <> followee_id)
);

create index if not exists idx_follows_followee_id on public.follows (followee_id);

alter table public.follows enable row level security;

create policy "follows_select_all"
  on public.follows for select
  to authenticated
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  to public
  with check (follower_id = (select auth.uid()));

create policy "follows_delete_own"
  on public.follows for delete
  to public
  using (follower_id = (select auth.uid()));

-- ============================================================================
-- activity_items
-- Feed posts/articles/comments/media authored by members. The ANEXA Feed
-- (idea/project/partner/specialist/opportunity/result business posts) is
-- layered on top of this table via the post_type/category/budget/
-- work_format/cta_type/image_url columns rather than a separate `posts`
-- table, so likes/comments/saves keep working uniformly across both.
-- ============================================================================
create table if not exists public.activity_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null
    check (type in ('post', 'article', 'comment', 'media')),
  body text not null,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  -- Feed business-post metadata (all optional; null on legacy rows).
  post_type text
    check (post_type in ('idea', 'project', 'partner', 'specialist', 'opportunity', 'result')),
  image_url text,
  category text,
  budget text,
  work_format text
    check (work_format in ('remote', 'office', 'hybrid')),
  cta_type text
    check (cta_type in ('contact', 'collaborate', 'join', 'learn_more')),
  -- Set only for a post made inside a community's "Стрічка"/"Обговорення"
  -- tab (see CreatePostModal's communityId prop). Null = ordinary Feed
  -- post. Community posts are excluded from the global Feed queries
  -- (getFeedPage/getForYouPool in lib/feed.ts) so they only ever show on
  -- their community's own page — the two feeds don't mix.
  community_id uuid references public.communities(id)
);

create index if not exists idx_activity_user on public.activity_items (user_id, created_at desc);
create index if not exists idx_activity_items_created_at on public.activity_items (created_at desc);
create index if not exists idx_activity_items_post_type on public.activity_items (post_type)
  where post_type is not null;
create index if not exists idx_activity_items_community_id on public.activity_items (community_id)
  where community_id is not null;

alter table public.activity_items enable row level security;

-- Visible to the whole authenticated community — matches the select-all
-- pattern used by profiles/projects/experience/communities/events/follows.
-- (Previously gated to "author or accepted connection", which defeated the
-- Feed's purpose of surfacing opportunities to members who don't know each
-- other yet.)
create policy "activity_items_select_all"
  on public.activity_items for select
  to authenticated
  using (true);

-- Posting into a community's feed requires actually being a member of it;
-- ordinary Feed posts (community_id null) are unrestricted as before.
create policy "activity_insert_own"
  on public.activity_items for insert
  to public
  with check (
    user_id = (select auth.uid())
    and (
      community_id is null
      or exists (
        select 1 from public.community_members cm
        where cm.community_id = activity_items.community_id and cm.user_id = (select auth.uid())
      )
    )
  );

create policy "activity_update_own"
  on public.activity_items for update
  to public
  using (user_id = (select auth.uid()));

create policy "activity_delete_own"
  on public.activity_items for delete
  to public
  using (user_id = (select auth.uid()));

-- Admin/Moderator can remove any community post, not just their own.
create policy "activity_delete_staff"
  on public.activity_items for delete
  to public
  using (community_id is not null and public.is_community_staff(community_id, (select auth.uid())));

-- ============================================================================
-- activity_likes
-- One like per (activity_item, user). like_count on activity_items is kept
-- in sync by the trg_activity_likes_count trigger below.
-- ============================================================================
create table if not exists public.activity_likes (
  id uuid primary key default gen_random_uuid(),
  activity_item_id uuid not null references public.activity_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_item_id, user_id)
);

create index if not exists idx_activity_likes_item on public.activity_likes (activity_item_id);
create index if not exists idx_activity_likes_user_id on public.activity_likes (user_id);

alter table public.activity_likes enable row level security;

create policy "activity_likes_select"
  on public.activity_likes for select
  to public
  using (exists (select 1 from public.activity_items ai where ai.id = activity_likes.activity_item_id));

create policy "activity_likes_insert_own"
  on public.activity_likes for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "activity_likes_delete_own"
  on public.activity_likes for delete
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- activity_comments
-- comment_count on activity_items is kept in sync by the
-- trg_activity_comments_count trigger below.
-- ============================================================================
create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_item_id uuid not null references public.activity_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_comments_item on public.activity_comments (activity_item_id);
create index if not exists idx_activity_comments_user_id on public.activity_comments (user_id);

alter table public.activity_comments enable row level security;

create policy "activity_comments_select"
  on public.activity_comments for select
  to public
  using (exists (select 1 from public.activity_items ai where ai.id = activity_comments.activity_item_id));

create policy "activity_comments_insert_own"
  on public.activity_comments for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "activity_comments_update_own"
  on public.activity_comments for update
  to public
  using (user_id = (select auth.uid()));

create policy "activity_comments_delete_own"
  on public.activity_comments for delete
  to public
  using (user_id = (select auth.uid()));

create or replace function public.sync_activity_like_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.activity_items set like_count = like_count + 1 where id = new.activity_item_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.activity_items set like_count = greatest(like_count - 1, 0) where id = old.activity_item_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_activity_likes_count on public.activity_likes;
create trigger trg_activity_likes_count
  after insert or delete on public.activity_likes
  for each row execute function public.sync_activity_like_count();

create or replace function public.sync_activity_comment_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.activity_items set comment_count = comment_count + 1 where id = new.activity_item_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.activity_items set comment_count = greatest(comment_count - 1, 0) where id = old.activity_item_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_activity_comments_count on public.activity_comments;
create trigger trg_activity_comments_count
  after insert or delete on public.activity_comments
  for each row execute function public.sync_activity_comment_count();

-- ============================================================================
-- post_polls / post_poll_votes
-- Optional poll attached to a Feed/community post (activity_items). One
-- poll per post (unique activity_item_id); one vote per (poll, user), but a
-- member can change their vote (update, not just insert).
-- ============================================================================
create table if not exists public.post_polls (
  id uuid primary key default gen_random_uuid(),
  activity_item_id uuid not null references public.activity_items(id) on delete cascade,
  options jsonb not null,
  created_at timestamptz not null default now(),
  constraint post_polls_activity_item_id_key unique (activity_item_id)
);

alter table public.post_polls enable row level security;

create policy "post_polls_select_all"
  on public.post_polls for select
  to authenticated
  using (true);

-- Only attached at post-creation time by the post's own author.
create policy "post_polls_insert_own_post"
  on public.post_polls for insert
  to public
  with check (
    exists (
      select 1 from public.activity_items ai
      where ai.id = post_polls.activity_item_id and ai.user_id = (select auth.uid())
    )
  );

create table if not exists public.post_poll_votes (
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index if not exists idx_post_poll_votes_poll_id on public.post_poll_votes (poll_id);

alter table public.post_poll_votes enable row level security;

create policy "post_poll_votes_select_all"
  on public.post_poll_votes for select
  to authenticated
  using (true);

create policy "post_poll_votes_insert_own"
  on public.post_poll_votes for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "post_poll_votes_update_own"
  on public.post_poll_votes for update
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- saved_posts
-- Per-user bookmarks of activity_items ("Зберегти"). Private to the owner —
-- unlike likes/comments, saves are not shown to other members.
-- ============================================================================
create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  activity_item_id uuid not null references public.activity_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_item_id, user_id)
);

create index if not exists idx_saved_posts_item on public.saved_posts (activity_item_id);
create index if not exists idx_saved_posts_user on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

create policy "saved_posts_select_own"
  on public.saved_posts for select
  to public
  using (user_id = (select auth.uid()));

create policy "saved_posts_insert_own"
  on public.saved_posts for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "saved_posts_delete_own"
  on public.saved_posts for delete
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- conversations
-- Direct-message threads. Membership lives in conversation_participants.
-- ============================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "conversations_insert_any"
  on public.conversations for insert
  to authenticated
  with check (true);

create policy "conversations_select_participant"
  on public.conversations for select
  to public
  using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = conversations.id
        and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- conversation_participants
-- Join table: which members belong to which conversation.
-- ============================================================================
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id),
  user_id uuid not null references public.profiles(id),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists idx_conversation_participants_user_id on public.conversation_participants (user_id);

alter table public.conversation_participants enable row level security;

create policy "participants_select_own_conv"
  on public.conversation_participants for select
  to public
  using (
    exists (
      select 1 from public.conversation_participants me
      where me.conversation_id = conversation_participants.conversation_id
        and me.user_id = (select auth.uid())
    )
  );

-- Lets a participant add themself, or add others to a conversation they're already in.
create policy "participants_insert_self"
  on public.conversation_participants for insert
  to public
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.conversation_participants me
      where me.conversation_id = conversation_participants.conversation_id
        and me.user_id = (select auth.uid())
    )
  );

create policy "participants_update_own"
  on public.conversation_participants for update
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- messages
-- Individual direct messages within a conversation.
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);
create index if not exists idx_messages_sender_id on public.messages (sender_id);

alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages for select
  to public
  using (
    exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert
  to public
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = messages.conversation_id
        and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- conversation_calls
-- 1:1 audio/video calls between two conversation participants, backed by
-- Daily.co PRIVATE rooms + per-participant meeting tokens (see
-- app/api/calls/route.ts and app/api/calls/[callId]/join/route.ts). Unlike
-- community_livestreams' public rooms, room_url alone is NOT enough to
-- join -- every participant needs their own meeting token minted
-- server-side after an authorization check (must be caller_id or
-- callee_id of the row).
-- ============================================================================
create table if not exists public.conversation_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id),
  caller_id uuid not null references public.profiles(id),
  callee_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'active', 'declined', 'cancelled', 'missed', 'ended')),
  room_url text,
  room_name text,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  -- Bumped every ~45s by whichever browser(s) are actively in the call;
  -- end_stale_calls() below auto-misses a 'ringing' row nobody answered
  -- within 60s, and auto-ends an 'active' row that goes quiet for 2+
  -- minutes (tab crash/force-quit mid-call) -- same shape as
  -- community_livestreams.last_heartbeat_at / end_stale_livestreams.
  last_heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (caller_id <> callee_id)
);

create index if not exists idx_conversation_calls_conversation_id on public.conversation_calls (conversation_id);
create index if not exists idx_conversation_calls_callee_active on public.conversation_calls (callee_id) where status in ('ringing', 'active');
create index if not exists idx_conversation_calls_caller_active on public.conversation_calls (caller_id) where status in ('ringing', 'active');

alter table public.conversation_calls enable row level security;

create policy "conversation_calls_select_participant"
  on public.conversation_calls for select
  to public
  using (caller_id = (select auth.uid()) or callee_id = (select auth.uid()));

create policy "conversation_calls_insert_caller"
  on public.conversation_calls for insert
  to public
  with check (
    caller_id = (select auth.uid())
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = conversation_calls.conversation_id
        and p.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.conversation_participants p
      where p.conversation_id = conversation_calls.conversation_id
        and p.user_id = conversation_calls.callee_id
    )
  );

-- Both sides can transition status (answer/decline/hang up) and bump the
-- heartbeat; not column-restricted, same permissiveness as
-- community_livestreams_update_own.
create policy "conversation_calls_update_participant"
  on public.conversation_calls for update
  to public
  using (caller_id = (select auth.uid()) or callee_id = (select auth.uid()));

create or replace function public.end_stale_calls()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_calls
  set status = 'missed', ended_at = now()
  where status = 'ringing'
    and started_at < now() - interval '60 seconds';

  update public.conversation_calls
  set status = 'ended', ended_at = now()
  where status = 'active'
    and last_heartbeat_at < now() - interval '2 minutes';
end;
$$;

grant execute on function public.end_stale_calls() to authenticated;

-- Required for the app-wide incoming-call subscription (CallProvider) to
-- receive anything at all -- RLS alone does not put a table on the
-- Realtime wire (same gotcha as messages/conversation_participants, which
-- are on this publication too even though they weren't added via this
-- file's own migrations).
alter publication supabase_realtime add table public.conversation_calls;

-- ============================================================================
-- levels
-- Reference ladder for the AX -> level display on profiles. Seeded once;
-- no client insert/update policy — managed via migration only.
-- ============================================================================
create table if not exists public.levels (
  level integer primary key,
  title text not null,
  min_ax integer not null unique
);

alter table public.levels enable row level security;

create policy "levels_select_all"
  on public.levels for select
  to authenticated
  using (true);

insert into public.levels (level, title, min_ax) values
  (1, 'Starter', 0),
  (2, 'Explorer', 100),
  (3, 'Builder', 300),
  (4, 'Connector', 600),
  (5, 'Achiever', 1000),
  (6, 'Expert', 1500),
  (7, 'Leader', 2200),
  (8, 'Visionary', 3000)
on conflict (level) do nothing;

-- ============================================================================
-- profile_gamification
-- One row per profile: AX points + aggregated reputation. Written only by
-- the security-definer triggers below (sync_profile_completion_bonus,
-- sync_reviewee_reputation) — never directly by the client, so a member
-- can't self-award AX or fake their rating via the REST/JS API.
-- ============================================================================
create table if not exists public.profile_gamification (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Lifetime AX earned — drives level/title, never decreases (see levels
  -- table + get_profile_public_stats). Keep this untouched by any future
  -- spend feature so paying for something never lowers a member's level.
  ax_points integer not null default 0,
  -- Spendable AX balance — moves in step with ax_points as it's earned, but
  -- is the one a future purchase/subscription feature should debit instead.
  ax_balance integer not null default 0,
  reputation numeric(3,2),
  review_count integer not null default 0,
  profile_completion_bonus_awarded boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profile_gamification enable row level security;

-- ax_points is private — only the owner can read their own row. Reputation/
-- review_count/level are exposed publicly via the get_profile_public_stats()
-- function instead (see Triggers & functions below).
create policy "profile_gamification_select_own"
  on public.profile_gamification for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- ax_events
-- Audit ledger for every AX award: what it was for, how much, and when.
-- Also what the daily-cap check in award_ax() counts against (see Triggers
-- & functions below). Read-only to the client (own rows only) — never
-- written directly, only by triggers.
-- ============================================================================
create table if not exists public.ax_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in (
    'profile_completion', 'post', 'like_received', 'comment_received',
    'connection_accepted', 'follower_received', 'project_added', 'review_received',
    'referral', 'admin_grant', 'admin_deduct'
  )),
  amount integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ax_events_user_source_time on public.ax_events (user_id, source, created_at);

alter table public.ax_events enable row level security;

create policy "ax_events_select_own"
  on public.ax_events for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ============================================================================
-- reviews
-- One rating a member can leave per person they've interacted with.
-- reviewee_id's aggregated reputation/review_count is kept in sync by the
-- sync_reviewee_reputation trigger below.
-- ============================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_no_self_review check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_pair unique (reviewer_id, reviewee_id)
);

create index if not exists idx_reviews_reviewee_id on public.reviews (reviewee_id);

alter table public.reviews enable row level security;

create policy "reviews_select_all"
  on public.reviews for select
  to authenticated
  using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  to public
  with check (reviewer_id = (select auth.uid()));

-- ============================================================================
-- user_blocks
-- One-directional block list. Only the blocker can see their own rows (used
-- to filter their own Feed) — this is not a public graph like follows.
-- ============================================================================
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id),
  blocked_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "user_blocks_select_own"
  on public.user_blocks for select
  to public
  using (blocker_id = (select auth.uid()));

create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  to public
  with check (blocker_id = (select auth.uid()));

create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  to public
  using (blocker_id = (select auth.uid()));

-- ============================================================================
-- user_reports
-- Member-filed reports. Reporter can see their own submissions; platform
-- admins can see and review every report (Адмін → Скарги користувачів).
-- ============================================================================
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_id uuid not null references public.profiles(id),
  reason text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  constraint user_reports_no_self_report check (reporter_id <> reported_id)
);

alter table public.user_reports enable row level security;

create policy "user_reports_select_own"
  on public.user_reports for select
  to public
  using (reporter_id = (select auth.uid()));

create policy "user_reports_select_admin"
  on public.user_reports for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_admin));

create policy "user_reports_insert_own"
  on public.user_reports for insert
  to public
  with check (reporter_id = (select auth.uid()));

create policy "user_reports_update_admin"
  on public.user_reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_admin));

-- ============================================================================
-- Triggers & functions
-- ============================================================================

-- Auto-create a profile row whenever a new auth user signs up, and mark
-- their invite code as used in the same transaction. Runs as security
-- definer so it works regardless of the caller's RLS/session state (e.g.
-- before email confirmation, when the client has no session yet).
--
-- Referral payout lives here rather than its own trigger: the referrer id
-- only exists as the result of this same UPDATE (invite_codes.created_by),
-- so there's nothing separate to trigger off of.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_referrer_id uuid;
  v_code text;
  v_new_referral_code text;
begin
  -- Every member gets their own persistent referral code at signup.
  loop
    v_new_referral_code := substr(md5(random()::text || new.id::text), 1, 8);
    exit when not exists (select 1 from public.profiles where referral_code = v_new_referral_code);
  end loop;

  -- full_name/avatar_url check both the email-signup metadata keys and the
  -- ones Supabase's Google OAuth provider populates ('name'/'avatar_url',
  -- sometimes 'picture') — absent for the other flow, so coalesce is a
  -- harmless no-op there.
  insert into public.profiles (id, full_name, avatar_url, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Новий учасник'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    v_new_referral_code
  );

  if new.raw_user_meta_data ? 'invite_code' then
    v_code := new.raw_user_meta_data->>'invite_code';

    -- Legacy single-use code (hand-seeded admission gate, or an
    -- old-style member-generated one from before referral links existed).
    update public.invite_codes
    set used_by = new.id, used_at = now()
    where code = v_code and used_by is null
    returning created_by into v_referrer_id;

    -- Otherwise it's a member's persistent referral link.
    if v_referrer_id is null then
      select id into v_referrer_id from public.profiles where referral_code = v_code;
    end if;

    if v_referrer_id is not null then
      insert into public.referral_joins (referrer_id, referred_id) values (v_referrer_id, new.id);
      perform public.award_ax(v_referrer_id, 'referral', 100, 10);
      perform public.create_notification(v_referrer_id, new.id, 'referral_joined', 'profile', new.id);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Lets the registration form validate a code (either an unused invite_codes
-- entry or a member's persistent referral_code) without needing anon RLS
-- read access to either table directly.
create or replace function public.validate_invite_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.invite_codes where code = p_code and used_by is null)
    or exists (select 1 from public.profiles where referral_code = p_code);
$$;

-- signInWithOAuth (Google "Продовжити з Google") can't carry arbitrary
-- signup metadata the way signUp's options.data does, so an OAuth signup
-- can't hand handle_new_user() an invite code at insert time. The client
-- validates the code up front via validate_invite_code (same as the email
-- form), then app/auth/callback calls this once the OAuth session exists,
-- to do the same used_by/referral_joins/AX crediting handle_new_user()
-- does for the email path. Idempotent — a repeat call for a user who
-- already has a referral_joins row is a no-op (unique on referred_id).
create or replace function public.consume_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_referrer_id uuid;
  v_joined_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_code is null or trim(p_code) = '' then
    return false;
  end if;

  update public.invite_codes
  set used_by = v_user_id, used_at = now()
  where code = p_code and used_by is null
  returning created_by into v_referrer_id;

  if v_referrer_id is null then
    select id into v_referrer_id from public.profiles where referral_code = p_code and id <> v_user_id;
  end if;

  if v_referrer_id is null then
    return false;
  end if;

  insert into public.referral_joins (referrer_id, referred_id)
  values (v_referrer_id, v_user_id)
  on conflict (referred_id) do nothing
  returning id into v_joined_id;

  if v_joined_id is not null then
    perform public.award_ax(v_referrer_id, 'referral', 100, 10);
    perform public.create_notification(v_referrer_id, v_user_id, 'referral_joined', 'profile', v_user_id);
  end if;

  return true;
end;
$$;

grant execute on function public.consume_invite_code(text) to authenticated;

grant execute on function public.validate_invite_code(text) to anon, authenticated;

-- Mirrors profileCompleteness() in lib/profile.ts: 6 text fields + 4 tag
-- arrays, all non-empty = 100%. Keep the two in sync if either changes.
create or replace function public.is_profile_complete(p public.profiles)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    coalesce(trim(p.full_name), '') <> ''
    and coalesce(trim(p.role_title), '') <> ''
    and coalesce(trim(p.company), '') <> ''
    and coalesce(trim(p.avatar_url), '') <> ''
    and coalesce(trim(p.bio), '') <> ''
    and coalesce(trim(p.location), '') <> ''
    and coalesce(array_length(p.skills, 1), 0) > 0
    and coalesce(array_length(p.business_goals, 1), 0) > 0
    and coalesce(array_length(p.interests, 1), 0) > 0
    and coalesce(array_length(p.industries, 1), 0) > 0;
$$;

-- One-time +100 AX the moment a profile first reaches 100% completeness.
-- The upsert's WHERE guard makes this idempotent regardless of how many
-- times the row is later saved (or toggles incomplete/complete again).
-- EXECUTE is revoked from anon/authenticated below — it's meant to run
-- only as a trigger, not to be called directly via /rest/v1/rpc.
create or replace function public.sync_profile_completion_bonus()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_profile_complete(new) then
    insert into public.profile_gamification (user_id, ax_points, ax_balance, profile_completion_bonus_awarded)
    values (new.id, 100, 100, true)
    on conflict (user_id) do update
      set ax_points = public.profile_gamification.ax_points + 100,
          ax_balance = public.profile_gamification.ax_balance + 100,
          profile_completion_bonus_awarded = true,
          updated_at = now()
      where not public.profile_gamification.profile_completion_bonus_awarded;

    if found then
      insert into public.ax_events (user_id, source, amount) values (new.id, 'profile_completion', 100);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_completion_bonus on public.profiles;
create trigger trg_sync_profile_completion_bonus
  after insert or update on public.profiles
  for each row execute function public.sync_profile_completion_bonus();

revoke execute on function public.sync_profile_completion_bonus() from public, anon, authenticated;

-- Recomputes the reviewee's average rating + count from public.reviews.
-- Reviews have no edit/delete UI today, so AFTER INSERT is enough; the
-- recompute (vs. incremental average) keeps this correct if that changes.
create or replace function public.sync_reviewee_reputation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_avg numeric(3,2);
  v_count integer;
begin
  select round(avg(rating)::numeric, 2), count(*)
    into v_avg, v_count
    from public.reviews
    where reviewee_id = new.reviewee_id;

  insert into public.profile_gamification (user_id, reputation, review_count)
  values (new.reviewee_id, v_avg, v_count)
  on conflict (user_id) do update
    set reputation = v_avg,
        review_count = v_count,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_reviewee_reputation on public.reviews;
create trigger trg_sync_reviewee_reputation
  after insert on public.reviews
  for each row execute function public.sync_reviewee_reputation();

revoke execute on function public.sync_reviewee_reputation() from public, anon, authenticated;

-- Narrow, deliberately-public read of profile_gamification for members other
-- than the row's owner (whose select policy above blocks them otherwise):
-- reputation/review_count/derived level+title, plus ax_points/ax_balance
-- themselves when (and only when) the caller IS p_user_id — one round trip covers both the
-- public stats and the owner's own private balance, instead of a second,
-- RLS-gated query against profile_gamification directly.
-- A SECURITY DEFINER view would trip Supabase's linter at ERROR level for
-- the same RLS-bypass pattern; a function is the safer, more auditable shape
-- and EXECUTE is deliberately left granted here (unlike the trigger
-- functions above) since this one is meant to be called directly.
create or replace function public.get_profile_public_stats(p_user_id uuid)
returns table (reputation numeric, review_count integer, level integer, level_title text, ax_points integer, ax_balance integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    pg.reputation,
    pg.review_count,
    coalesce(
      (select l.level from public.levels l where l.min_ax <= pg.ax_points order by l.min_ax desc limit 1),
      1
    ) as level,
    coalesce(
      (select l.title from public.levels l where l.min_ax <= pg.ax_points order by l.min_ax desc limit 1),
      'Starter'
    ) as level_title,
    case when p_user_id = (select auth.uid()) then pg.ax_points else null end as ax_points,
    case when p_user_id = (select auth.uid()) then pg.ax_balance else null end as ax_balance
  from public.profile_gamification pg
  where pg.user_id = p_user_id;
$$;

grant execute on function public.get_profile_public_stats(uuid) to authenticated;

-- One-shot "how does the viewer relate to this profile" lookup, replacing 4
-- separate client queries (isFollowing, isUserBlocked, getMyReviewOf,
-- getConnectionState). SECURITY INVOKER (the default) is correct here —
-- every underlying table's own RLS already scopes rows to p_viewer_id when
-- it equals auth.uid() (the only legitimate caller), so this needs no
-- elevated privileges at all.
create or replace function public.get_viewer_relation(p_viewer_id uuid, p_target_id uuid)
returns table (
  following boolean,
  blocked boolean,
  reviewed boolean,
  connection_status text,
  connection_id uuid
)
language sql
stable
set search_path = public
as $$
  select
    exists (
      select 1 from public.follows f
      where f.follower_id = p_viewer_id and f.followee_id = p_target_id
    ) as following,
    exists (
      select 1 from public.user_blocks b
      where b.blocker_id = p_viewer_id and b.blocked_id = p_target_id
    ) as blocked,
    exists (
      select 1 from public.reviews r
      where r.reviewer_id = p_viewer_id and r.reviewee_id = p_target_id
    ) as reviewed,
    coalesce(
      (select 'connected' from public.connections c
        where c.status = 'accepted'
          and ((c.requester_id = p_viewer_id and c.addressee_id = p_target_id)
            or (c.requester_id = p_target_id and c.addressee_id = p_viewer_id))
        limit 1),
      (select 'pending_sent' from public.connections c
        where c.status = 'pending' and c.requester_id = p_viewer_id and c.addressee_id = p_target_id
        limit 1),
      (select 'pending_received' from public.connections c
        where c.status = 'pending' and c.requester_id = p_target_id and c.addressee_id = p_viewer_id
        limit 1),
      'none'
    ) as connection_status,
    (
      select c.id from public.connections c
      where c.status = 'pending' and c.requester_id = p_target_id and c.addressee_id = p_viewer_id
      limit 1
    ) as connection_id;
$$;

grant execute on function public.get_viewer_relation(uuid, uuid) to authenticated;

-- Friends list ("Друзі" page) with a mutual-friends count per friend.
-- SECURITY DEFINER is required here (unlike get_viewer_relation above):
-- computing "mutual friends" needs to read each friend's *other* accepted
-- connections, which is exactly what connections' own RLS hides from
-- everyone but the two parties on that row. The p_user_id = auth.uid()
-- check keeps it from being used to probe a stranger's friend graph.
create or replace function public.get_friends_with_mutual_count(p_user_id uuid)
returns table (
  connection_id uuid,
  friend_id uuid,
  full_name text,
  avatar_url text,
  role_title text,
  company text,
  skills text[],
  interests text[],
  industries text[],
  mutual_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with my_friends as (
    select
      c.id as connection_id,
      case when c.requester_id = p_user_id then c.addressee_id else c.requester_id end as friend_id
    from public.connections c
    where c.status = 'accepted'
      and p_user_id = (select auth.uid())
      and (c.requester_id = p_user_id or c.addressee_id = p_user_id)
  )
  select
    mf.connection_id,
    mf.friend_id,
    p.full_name,
    p.avatar_url,
    p.role_title,
    p.company,
    p.skills,
    p.interests,
    p.industries,
    (
      select count(*) from public.connections c2
      where c2.status = 'accepted'
        and c2.requester_id <> p_user_id and c2.addressee_id <> p_user_id
        and (
          (c2.requester_id = mf.friend_id and c2.addressee_id in (select friend_id from my_friends))
          or (c2.addressee_id = mf.friend_id and c2.requester_id in (select friend_id from my_friends))
        )
    ) as mutual_count
  from my_friends mf
  join public.profiles p on p.id = mf.friend_id
  order by p.full_name;
$$;

grant execute on function public.get_friends_with_mutual_count(uuid) to authenticated;

-- ============================================================================
-- notifications
-- One row per event a member should see in the notification center (bell +
-- /dashboard/notifications). Written only by security-definer trigger
-- functions below — there is no insert/delete policy, so the client can
-- never forge or remove a notification, only read and mark its own read.
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  type text not null check (type in (
    'like', 'comment', 'follow', 'connection_request', 'connection_accepted', 'message', 'review',
    'referral_joined', 'profile_approved', 'event_registration', 'event_reminder', 'admin_broadcast',
    'admin_ax_grant', 'admin_ax_deduct', 'community_live'
  )),
  entity_type text,
  entity_id uuid,
  -- Set only for 'admin_broadcast' (see admin_broadcast_notification below)
  -- and 'community_live' (see notify_community_live below, which carries
  -- the community name/stream title so describeNotification() doesn't need
  -- an extra round trip) — every other type keeps rendering fixed per-type
  -- text client-side, so these stay null for them.
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to public
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  to public
  using (user_id = (select auth.uid()));

-- ============================================================================
-- notification_preferences
-- One row per member, disabled_types lists notification `type` values they
-- opted out of via Settings. Missing row / empty array = everything enabled.
-- Checked inside create_notification() so every existing trigger funnels
-- through the same guard without needing its own change.
-- ============================================================================
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  disabled_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own"
  on public.notification_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  to public
  using (user_id = (select auth.uid()));

-- Shared writer for every notification-producing trigger below. Never
-- notifies someone about their own action (e.g. liking your own post), and
-- never inserts a type the recipient disabled in notification_preferences.
create or replace function public.create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_actor_id is not null and p_actor_id = p_user_id then
    return;
  end if;

  if exists (
    select 1 from public.notification_preferences np
    where np.user_id = p_user_id and p_type = any(np.disabled_types)
  ) then
    return;
  end if;

  insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
  values (p_user_id, p_actor_id, p_type, p_entity_type, p_entity_id);
end;
$$;

revoke execute on function public.create_notification(uuid, uuid, text, text, uuid) from public, anon, authenticated;

-- Closed-beta profile approval, gated on profiles.is_platform_admin. profiles
-- itself has no admin-only update policy, so this SECURITY DEFINER function
-- is the only way is_approved ever flips true after signup. Also logs to
-- admin_audit_log (see Admin panel section near the end of this file).
create or replace function public.approve_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = (select auth.uid()) and is_platform_admin
  ) then
    raise exception 'Not authorized';
  end if;

  update public.profiles set is_approved = true, updated_at = now()
  where id = p_user_id and is_approved = false;

  if found then
    perform public.create_notification(p_user_id, null, 'profile_approved', 'profile', p_user_id);
    perform public.log_admin_action((select auth.uid()), 'approve_profile', 'profile', p_user_id, null);
  end if;
end;
$$;

grant execute on function public.approve_profile(uuid) to authenticated;

-- Incoming "Познайомитися" request — the accepted side is already covered by
-- award_connection_ax's notification below, this covers the initial ask.
create or replace function public.notify_connection_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.create_notification(new.addressee_id, new.requester_id, 'connection_request', 'connection', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_connection_request on public.connections;
create trigger trg_notify_connection_request
  after insert on public.connections
  for each row execute function public.notify_connection_request();

revoke execute on function public.notify_connection_request() from public, anon, authenticated;

-- New chat message — notifies every other participant in the conversation.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_participant record;
begin
  for v_participant in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform public.create_notification(v_participant.user_id, new.sender_id, 'message', 'conversation', new.conversation_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

revoke execute on function public.notify_new_message() from public, anon, authenticated;

-- Immediate confirmation the moment someone registers for an event.
create or replace function public.notify_event_registration()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'registered' then
    perform public.create_notification(new.user_id, null, 'event_registration', 'event', new.event_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_event_registration on public.event_registrations;
create trigger trg_notify_event_registration
  after insert on public.event_registrations
  for each row execute function public.notify_event_registration();

revoke execute on function public.notify_event_registration() from public, anon, authenticated;

-- Notifies every other community member the moment a stream goes live —
-- actor_id is the host (their name/avatar render normally, unlike the
-- admin_* branded types), title/body carry the community name and stream
-- title so describeNotification() doesn't need an extra round trip.
create or replace function public.notify_community_live()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_community_name text;
  v_member record;
begin
  if new.status <> 'live' then
    return new;
  end if;

  select name into v_community_name from public.communities where id = new.community_id;

  for v_member in
    select user_id from public.community_members
    where community_id = new.community_id and user_id <> new.host_id
  loop
    insert into public.notifications (user_id, actor_id, type, entity_type, entity_id, title, body)
    select v_member.user_id, new.host_id, 'community_live', 'community', new.community_id, v_community_name, new.title
    where not exists (
      select 1 from public.notification_preferences np
      where np.user_id = v_member.user_id and 'community_live' = any(np.disabled_types)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_community_live on public.community_livestreams;
create trigger trg_notify_community_live
  after insert on public.community_livestreams
  for each row execute function public.notify_community_live();

revoke execute on function public.notify_community_live() from public, anon, authenticated;

-- Run every 15 minutes by pg_cron (job "send_event_reminders", scheduled
-- below). Notifies every member registered for an event starting in the
-- next 2 hours, skipping anyone who already got that event's reminder —
-- idempotent across runs since the job interval is shorter than the window.
create or replace function public.send_event_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type, entity_type, entity_id)
  select er.user_id, null, 'event_reminder', 'event', e.id
  from public.event_registrations er
  join public.events e on e.id = er.event_id
  where er.status = 'registered'
    and e.status = 'published'
    and e.event_date between now() and now() + interval '2 hours'
    and not exists (
      select 1 from public.notifications n
      where n.user_id = er.user_id and n.type = 'event_reminder' and n.entity_id = e.id
    );
end;
$$;

revoke execute on function public.send_event_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'send_event_reminders',
  '*/15 * * * *',
  $$select public.send_event_reminders();$$
);

-- Required for the bell's live unread-count subscription to receive
-- anything at all — RLS alone doesn't put a table on the Realtime wire,
-- it still has to be added to this publication (same gotcha hit earlier
-- with messages/conversation_participants).
alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- AX earning sources
-- Every award goes through award_ax(), which logs to ax_events and enforces
-- a rolling-24h cap per (user, source) so none of these can be farmed.
-- ============================================================================
create or replace function public.award_ax(
  p_user_id uuid,
  p_source text,
  p_amount integer,
  p_daily_cap integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_today_count integer;
begin
  select count(*) into v_today_count
  from public.ax_events
  where user_id = p_user_id
    and source = p_source
    and created_at >= now() - interval '1 day';

  if v_today_count >= p_daily_cap then
    return;
  end if;

  insert into public.ax_events (user_id, source, amount) values (p_user_id, p_source, p_amount);

  insert into public.profile_gamification (user_id, ax_points, ax_balance)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id) do update
    set ax_points = public.profile_gamification.ax_points + p_amount,
        ax_balance = public.profile_gamification.ax_balance + p_amount,
        updated_at = now();
end;
$$;

revoke execute on function public.award_ax(uuid, text, integer, integer) from public, anon, authenticated;

-- Post published — +5 AX, max 3/day (15 AX/day).
create or replace function public.award_post_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_ax(new.user_id, 'post', 5, 3);
  return new;
end;
$$;

drop trigger if exists trg_award_post_ax on public.activity_items;
create trigger trg_award_post_ax
  after insert on public.activity_items
  for each row execute function public.award_post_ax();

revoke execute on function public.award_post_ax() from public, anon, authenticated;

-- Like received on your post — +1 AX, max 20/day. Self-likes don't count.
create or replace function public.award_like_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  select user_id into v_post_owner from public.activity_items where id = new.activity_item_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    perform public.award_ax(v_post_owner, 'like_received', 1, 20);
    perform public.create_notification(v_post_owner, new.user_id, 'like', 'activity_item', new.activity_item_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_like_ax on public.activity_likes;
create trigger trg_award_like_ax
  after insert on public.activity_likes
  for each row execute function public.award_like_ax();

revoke execute on function public.award_like_ax() from public, anon, authenticated;

-- Comment received on your post — +2 AX, max 10/day. Self-comments don't count.
create or replace function public.award_comment_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  select user_id into v_post_owner from public.activity_items where id = new.activity_item_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    perform public.award_ax(v_post_owner, 'comment_received', 2, 10);
    perform public.create_notification(v_post_owner, new.user_id, 'comment', 'activity_item', new.activity_item_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_comment_ax on public.activity_comments;
create trigger trg_award_comment_ax
  after insert on public.activity_comments
  for each row execute function public.award_comment_ax();

revoke execute on function public.award_comment_ax() from public, anon, authenticated;

-- Connection request accepted — +10 AX to both sides, max 5/day each.
-- Nothing in the app sets connections.status to 'accepted' yet (only the
-- "Познайомитися" request itself is wired up) — ready for whenever an
-- accept flow ships, harmless (never fires) until then.
create or replace function public.award_connection_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.award_ax(new.requester_id, 'connection_accepted', 10, 5);
    perform public.award_ax(new.addressee_id, 'connection_accepted', 10, 5);
    perform public.create_notification(new.requester_id, new.addressee_id, 'connection_accepted', 'connection', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_award_connection_ax on public.connections;
create trigger trg_award_connection_ax
  after update on public.connections
  for each row execute function public.award_connection_ax();

revoke execute on function public.award_connection_ax() from public, anon, authenticated;

-- New follower — +1 AX, max 15/day.
create or replace function public.award_follow_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_ax(new.followee_id, 'follower_received', 1, 15);
  perform public.create_notification(new.followee_id, new.follower_id, 'follow', 'profile', new.follower_id);
  return new;
end;
$$;

drop trigger if exists trg_award_follow_ax on public.follows;
create trigger trg_award_follow_ax
  after insert on public.follows
  for each row execute function public.award_follow_ax();

revoke execute on function public.award_follow_ax() from public, anon, authenticated;

-- Project added to portfolio — +15 AX, max 2/day.
create or replace function public.award_project_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_ax(new.user_id, 'project_added', 15, 2);
  return new;
end;
$$;

drop trigger if exists trg_award_project_ax on public.projects;
create trigger trg_award_project_ax
  after insert on public.projects
  for each row execute function public.award_project_ax();

revoke execute on function public.award_project_ax() from public, anon, authenticated;

-- Review received — +20 AX, max 5/day (on top of the existing unique
-- (reviewer_id, reviewee_id) constraint, which already stops any single
-- pair from farming this repeatedly).
create or replace function public.award_review_ax()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.award_ax(new.reviewee_id, 'review_received', 20, 5);
  perform public.create_notification(new.reviewee_id, new.reviewer_id, 'review', 'review', new.id);
  return new;
end;
$$;

drop trigger if exists trg_award_review_ax on public.reviews;
create trigger trg_award_review_ax
  after insert on public.reviews
  for each row execute function public.award_review_ax();

revoke execute on function public.award_review_ax() from public, anon, authenticated;

-- Project-level event trigger (public.rls_auto_enable) automatically runs
-- `alter table ... enable row level security` on every newly created table
-- in the public schema, so RLS is on by default even if a migration forgets it.

-- ============================================================================
-- Community admin — access mode, invite links, join requests, bans, audit
-- log. Builds on the existing is_community_owner/is_community_admin/
-- is_community_staff helpers and community_members.role rather than a
-- separate model.
-- ============================================================================
alter table public.communities
  add column if not exists access text not null default 'public'
    check (access in ('public', 'request', 'private')),
  add column if not exists invite_code text unique default substr(md5(random()::text), 1, 6),
  add column if not exists settings jsonb not null default
    '{"approve":false,"moderatePosts":false,"memberEvents":true,"digest":true}'::jsonb,
  add column if not exists archived_at timestamptz;

create policy "communities_update_admins"
  on public.communities for update
  to authenticated
  using (public.is_community_admin(id, (select auth.uid())));

create policy "communities_delete_owner"
  on public.communities for delete
  to authenticated
  using (created_by = (select auth.uid()));

create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (community_id, user_id)
);

create index if not exists idx_community_join_requests_community_id on public.community_join_requests (community_id);

alter table public.community_join_requests enable row level security;

create policy "community_join_requests_select"
  on public.community_join_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_community_staff(community_id, (select auth.uid())));

create policy "community_join_requests_insert_own"
  on public.community_join_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "community_join_requests_delete_staff"
  on public.community_join_requests for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_community_staff(community_id, (select auth.uid())));

create table if not exists public.community_bans (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  banned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.community_bans enable row level security;

create policy "community_bans_select_admins"
  on public.community_bans for select
  to authenticated
  using (public.is_community_admin(community_id, (select auth.uid())));

create policy "community_bans_manage_admins"
  on public.community_bans for all
  to authenticated
  using (public.is_community_admin(community_id, (select auth.uid())))
  with check (public.is_community_admin(community_id, (select auth.uid())));

create table if not exists public.community_audit_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_audit_log_community_id on public.community_audit_log (community_id);

alter table public.community_audit_log enable row level security;

create policy "community_audit_log_select_admins"
  on public.community_audit_log for select
  to authenticated
  using (public.is_community_admin(community_id, (select auth.uid())));

create policy "community_audit_log_insert_staff"
  on public.community_audit_log for insert
  to authenticated
  with check (actor_id = (select auth.uid()) and public.is_community_staff(community_id, (select auth.uid())));

-- ============================================================================
-- Storage buckets
-- Both buckets are public-read; writes are restricted to the caller's own
-- `{auth.uid()}/...` folder via storage.foldername(name)[1].
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Anyone can view avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Anyone can view post images"
  on storage.objects for select
  to public
  using (bucket_id = 'post-images');

create policy "Users can upload their own post images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy "Users can delete their own post images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (auth.uid())::text);

-- ============================================================================
-- Admin panel
-- Everything the /admin section needs beyond what already existed
-- (approve_profile, getOpenReports/markReportReviewed, select-all reads of
-- profiles/communities/events/community_livestreams): post moderation,
-- platform-wide AX stats, level editing, and a broadcast notification tool
-- — plus an audit log every one of these writes to.
-- ============================================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_platform_admin));

create or replace function public.log_admin_action(
  p_admin_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, detail)
  values (p_admin_id, p_action, p_target_type, p_target_id, p_detail);
end;
$$;

revoke execute on function public.log_admin_action(uuid, text, text, uuid, text) from public, anon, authenticated;

-- Platform-admin post moderation — regular delete RLS is owner-only, or
-- community staff for community posts only.
create or replace function public.admin_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
  v_body text;
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  select left(body, 120) into v_body from public.activity_items where id = p_post_id;

  delete from public.activity_items where id = p_post_id;

  if found then
    perform public.log_admin_action(v_admin, 'delete_post', 'activity_item', p_post_id, v_body);
  end if;
end;
$$;

grant execute on function public.admin_delete_post(uuid) to authenticated;

-- Sends one notification to every member (skips whoever opted out of the
-- 'admin_broadcast' type via notification_preferences, same mechanism every
-- other type already respects). actor_id is null, not the sending admin's
-- own profile — this is meant to read as an official ANEXA message, not a
-- personal one (the notification list falls back to a generic type icon
-- instead of the admin's real name/avatar). Who actually sent it stays
-- fully traceable via admin_audit_log below.
create or replace function public.admin_broadcast_notification(p_title text, p_body text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
  v_count integer := 0;
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Title is required';
  end if;

  insert into public.notifications (user_id, actor_id, type, title, body)
  select p.id, null, 'admin_broadcast', p_title, p_body
  from public.profiles p
  where p.id <> v_admin
    and not exists (
      select 1 from public.notification_preferences np
      where np.user_id = p.id and 'admin_broadcast' = any(np.disabled_types)
    );

  get diagnostics v_count = row_count;

  perform public.log_admin_action(v_admin, 'broadcast_notification', 'notification', null, p_title || ' (' || v_count || ' отримувачів)');

  return v_count;
end;
$$;

grant execute on function public.admin_broadcast_notification(text, text) to authenticated;

-- Circulation totals + top earners. profile_gamification is select-own only
-- via RLS, so this is the only way an admin sees the aggregate picture.
create or replace function public.admin_get_ax_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
  v_result jsonb;
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'totalAxEarned', coalesce(sum(pg.ax_points), 0),
    'totalAxBalance', coalesce(sum(pg.ax_balance), 0),
    'topEarners', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'fullName', p.full_name, 'axPoints', pg2.ax_points) order by pg2.ax_points desc), '[]'::jsonb)
      from (
        select user_id, ax_points from public.profile_gamification order by ax_points desc limit 10
      ) pg2
      join public.profiles p on p.id = pg2.user_id
    )
  )
  into v_result
  from public.profile_gamification pg;

  return v_result;
end;
$$;

grant execute on function public.admin_get_ax_stats() to authenticated;

-- Edit an existing level's title/threshold, or add a new one. levels has no
-- admin-write RLS policy (select-all only), so this SECURITY DEFINER
-- function is the only way to change it.
create or replace function public.admin_upsert_level(p_level integer, p_title text, p_min_ax integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  insert into public.levels (level, title, min_ax)
  values (p_level, p_title, p_min_ax)
  on conflict (level) do update set title = excluded.title, min_ax = excluded.min_ax;

  perform public.log_admin_action(v_admin, 'update_level', 'level', null, 'Level ' || p_level || ': ' || p_title || ' (' || p_min_ax || '+ AX)');
end;
$$;

grant execute on function public.admin_upsert_level(integer, text, integer) to authenticated;

-- Manual AX grant for one member, capped at 1000 per call so an admin
-- can't accidentally (or maliciously, if the account is compromised) mint
-- unbounded AX in one shot. Logs to ax_events (source 'admin_grant') same
-- as every other AX award, plus admin_audit_log. Also notifies the
-- recipient (actor_id null — same branded-not-personal treatment as
-- admin_broadcast_notification above) so a grant doesn't silently show up
-- only as a balance change.
create or replace function public.admin_grant_ax(p_user_id uuid, p_amount integer, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000 then
    raise exception 'Amount must be between 1 and 1000 AX';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.ax_events (user_id, source, amount) values (p_user_id, 'admin_grant', p_amount);

  insert into public.profile_gamification (user_id, ax_points, ax_balance)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id) do update
    set ax_points = public.profile_gamification.ax_points + p_amount,
        ax_balance = public.profile_gamification.ax_balance + p_amount,
        updated_at = now();

  insert into public.notifications (user_id, actor_id, type, title, body)
  select p_user_id, null, 'admin_ax_grant', 'Нараховано AX',
    'Команда ANEXA нарахувала вам ' || p_amount || ' AX' ||
    (case when coalesce(trim(p_note), '') <> '' then ' — ' || p_note else '' end)
  where not exists (
    select 1 from public.notification_preferences np
    where np.user_id = p_user_id and 'admin_ax_grant' = any(np.disabled_types)
  );

  perform public.log_admin_action(
    v_admin, 'grant_ax', 'profile', p_user_id,
    p_amount::text || ' AX' || (case when coalesce(trim(p_note), '') <> '' then ' — ' || p_note else '' end)
  );
end;
$$;

grant execute on function public.admin_grant_ax(uuid, integer, text) to authenticated;

-- Manual AX deduction for one member, symmetric to admin_grant_ax — capped
-- at 1000 per call, floors at 0 so it can never send a member negative.
-- Also notifies the recipient, same branded (actor_id null) treatment as
-- admin_ax_grant above.
create or replace function public.admin_deduct_ax(p_user_id uuid, p_amount integer, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := (select auth.uid());
begin
  if not exists (select 1 from public.profiles where id = v_admin and is_platform_admin) then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1000 then
    raise exception 'Amount must be between 1 and 1000 AX';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.ax_events (user_id, source, amount) values (p_user_id, 'admin_deduct', -p_amount);

  insert into public.profile_gamification (user_id, ax_points, ax_balance)
  values (p_user_id, 0, 0)
  on conflict (user_id) do update
    set ax_points = greatest(0, public.profile_gamification.ax_points - p_amount),
        ax_balance = greatest(0, public.profile_gamification.ax_balance - p_amount),
        updated_at = now();

  insert into public.notifications (user_id, actor_id, type, title, body)
  select p_user_id, null, 'admin_ax_deduct', 'Списано AX',
    'Команда ANEXA списала вам ' || p_amount || ' AX' ||
    (case when coalesce(trim(p_note), '') <> '' then ' — ' || p_note else '' end)
  where not exists (
    select 1 from public.notification_preferences np
    where np.user_id = p_user_id and 'admin_ax_deduct' = any(np.disabled_types)
  );

  perform public.log_admin_action(
    v_admin, 'deduct_ax', 'profile', p_user_id,
    p_amount::text || ' AX' || (case when coalesce(trim(p_note), '') <> '' then ' — ' || p_note else '' end)
  );
end;
$$;

grant execute on function public.admin_deduct_ax(uuid, integer, text) to authenticated;

-- Required for CommunityDetailView's "Ефір" tab / feed banner to update for
-- everyone in realtime when someone else starts or ends a stream — RLS
-- alone doesn't put a table on the Realtime wire (same gotcha as
-- notifications/messages above).
alter publication supabase_realtime add table public.community_livestreams;
