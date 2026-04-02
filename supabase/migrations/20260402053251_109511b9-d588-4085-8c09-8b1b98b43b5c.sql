CREATE TABLE IF NOT EXISTS public.curation_progress (
  challenge_id UUID PRIMARY KEY REFERENCES public.challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','context_research','ai_review','curator_editing','sent_for_approval','completed')),
  sections_reviewed INTEGER NOT NULL DEFAULT 0,
  sections_total INTEGER NOT NULL DEFAULT 27,
  current_wave INTEGER,
  context_sources_count INTEGER DEFAULT 0,
  digest_generated BOOLEAN DEFAULT false,
  ai_review_started_at TIMESTAMPTZ,
  ai_review_completed_at TIMESTAMPTZ,
  curator_editing_started_at TIMESTAMPTZ,
  last_section_saved_at TIMESTAMPTZ,
  estimated_minutes_remaining INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.curation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_cp" ON public.curation_progress
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_write_cp" ON public.curation_progress
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-create progress row when challenge enters Phase 2 (curation)
CREATE OR REPLACE FUNCTION public.init_curation_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.current_phase = 2 AND (OLD.current_phase IS NULL OR OLD.current_phase < 2) THEN
    INSERT INTO public.curation_progress (challenge_id)
    VALUES (NEW.id)
    ON CONFLICT (challenge_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_curation_progress ON public.challenges;
CREATE TRIGGER trg_init_curation_progress
  AFTER UPDATE OF current_phase ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.init_curation_progress();

ALTER PUBLICATION supabase_realtime ADD TABLE public.curation_progress;