
-- =============================================================
-- Function 1: send_notification
-- =============================================================
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id      UUID,
  p_challenge_id UUID,
  p_type         TEXT,
  p_title        TEXT,
  p_message      TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_type NOT IN ('SLA_BREACH','SLA_WARNING','PHASE_COMPLETE','ROLE_ASSIGNED','ROLE_REASSIGNED','WAITING_FOR_YOU','AMENDMENT_NOTICE') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;

  INSERT INTO public.cogni_notifications (
    user_id, challenge_id, notification_type, title, message, is_read, created_at
  ) VALUES (
    p_user_id, p_challenge_id, p_type, p_title, p_message, false, NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.send_notification(UUID, UUID, TEXT, TEXT, TEXT) IS
  'Inserts a typed notification into cogni_notifications for a user/challenge pair.';

-- =============================================================
-- Function 2: get_unread_count
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
    FROM public.cogni_notifications
   WHERE user_id = p_user_id
     AND is_read = false;
$$;

COMMENT ON FUNCTION public.get_unread_count(UUID) IS
  'Returns count of unread notifications for a user.';

-- =============================================================
-- Function 3: mark_notification_read
-- =============================================================
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cogni_notifications
     SET is_read = true
   WHERE id = p_notification_id;
END;
$$;

COMMENT ON FUNCTION public.mark_notification_read(UUID) IS
  'Marks a single notification as read.';

-- =============================================================
-- Function 4: mark_all_read
-- =============================================================
CREATE OR REPLACE FUNCTION public.mark_all_read(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cogni_notifications
     SET is_read = true
   WHERE user_id = p_user_id
     AND is_read = false;
END;
$$;

COMMENT ON FUNCTION public.mark_all_read(UUID) IS
  'Marks all unread notifications as read for a user.';
