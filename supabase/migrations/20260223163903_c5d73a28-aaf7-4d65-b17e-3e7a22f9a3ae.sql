-- Create Enterprise tier
INSERT INTO public.md_subscription_tiers (code, name, description, max_challenges, max_users, is_enterprise, display_order, is_active)
VALUES ('enterprise', 'Enterprise', 'Custom pricing, dedicated support, and unlimited features for large organizations.', NULL, NULL, true, 4, true);