CREATE TABLE IF NOT EXISTS public.saved_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  platform text NOT NULL,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_reach jsonb,
  used_in_campaigns integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saved audiences are viewable by owner"
  ON public.saved_audiences FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are insertable by owner"
  ON public.saved_audiences FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are updatable by owner"
  ON public.saved_audiences FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are deletable by owner"
  ON public.saved_audiences FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_client ON public.saved_audiences(client_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.saved_audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
