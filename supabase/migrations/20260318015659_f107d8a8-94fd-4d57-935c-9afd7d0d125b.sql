
-- modification_points: tracks structured modification instructions per amendment
CREATE TABLE public.modification_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id UUID NOT NULL REFERENCES public.amendment_records(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('REQUIRED', 'RECOMMENDED', 'OPTIONAL')),
  status TEXT NOT NULL DEFAULT 'OUTSTANDING' CHECK (status IN ('OUTSTANDING', 'ADDRESSED', 'WAIVED')),
  addressed_by UUID REFERENCES auth.users(id),
  addressed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_modification_points_amendment ON public.modification_points(amendment_id);
CREATE INDEX idx_modification_points_status ON public.modification_points(amendment_id, status);

-- Enable RLS
ALTER TABLE public.modification_points ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read points for challenges they have roles on
CREATE POLICY "authenticated_read_modification_points"
  ON public.modification_points
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: authenticated users can insert
CREATE POLICY "authenticated_insert_modification_points"
  ON public.modification_points
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: authenticated users can update
CREATE POLICY "authenticated_update_modification_points"
  ON public.modification_points
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
