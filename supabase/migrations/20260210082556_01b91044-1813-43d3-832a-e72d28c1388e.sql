
-- Fix search_path on trigger functions that were missing it
CREATE OR REPLACE FUNCTION public.trigger_enterprise_auto_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.annual_revenue_range IN ('>$1B', '$500M-$1B') OR
     NEW.employee_count_range IN ('5001-10000', '10001+') THEN
    NEW.is_enterprise = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_itar_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_requires_itar BOOLEAN;
BEGIN
  IF NEW.export_control_status_id IS NOT NULL THEN
    SELECT requires_itar_compliance INTO v_requires_itar
    FROM md_export_control_statuses
    WHERE id = NEW.export_control_status_id;
    IF v_requires_itar THEN
      NEW.itar_certified = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_country_format_populate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_country RECORD;
BEGIN
  IF NEW.hq_country_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.hq_country_id IS DISTINCT FROM NEW.hq_country_id) THEN
    SELECT currency_code, currency_symbol, date_format, number_format
    INTO v_country
    FROM countries WHERE id = NEW.hq_country_id;
    IF v_country IS NOT NULL THEN
      NEW.preferred_currency = COALESCE(NEW.preferred_currency, v_country.currency_code, 'USD');
      NEW.date_format = COALESCE(v_country.date_format, 'YYYY-MM-DD');
      NEW.number_format = COALESCE(v_country.number_format, '#,###.##');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_onboarding_completion_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.has_posted_challenge AND NEW.has_invited_team_member AND NEW.has_viewed_provider_profiles THEN
    NEW.onboarding_completed = TRUE;
    NEW.onboarding_completed_at = COALESCE(NEW.onboarding_completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_deactivate_old_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE platform_terms SET is_active = FALSE, updated_at = NOW()
    WHERE id != NEW.id AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;
