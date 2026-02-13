-- Delete all existing tier features
DELETE FROM public.md_tier_features;

-- Basic Tier features
INSERT INTO public.md_tier_features (tier_id, feature_code, feature_name, access_type, description, display_order)
VALUES
  ('e3338419-144f-4a21-9163-425283cf1862', 'challenges_per_period',        '10 challenges per subscription period',         'included',      '$5 per additional challenge', 1),
  ('e3338419-144f-4a21-9163-425283cf1862', 'solutions_per_challenge',      '1 solution per challenge',                      'included',      NULL, 2),
  ('e3338419-144f-4a21-9163-425283cf1862', 'additional_challenges',        'Additional challenges available (fees apply)',   'included',      NULL, 3),
  ('e3338419-144f-4a21-9163-425283cf1862', 'workflow_templates',           'Single workflow template',                      'included',      NULL, 4),
  ('e3338419-144f-4a21-9163-425283cf1862', 'monitoring',                   'Basic uptime monitoring',                       'included',      NULL, 5),
  ('e3338419-144f-4a21-9163-425283cf1862', 'support',                      'Self-service help center',                      'included',      NULL, 6),
  ('e3338419-144f-4a21-9163-425283cf1862', 'analytics',                    'Analytics dashboards',                          'not_available', NULL, 7),
  ('e3338419-144f-4a21-9163-425283cf1862', 'onboarding',                   'Onboarding support',                            'not_available', NULL, 8);

-- Standard Tier features
INSERT INTO public.md_tier_features (tier_id, feature_code, feature_name, access_type, description, display_order)
VALUES
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'challenges_per_period',        '20 challenges per subscription period',         'included',      '$3 per additional challenge', 1),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'solutions_per_challenge',      '2 solutions per challenge',                     'included',      NULL, 2),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'additional_challenges',        'Additional challenges available (fees apply)',   'included',      NULL, 3),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'workflow_templates',           'Up to 3 standard workflow templates',           'included',      NULL, 4),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'monitoring',                   'Priority incident response',                    'included',      NULL, 5),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'analytics',                    'Advanced dashboards and analytics',             'included',      NULL, 6),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'learning_resources',           'Tutorials, FAQs and webinars',                  'included',      NULL, 7),
  ('f685fd94-3d03-4dbe-b101-26f17fc4a1a6', 'support',                      'Email and chat support',                        'included',      NULL, 8);

-- Premium Tier features
INSERT INTO public.md_tier_features (tier_id, feature_code, feature_name, access_type, description, display_order)
VALUES
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'challenges_per_period',        'Unlimited challenges',                                                          'included', 'Included (no per-challenge fee)', 1),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'solutions_per_challenge',      '3 solutions per challenge',                                                     'included', NULL, 2),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'additional_challenges',        'No per-challenge fees',                                                         'included', NULL, 3),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'workflow_templates',           'Configurable workflows with conditional logic, custom fields and routing',       'included', NULL, 4),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'support',                      '24/7 dedicated support team',                                                   'included', NULL, 5),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'analytics',                    'Advanced analytics with AI insights',                                           'included', NULL, 6),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'onboarding',                   'Personalized onboarding and strategy sessions',                                 'included', NULL, 7),
  ('41396207-3c6a-4c79-bbf0-91c4bdcab6a2', 'api_access',                   'Full API access and webhooks',                                                  'included', NULL, 8);