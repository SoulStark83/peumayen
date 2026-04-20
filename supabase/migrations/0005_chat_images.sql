-- Agrega soporte de imágenes al chat:
--   · columna image_url (nullable) en messages
--   · bucket chat-images público, 10 MB, imágenes + GIF
--   · RLS: lectura pública, escritura sólo miembros del hogar

alter table public.messages add column if not exists image_url text;


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "chat_images_read_public"      on storage.objects;
drop policy if exists "chat_images_insert_member"    on storage.objects;
drop policy if exists "chat_images_delete_self_or_admin" on storage.objects;

-- Lectura pública (las imágenes se embeben en <img>)
create policy "chat_images_read_public" on storage.objects for select
  using (bucket_id = 'chat-images');

-- Escritura: miembros del hogar cuyo id ocupa la primera carpeta del path
-- Path esperado: chat-images/{household_id}/{member_id}-{timestamp}.{ext}
create policy "chat_images_insert_member" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-images'
    and public.is_member((storage.foldername(name))[1]::uuid)
  );

-- Borrado: el propio uploader o un admin del hogar
create policy "chat_images_delete_self_or_admin" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-images'
    and (
      owner = auth.uid()
      or public.is_admin((storage.foldername(name))[1]::uuid)
    )
  );
