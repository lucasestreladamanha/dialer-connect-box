
-- whatsapp_sessions
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'CLOSE',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessions TO authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session select" ON public.whatsapp_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own session insert" ON public.whatsapp_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own session update" ON public.whatsapp_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own session delete" ON public.whatsapp_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- uploads
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_contacts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own uploads select" ON public.uploads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own uploads insert" ON public.uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own uploads update" ON public.uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own uploads delete" ON public.uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX uploads_user_id_idx ON public.uploads(user_id, created_at DESC);

-- contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
  name TEXT,
  cpf TEXT,
  phone_original TEXT,
  phone_normalized TEXT,
  valid_whatsapp BOOLEAN,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts select" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own contacts insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contacts update" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own contacts delete" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX contacts_user_upload_idx ON public.contacts(user_id, upload_id);
CREATE INDEX contacts_user_valid_idx ON public.contacts(user_id, valid_whatsapp);
CREATE INDEX contacts_user_pending_idx ON public.contacts(user_id, upload_id) WHERE valid_whatsapp IS NULL;
