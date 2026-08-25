CREATE POLICY "admins manage candidate photos" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(),'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;