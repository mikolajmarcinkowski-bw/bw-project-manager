-- =============================================================================
-- D1: Storage RLS dla bucket project-documents
-- Aplikacja wyłącznie wewnętrzna (R1) — każdy zalogowany user ma pełny dostęp
-- =============================================================================

-- SELECT: czytanie / pobieranie pliku
create policy "Authenticated users can read project documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-documents');

-- INSERT: upload pliku
create policy "Authenticated users can upload project documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-documents');

-- DELETE: usuwanie pliku
create policy "Authenticated users can delete project documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-documents');

-- UPDATE: metadane (rzadko potrzebne, ale kompletne)
create policy "Authenticated users can update project documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-documents');
