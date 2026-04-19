ALTER TABLE public.cogni_notifications
ADD COLUMN IF NOT EXISTS action_url TEXT;

COMMENT ON COLUMN public.cogni_notifications.action_url IS
  'Optional in-app deep link (relative path) the recipient can click to jump to the relevant page.';