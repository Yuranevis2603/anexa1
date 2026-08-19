-- Anexa Club schema — snapshot of the live Supabase database.
-- Regenerated to match project "Anexa.club" (ref: oqearxviszstqxxhaptq) as of 2026-08-19.
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
  languages jsonb not null default '[]'
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
-- Sub-communities members can join. No insert/update/delete policy exists yet
-- — rows are managed outside the client API (service role / dashboard).
-- ============================================================================
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  created_at timestamptz not null default now()
);

alter table public.communities enable row level security;

create policy "communities_select_all"
  on public.communities for select
  to authenticated
  using (true);

-- ============================================================================
-- community_members
-- Join table: which members belong to which community.
-- ============================================================================
create table if not exists public.community_members (
  community_id uuid not null references public.communities(id),
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
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

-- ============================================================================
-- events
-- Community events. No insert/update/delete policy exists yet — rows are
-- managed outside the client API (service role / dashboard).
-- ============================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  event_date timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  to authenticated
  using (true);

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
    check (cta_type in ('contact', 'collaborate', 'join', 'learn_more'))
);

create index if not exists idx_activity_user on public.activity_items (user_id, created_at desc);
create index if not exists idx_activity_items_created_at on public.activity_items (created_at desc);
create index if not exists idx_activity_items_post_type on public.activity_items (post_type)
  where post_type is not null;

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

create policy "activity_insert_own"
  on public.activity_items for insert
  to public
  with check (user_id = (select auth.uid()));

create policy "activity_update_own"
  on public.activity_items for update
  to public
  using (user_id = (select auth.uid()));

create policy "activity_delete_own"
  on public.activity_items for delete
  to public
  using (user_id = (select auth.uid()));

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
-- Triggers & functions
-- ============================================================================

-- Auto-create a profile row whenever a new auth user signs up, and mark
-- their invite code as used in the same transaction. Runs as security
-- definer so it works regardless of the caller's RLS/session state (e.g.
-- before email confirmation, when the client has no session yet).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Новий учасник'));

  if new.raw_user_meta_data ? 'invite_code' then
    update public.invite_codes
    set used_by = new.id, used_at = now()
    where code = new.raw_user_meta_data->>'invite_code'
      and used_by is null;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Project-level event trigger (public.rls_auto_enable) automatically runs
-- `alter table ... enable row level security` on every newly created table
-- in the public schema, so RLS is on by default even if a migration forgets it.

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
