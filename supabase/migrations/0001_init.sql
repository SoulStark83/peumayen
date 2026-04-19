-- =============================================================================
-- Peumayen — Migración inicial (schema public)
-- =============================================================================

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector"   with schema extensions;


-- =============================================================================
-- Función auxiliar: updated_at automático
-- =============================================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- Tablas
-- =============================================================================

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  avatar_url text,
  birthdate date,
  role text not null check (role in ('admin', 'member')),
  member_type text not null check (member_type in ('adult', 'teen', 'child')),
  -- Régimen de presencia por defecto. Ej:
  -- { "mon":"away|home|uncertain", ..., "vacations":"home", "school_holidays":"home" }
  presence_pattern jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_members_set_updated_at
  before update on public.household_members
  for each row execute function public.tg_set_updated_at();


-- =============================================================================
-- Funciones de permisos (SECURITY DEFINER para evitar recursión con RLS)
-- =============================================================================
create or replace function public.is_member(hh uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh and user_id = auth.uid()
  );
$$;

create or replace function public.is_admin(hh uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hh and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_member_id(hh uuid)
returns uuid
language sql
security definer
stable
set search_path = public, extensions
as $$
  select id from public.household_members
  where household_id = hh and user_id = auth.uid()
  limit 1;
$$;

-- Bootstrap: crear hogar + añadirse como admin en una sola operación.
create or replace function public.create_household(hh_name text, admin_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_hh_id uuid;
begin
  if auth.uid() is null then
    raise exception 'no authenticated user';
  end if;

  insert into public.households (name) values (hh_name) returning id into new_hh_id;

  insert into public.household_members (
    household_id, user_id, display_name, role, member_type
  ) values (
    new_hh_id, auth.uid(), admin_display_name, 'admin', 'adult'
  );

  return new_hh_id;
end;
$$;


create table public.projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  emoji text,
  color text,
  scope text not null check (scope in ('family', 'couple', 'personal')),
  owner_id uuid references public.household_members(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.tg_set_updated_at();


-- Tabla polimórfica central
create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  type text not null check (type in (
    'task', 'event', 'shopping', 'pantry', 'document', 'transaction',
    'note', 'walk', 'weight', 'vet_visit', 'menu', 'recipe',
    'subscription', 'vehicle_entry'
  )),
  scope text not null check (scope in ('family', 'couple', 'personal')),
  title text not null,
  description text,
  data jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  recurrence jsonb,
  created_by uuid references public.household_members(id) on delete set null,
  assigned_to uuid references public.household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.tg_set_updated_at();


create table public.presence (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id) on delete cascade,
  date date not null,
  status text not null check (status in ('home', 'away', 'uncertain')),
  notes text,
  updated_by uuid references public.household_members(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (member_id, date)
);

create trigger presence_set_updated_at
  before update on public.presence
  for each row execute function public.tg_set_updated_at();


create table public.messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sender_id uuid not null references public.household_members(id) on delete cascade,
  body text not null,
  reply_to_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);


-- Embeddings (pgvector). Vacía hasta Fase 3.
create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);


-- Interactions (analítica propia de uso)
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text,
  input_channel text not null,
  intent text,
  resulting_item_id uuid references public.items(id) on delete set null,
  created_at timestamptz not null default now()
);


-- School calendar (global, Madrid)
create table public.school_calendar (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  type text not null check (type in ('school_day', 'holiday', 'weekend', 'vacation')),
  description text
);


-- =============================================================================
-- Índices
-- =============================================================================
create index household_members_user_id_idx      on public.household_members(user_id);
create index household_members_household_id_idx on public.household_members(household_id);

create index projects_household_id_idx on public.projects(household_id) where archived = false;
create index projects_owner_id_idx    on public.projects(owner_id);

create index items_household_id_idx  on public.items(household_id);
create index items_type_idx          on public.items(type);
create index items_due_at_idx        on public.items(due_at) where due_at is not null;
create index items_project_id_idx    on public.items(project_id);
create index items_assigned_to_idx   on public.items(assigned_to);
create index items_hh_type_due_idx   on public.items(household_id, type, due_at);
create index items_hh_scope_idx      on public.items(household_id, scope);

create index presence_household_date_idx on public.presence(household_id, date);
create index presence_member_date_idx    on public.presence(member_id, date);

create index messages_household_created_idx on public.messages(household_id, created_at desc);
create index messages_reply_to_idx          on public.messages(reply_to_id) where reply_to_id is not null;

create index embeddings_item_id_idx on public.embeddings(item_id);

create index interactions_user_created_idx on public.interactions(user_id, created_at desc);

create index school_calendar_date_idx on public.school_calendar(date);


-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.projects          enable row level security;
alter table public.items             enable row level security;
alter table public.presence          enable row level security;
alter table public.messages          enable row level security;
alter table public.embeddings        enable row level security;
alter table public.interactions      enable row level security;
alter table public.school_calendar   enable row level security;


create policy "households_select_member"
  on public.households for select
  using (public.is_member(id));

create policy "households_update_admin"
  on public.households for update
  using (public.is_admin(id))
  with check (public.is_admin(id));

create policy "households_delete_admin"
  on public.households for delete
  using (public.is_admin(id));


create policy "members_select_same_household"
  on public.household_members for select
  using (public.is_member(household_id));

create policy "members_insert_admin"
  on public.household_members for insert
  with check (public.is_admin(household_id));

create policy "members_update_admin_or_self"
  on public.household_members for update
  using (public.is_admin(household_id) or user_id = auth.uid())
  with check (public.is_admin(household_id) or user_id = auth.uid());

create policy "members_delete_admin"
  on public.household_members for delete
  using (public.is_admin(household_id));


create policy "projects_select"
  on public.projects for select
  using (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and owner_id in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "projects_insert"
  on public.projects for insert
  with check (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and owner_id in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "projects_update"
  on public.projects for update
  using (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and owner_id in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "projects_delete"
  on public.projects for delete
  using (
    (scope = 'family'   and public.is_admin(household_id))  or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and owner_id in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );


create policy "items_select"
  on public.items for select
  using (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and created_by in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "items_insert"
  on public.items for insert
  with check (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and created_by in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "items_update"
  on public.items for update
  using (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and created_by in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );

create policy "items_delete"
  on public.items for delete
  using (
    (scope = 'family'   and public.is_member(household_id)) or
    (scope = 'couple'   and public.is_admin(household_id))  or
    (scope = 'personal' and created_by in (
      select id from public.household_members where user_id = auth.uid()
    ))
  );


create policy "presence_select_member" on public.presence for select
  using (public.is_member(household_id));

create policy "presence_insert_member" on public.presence for insert
  with check (public.is_member(household_id));

create policy "presence_update_member" on public.presence for update
  using (public.is_member(household_id))
  with check (public.is_member(household_id));

create policy "presence_delete_admin" on public.presence for delete
  using (public.is_admin(household_id));


create policy "messages_select_member" on public.messages for select
  using (public.is_member(household_id));

create policy "messages_insert_self" on public.messages for insert
  with check (
    public.is_member(household_id)
    and sender_id = public.current_member_id(household_id)
  );

create policy "messages_update_author_or_admin" on public.messages for update
  using (
    public.is_admin(household_id)
    or sender_id = public.current_member_id(household_id)
  )
  with check (
    public.is_admin(household_id)
    or sender_id = public.current_member_id(household_id)
  );

create policy "messages_delete_admin" on public.messages for delete
  using (public.is_admin(household_id));


create policy "embeddings_select" on public.embeddings for select
  using (
    exists (
      select 1 from public.items i
      where i.id = embeddings.item_id and (
        (i.scope = 'family'   and public.is_member(i.household_id)) or
        (i.scope = 'couple'   and public.is_admin(i.household_id))  or
        (i.scope = 'personal' and i.created_by in (
          select id from public.household_members where user_id = auth.uid()
        ))
      )
    )
  );

create policy "embeddings_insert" on public.embeddings for insert
  with check (
    exists (
      select 1 from public.items i
      where i.id = embeddings.item_id and (
        (i.scope = 'family'   and public.is_member(i.household_id)) or
        (i.scope = 'couple'   and public.is_admin(i.household_id))  or
        (i.scope = 'personal' and i.created_by in (
          select id from public.household_members where user_id = auth.uid()
        ))
      )
    )
  );


create policy "interactions_select_own" on public.interactions for select
  using (user_id = auth.uid());

create policy "interactions_insert_own" on public.interactions for insert
  with check (user_id = auth.uid());


create policy "school_calendar_select_auth" on public.school_calendar for select
  using (auth.role() = 'authenticated');


-- =============================================================================
-- Grants
-- =============================================================================
grant execute on function public.create_household(text, text)   to authenticated;
grant execute on function public.is_member(uuid)                to authenticated;
grant execute on function public.is_admin(uuid)                 to authenticated;
grant execute on function public.current_member_id(uuid)        to authenticated;


-- =============================================================================
-- Realtime
-- =============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.presence;
