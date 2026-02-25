-- Migration 3: Create md_country_subdivisions + seed Indian states/UTs
CREATE TABLE IF NOT EXISTS public.md_country_subdivisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id),
  name TEXT NOT NULL,
  code TEXT,
  subdivision_type TEXT DEFAULT 'state',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_country_subdivisions_country ON public.md_country_subdivisions(country_id);

ALTER TABLE public.md_country_subdivisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "md_country_subdivisions_read_all" ON public.md_country_subdivisions
  FOR SELECT USING (true);

-- Insert Indian states and UTs
INSERT INTO public.md_country_subdivisions (country_id, name, code, subdivision_type, display_order)
SELECT c.id, v.name, v.code, v.stype, v.dorder
FROM countries c,
(VALUES
  ('Andhra Pradesh','AP','state',1),('Arunachal Pradesh','AR','state',2),
  ('Assam','AS','state',3),('Bihar','BR','state',4),
  ('Chhattisgarh','CG','state',5),('Goa','GA','state',6),
  ('Gujarat','GJ','state',7),('Haryana','HR','state',8),
  ('Himachal Pradesh','HP','state',9),('Jharkhand','JH','state',10),
  ('Karnataka','KA','state',11),('Kerala','KL','state',12),
  ('Madhya Pradesh','MP','state',13),('Maharashtra','MH','state',14),
  ('Manipur','MN','state',15),('Meghalaya','ML','state',16),
  ('Mizoram','MZ','state',17),('Nagaland','NL','state',18),
  ('Odisha','OD','state',19),('Punjab','PB','state',20),
  ('Rajasthan','RJ','state',21),('Sikkim','SK','state',22),
  ('Tamil Nadu','TN','state',23),('Telangana','TS','state',24),
  ('Tripura','TR','state',25),('Uttar Pradesh','UP','state',26),
  ('Uttarakhand','UK','state',27),('West Bengal','WB','state',28),
  ('Andaman and Nicobar Islands','AN','union_territory',29),
  ('Chandigarh','CH','union_territory',30),
  ('Dadra and Nagar Haveli and Daman and Diu','DD','union_territory',31),
  ('Delhi','DL','union_territory',32),
  ('Jammu and Kashmir','JK','union_territory',33),
  ('Ladakh','LA','union_territory',34),
  ('Lakshadweep','LD','union_territory',35),
  ('Puducherry','PY','union_territory',36)
) AS v(name, code, stype, dorder)
WHERE c.name = 'India';
