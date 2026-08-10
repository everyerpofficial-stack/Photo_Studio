CREATE POLICY "leonis_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'leonis-files');
CREATE POLICY "leonis_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'leonis-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "leonis_files_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'leonis-files' AND owner = auth.uid());
CREATE POLICY "leonis_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'leonis-files' AND public.has_any_role(auth.uid(), ARRAY['partner','accountant']::public.app_role[]));