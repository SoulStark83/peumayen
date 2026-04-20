-- Reacciones emoji por mensaje.
-- household_id desnormalizado para filtro de realtime y RLS sin joins.
-- Unique por (message_id, member_id, emoji): un miembro puede poner varias emojis distintas.

create table public.message_reactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id)        on delete cascade,
  message_id   uuid not null references public.messages(id)          on delete cascade,
  member_id    uuid not null references public.household_members(id) on delete cascade,
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (message_id, member_id, emoji)
);

create index message_reactions_household_idx  on public.message_reactions(household_id);
create index message_reactions_message_id_idx on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

create policy "reactions_select_member" on public.message_reactions for select
  using (public.is_member(household_id));

create policy "reactions_insert_self" on public.message_reactions for insert
  to authenticated
  with check (
    public.is_member(household_id)
    and member_id = public.current_member_id(household_id)
  );

create policy "reactions_delete_self_or_admin" on public.message_reactions for delete
  using (
    public.is_admin(household_id)
    or member_id = public.current_member_id(household_id)
  );

alter publication supabase_realtime add table public.message_reactions;
