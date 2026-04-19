-- Bucket público para avatares de miembros.
-- Path esperado: avatars/{member_id}/{filename}
-- Lectura: pública (se embeben en <img>).
-- Escritura: dueño del member_id o admin del mismo hogar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_self_or_admin" on storage.objects;
create policy "avatars_insert_self_or_admin" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and exists (
      select 1
      from public.household_members target
      where target.id::text = (storage.foldername(name))[1]
        and (
          target.user_id = auth.uid()
          or exists (
            select 1 from public.household_members me
            where me.user_id = auth.uid()
              and me.household_id = target.household_id
              and me.role = 'admin'
          )
        )
    )
  );

drop policy if exists "avatars_update_self_or_admin" on storage.objects;
create policy "avatars_update_self_or_admin" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1
      from public.household_members target
      where target.id::text = (storage.foldername(name))[1]
        and (
          target.user_id = auth.uid()
          or exists (
            select 1 from public.household_members me
            where me.user_id = auth.uid()
              and me.household_id = target.household_id
              and me.role = 'admin'
          )
        )
    )
  )
  with check (
    bucket_id = 'avatars'
    and exists (
      select 1
      from public.household_members target
      where target.id::text = (storage.foldername(name))[1]
        and (
          target.user_id = auth.uid()
          or exists (
            select 1 from public.household_members me
            where me.user_id = auth.uid()
              and me.household_id = target.household_id
              and me.role = 'admin'
          )
        )
    )
  );

drop policy if exists "avatars_delete_self_or_admin" on storage.objects;
create policy "avatars_delete_self_or_admin" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1
      from public.household_members target
      where target.id::text = (storage.foldername(name))[1]
        and (
          target.user_id = auth.uid()
          or exists (
            select 1 from public.household_members me
            where me.user_id = auth.uid()
              and me.household_id = target.household_id
              and me.role = 'admin'
          )
        )
    )
  );
