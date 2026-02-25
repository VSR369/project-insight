-- Migration 5: Add PAN tax format for India
INSERT INTO public.md_tax_formats (country_id, tax_name, format_regex, example, is_required, display_order)
SELECT c.id, 'PAN', '^[A-Z]{5}[0-9]{4}[A-Z]$', 'ABCDE1234F', false, 2
FROM public.countries c WHERE c.name = 'India'
ON CONFLICT DO NOTHING;
