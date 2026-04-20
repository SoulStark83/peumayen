-- Columna audio_url en messages para notas de voz.
-- Bucket chat-audio con RLS por hogar (mismo patrón que chat-images).

alter table public.messages add column if not exists audio_url text;


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-audio',
  'chat-audio',
  true,
  10485760,
  array['audio/webm','audio/ogg','audio/mp4','audio/mpeg']::text[]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists "chat_audio_read_public"          on storage.objects;
drop policy if exists "chat_audio_insert_member"        on storage.objects;
drop policy if exists "chat_audio_delete_self_or_admin" on storage.objects;

create policy "chat_audio_read_public" on storage.objects for select
  using (bucket_id = 'chat-audio');

-- Path esperado: chat-audio/{household_id}/{member_id}-{timestamp}.{ext}
create policy "chat_audio_insert_member" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-audio'
    and public.is_member((storage.foldername(name))[1]::uuid)
  );

create policy "chat_audio_delete_self_or_admin" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-audio'
    and (
      owner = auth.uid()
      or public.is_admin((storage.foldername(name))[1]::uuid)
    )
  );
