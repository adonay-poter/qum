-- Private bucket for user voice memos: {user_id}/onboarding.m4a

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-memos',
  'voice-memos',
  false,
  5242880,
  array['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/webm', 'audio/mpeg']
)
on conflict (id) do nothing;

create policy "Users read own voice memos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice-memos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users insert own voice memos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'voice-memos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own voice memos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'voice-memos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'voice-memos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own voice memos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'voice-memos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
