-- Tighten presence write policies.
--
-- Antes: cualquier miembro del hogar podía INSERT/UPDATE la presencia de
-- cualquier otro miembro (policy sólo verificaba is_member del household).
-- Ahora: sólo puedes escribir tu propia fila. Los admin pueden escribir
-- cualquier fila (necesario para marcar presencia de menores sin cuenta).
-- Además, updated_by queda forzado a ser el caller, no falsificable.

drop policy if exists "presence_insert_member" on public.presence;
drop policy if exists "presence_update_member" on public.presence;

create policy "presence_insert_self_or_admin" on public.presence for insert
  with check (
    public.is_member(household_id)
    and (
      member_id = public.current_member_id(household_id)
      or public.is_admin(household_id)
    )
    and updated_by = public.current_member_id(household_id)
  );

create policy "presence_update_self_or_admin" on public.presence for update
  using (
    public.is_member(household_id)
    and (
      member_id = public.current_member_id(household_id)
      or public.is_admin(household_id)
    )
  )
  with check (
    public.is_member(household_id)
    and (
      member_id = public.current_member_id(household_id)
      or public.is_admin(household_id)
    )
    and updated_by = public.current_member_id(household_id)
  );
