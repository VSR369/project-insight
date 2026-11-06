CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER FUNCTION public.fn_booked_backing_slot_ids() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.fn_booked_backing_slot_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fn_booked_backing_slot_ids() TO authenticated, service_role;