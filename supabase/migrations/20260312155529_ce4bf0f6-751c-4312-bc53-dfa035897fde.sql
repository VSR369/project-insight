
-- Insert 'declined' status into md_role_assignment_statuses
INSERT INTO md_role_assignment_statuses (code, display_name, color_class, display_order)
VALUES ('declined', 'Declined', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 6)
ON CONFLICT (code) DO NOTHING;
