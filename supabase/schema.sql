create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9._]{3,24}$'),
  avatar_url text,
  bio text not null default '',
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'friend_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_user();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text not null default '' check (char_length(caption) <= 800),
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  close_friends boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at <= created_at + interval '24 hours')
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table if not exists public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default '❤️' check (char_length(reaction) <= 12),
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  media_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('like', 'comment', 'follow', 'message', 'story', 'community')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists comments_post_created_idx on public.comments(post_id, created_at);
create index if not exists stories_expiry_idx on public.stories(expires_at);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);

create or replace function public.is_conversation_member(target_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = target_conversation and user_id = (select auth.uid())
  );
$$;

create or replace function public.start_direct_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  target_conversation uuid;
begin
  if current_user_id is null or other_user is null or current_user_id = other_user then
    raise exception 'A signed-in user and a different recipient are required';
  end if;
  if not exists (select 1 from public.profiles where id = other_user) then
    raise exception 'Recipient profile not found';
  end if;

  select c.id into target_conversation
  from public.conversations c
  join public.conversation_members mine on mine.conversation_id = c.id and mine.user_id = current_user_id
  join public.conversation_members theirs on theirs.conversation_id = c.id and theirs.user_id = other_user
  where not c.is_group
  limit 1;

  if target_conversation is null then
    insert into public.conversations (created_by, is_group) values (current_user_id, false)
    returning id into target_conversation;
    insert into public.conversation_members (conversation_id, user_id)
    values (target_conversation, current_user_id), (target_conversation, other_user);
  end if;
  return target_conversation;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Profiles are discoverable" on public.profiles;
create policy "Profiles are discoverable" on public.profiles for select using (not is_private or id = (select auth.uid()));
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Posts are visible" on public.posts;
create policy "Posts are visible" on public.posts for select using (
  exists (select 1 from public.profiles p where p.id = posts.user_id and (
    not p.is_private or p.id = (select auth.uid()) or exists (
      select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.id
    )
  ))
);
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts" on public.posts for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts" on public.posts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts" on public.posts for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Likes are visible" on public.post_likes;
create policy "Likes are visible" on public.post_likes for select using (true);
drop policy if exists "Users like as themselves" on public.post_likes;
create policy "Users like as themselves" on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users remove own likes" on public.post_likes;
create policy "Users remove own likes" on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Comments are visible" on public.comments;
create policy "Comments are visible" on public.comments for select using (exists (select 1 from public.posts p where p.id = comments.post_id));
drop policy if exists "Users comment as themselves" on public.comments;
create policy "Users comment as themselves" on public.comments for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users remove own comments" on public.comments;
create policy "Users remove own comments" on public.comments for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Follows are visible" on public.follows;
create policy "Follows are visible" on public.follows for select using (true);
drop policy if exists "Users follow as themselves" on public.follows;
create policy "Users follow as themselves" on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
drop policy if exists "Users unfollow as themselves" on public.follows;
create policy "Users unfollow as themselves" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

drop policy if exists "Unexpired stories are visible" on public.stories;
create policy "Unexpired stories are visible" on public.stories for select using (
  expires_at > now() and (
    user_id = (select auth.uid()) or (
      not close_friends and exists (
        select 1 from public.profiles p where p.id = stories.user_id and (
          not p.is_private or exists (
            select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.following_id = p.id
          )
        )
      )
    )
  )
);
drop policy if exists "Users create own stories" on public.stories;
create policy "Users create own stories" on public.stories for insert to authenticated with check (user_id = (select auth.uid()) and expires_at <= now() + interval '24 hours');
drop policy if exists "Users delete own stories" on public.stories;
create policy "Users delete own stories" on public.stories for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Community visibility follows privacy" on public.communities;
create policy "Community visibility follows privacy" on public.communities for select using (not is_private or owner_id = (select auth.uid()) or exists (select 1 from public.community_members cm where cm.community_id = id and cm.user_id = (select auth.uid())));
drop policy if exists "Users create communities" on public.communities;
create policy "Users create communities" on public.communities for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "Owners update communities" on public.communities;
create policy "Owners update communities" on public.communities for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Community membership is visible" on public.community_members;
create policy "Community membership is visible" on public.community_members for select using (user_id = (select auth.uid()) or exists (select 1 from public.communities c where c.id = community_id and not c.is_private));
drop policy if exists "Users join public communities as themselves" on public.community_members;
create policy "Users join public communities as themselves" on public.community_members for insert to authenticated with check (
  user_id = (select auth.uid()) and role = 'member' and exists (
    select 1 from public.communities c where c.id = community_id and not c.is_private
  )
);
drop policy if exists "Users leave communities" on public.community_members;
create policy "Users leave communities" on public.community_members for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Conversation members can read conversations" on public.conversations;
create policy "Conversation members can read conversations" on public.conversations for select to authenticated using (public.is_conversation_member(id));
drop policy if exists "Users create conversations" on public.conversations;
create policy "Users create conversations" on public.conversations for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "Members can read membership" on public.conversation_members;
create policy "Members can read membership" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists "Users join their own conversations" on public.conversation_members;
create policy "Users join their own conversations" on public.conversation_members for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Members update own read status" on public.conversation_members;
create policy "Members update own read status" on public.conversation_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Conversation members read messages" on public.messages;
create policy "Conversation members read messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists "Conversation members send messages" on public.messages;
create policy "Conversation members send messages" on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));
drop policy if exists "Users delete own messages" on public.messages;
create policy "Users delete own messages" on public.messages for delete to authenticated using (sender_id = (select auth.uid()));

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('posts', 'posts', true, 26214400, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('stories', 'stories', false, 26214400, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public media is readable" on storage.objects;
create policy "Public media is readable" on storage.objects for select using (bucket_id in ('posts', 'avatars'));
drop policy if exists "Owners can sign their story media" on storage.objects;
create policy "Owners can sign their story media" on storage.objects for select to authenticated using (bucket_id = 'stories' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users upload own media" on storage.objects;
create policy "Users upload own media" on storage.objects for insert to authenticated with check (bucket_id in ('posts','stories','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users update own media" on storage.objects;
create policy "Users update own media" on storage.objects for update to authenticated using (bucket_id in ('posts','stories','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id in ('posts','stories','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users delete own media" on storage.objects;
create policy "Users delete own media" on storage.objects for delete to authenticated using (bucket_id in ('posts','stories','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then alter publication supabase_realtime add table public.messages; end if;
end $$;