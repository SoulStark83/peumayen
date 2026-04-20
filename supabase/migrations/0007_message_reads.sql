-- Acuses de lectura: guarda el último momento en que cada miembro leyó el chat.
-- Un mensaje está "leído por todos" cuando todos los demás miembros tienen
-- last_read_at >= message.created_at.

create table public.message_reads (
  household_id uuid not null references public.households(id)        on delete cascade,
  member_id    uuid not null references public.household_members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (household_id, member_id)
);

create index message_reads_household_idx on public.message_reads(household_id);

alter table public.message_reads enable row level security;

create policy "reads_select_member" on public.message_reads for select
  using (public.is_member(household_id));

create policy "reads_upsert_self" on public.message_reads for insert
  to authenticated
  with check (
    public.is_member(household_id)
    and member_id = public.current_member_id(household_id)
  );

create policy "reads_update_self" on public.message_reads for update
  using (member_id = public.current_member_id(household_id))
  with check (member_id = public.current_member_id(household_id));

alter publication supabase_realtime add table public.message_reads;
