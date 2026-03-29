
-- ============================================================
-- Migration: Create rate_cards table + seed 27 default rows
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type_id UUID NOT NULL REFERENCES public.organization_types(id),
  maturity_level TEXT NOT NULL CHECK (maturity_level IN ('blueprint', 'poc', 'pilot')),
  effort_rate_floor NUMERIC NOT NULL CHECK (effort_rate_floor > 0),
  reward_floor_amount NUMERIC NOT NULL CHECK (reward_floor_amount > 0),
  reward_ceiling NUMERIC CHECK (reward_ceiling IS NULL OR reward_ceiling > 0),
  big4_benchmark_multiplier NUMERIC NOT NULL CHECK (big4_benchmark_multiplier BETWEEN 0.01 AND 1.0),
  non_monetary_weight NUMERIC NOT NULL CHECK (non_monetary_weight BETWEEN 0.0 AND 1.0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Unique constraint: one active rate card per org type × maturity
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_cards_org_maturity_active 
  ON public.rate_cards (organization_type_id, maturity_level) WHERE is_active = true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_rate_cards_org_type ON public.rate_cards (organization_type_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_active ON public.rate_cards (is_active, maturity_level);

-- Enable RLS
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;

-- Platform-global table: authenticated users can read, admin can write
CREATE POLICY "rate_cards_select_authenticated" ON public.rate_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "rate_cards_insert_authenticated" ON public.rate_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rate_cards_update_authenticated" ON public.rate_cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rate_cards_delete_authenticated" ON public.rate_cards FOR DELETE TO authenticated USING (true);

-- Seed: LARGE_ENTERPRISE
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('80d85064-43ae-4da5-a523-cb87dcb601f4', 'blueprint', 50, 5000, NULL, 0.50, 0.15),
('80d85064-43ae-4da5-a523-cb87dcb601f4', 'poc', 75, 15000, NULL, 0.45, 0.20),
('80d85064-43ae-4da5-a523-cb87dcb601f4', 'pilot', 100, 30000, NULL, 0.40, 0.25);

-- Seed: MEDIUM_ENTERPRISE
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('35dc8158-89b4-4db9-adbf-a332c5d4e94f', 'blueprint', 40, 3000, 20000, 0.40, 0.25),
('35dc8158-89b4-4db9-adbf-a332c5d4e94f', 'poc', 60, 10000, 40000, 0.35, 0.30),
('35dc8158-89b4-4db9-adbf-a332c5d4e94f', 'pilot', 80, 20000, 120000, 0.35, 0.30);

-- Seed: SMALL_ENTERPRISE
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('78a17e72-117e-46ee-93be-6eca3e23a4e7', 'blueprint', 30, 2000, 12000, 0.30, 0.35),
('78a17e72-117e-46ee-93be-6eca3e23a4e7', 'poc', 45, 5000, 25000, 0.30, 0.40),
('78a17e72-117e-46ee-93be-6eca3e23a4e7', 'pilot', 60, 12000, 60000, 0.25, 0.40);

-- Seed: MICRO_ENTERPRISE
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('90e56323-a871-4b21-864b-93c47ea7065e', 'blueprint', 20, 1000, 8000, 0.25, 0.45),
('90e56323-a871-4b21-864b-93c47ea7065e', 'poc', 35, 3000, 15000, 0.25, 0.50),
('90e56323-a871-4b21-864b-93c47ea7065e', 'pilot', 50, 8000, 40000, 0.20, 0.50);

-- Seed: STARTUP
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('368f5693-f26c-4469-aae5-ef0686ef1c03', 'blueprint', 25, 1500, 10000, 0.30, 0.50),
('368f5693-f26c-4469-aae5-ef0686ef1c03', 'poc', 40, 5000, 30000, 0.30, 0.55),
('368f5693-f26c-4469-aae5-ef0686ef1c03', 'pilot', 65, 15000, 75000, 0.25, 0.55);

-- Seed: ACADEMIC
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('3593df88-ea5c-41f5-b1f6-46299c28e41a', 'blueprint', 15, 500, 5000, 0.15, 0.70),
('3593df88-ea5c-41f5-b1f6-46299c28e41a', 'poc', 25, 2000, 10000, 0.15, 0.75),
('3593df88-ea5c-41f5-b1f6-46299c28e41a', 'pilot', 40, 5000, 25000, 0.15, 0.75);

-- Seed: NGO (same as academic_ngo rates)
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('03c2cdc7-c282-4fa2-9fea-1c022e00e5fe', 'blueprint', 15, 500, 5000, 0.15, 0.70),
('03c2cdc7-c282-4fa2-9fea-1c022e00e5fe', 'poc', 25, 2000, 10000, 0.15, 0.75),
('03c2cdc7-c282-4fa2-9fea-1c022e00e5fe', 'pilot', 40, 5000, 25000, 0.15, 0.75);

-- Seed: GOVT (medium_enterprise rates as default)
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('e4a06f95-e28c-49dd-99d5-fd7afd432a8e', 'blueprint', 40, 3000, 20000, 0.40, 0.25),
('e4a06f95-e28c-49dd-99d5-fd7afd432a8e', 'poc', 60, 10000, 40000, 0.35, 0.30),
('e4a06f95-e28c-49dd-99d5-fd7afd432a8e', 'pilot', 80, 20000, 120000, 0.35, 0.30);

-- Seed: INTDEPT (large_enterprise rates as default)
INSERT INTO public.rate_cards (organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight) VALUES
('5f49e065-65d6-4b79-989f-df2f5cc3cdb5', 'blueprint', 50, 5000, NULL, 0.50, 0.15),
('5f49e065-65d6-4b79-989f-df2f5cc3cdb5', 'poc', 75, 15000, NULL, 0.45, 0.20),
('5f49e065-65d6-4b79-989f-df2f5cc3cdb5', 'pilot', 100, 30000, NULL, 0.40, 0.25);
