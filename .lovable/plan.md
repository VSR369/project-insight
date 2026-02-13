

# Update Tier Features to Match Plan Details

## Current State

The `md_tier_features` table currently has 8 generic features per tier (Marketplace Access, Aggregator Access, Dedicated Account Manager, Analytics Dashboard, API Access, Priority Support, Custom Integrations, White-label Reports). These don't reflect the actual plan offering shown in the reference image.

## What Changes

### 1. Database: Replace Feature Rows

Delete existing feature records and insert new ones matching the reference image. The `md_tier_features` table already has the right schema (`feature_name`, `access_type` = included/not_available, `usage_limit`, `description`).

**Basic Tier features:**

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| 1 | 10 challenges per subscription period | included | |
| 2 | 1 solution per challenge | included | |
| 3 | Additional challenges available (fees apply) | included | |
| 4 | Single workflow template | included | |
| 5 | Basic uptime monitoring | included | |
| 6 | Self-service help center | included | |
| 7 | Analytics dashboards | not_available | |
| 8 | Onboarding support | not_available | |

Extra note stored in `description`: "$5 per additional challenge"

**Standard Tier features:**

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| 1 | 20 challenges per subscription period | included | |
| 2 | 2 solutions per challenge | included | |
| 3 | Additional challenges available (fees apply) | included | |
| 4 | Up to 3 standard workflow templates | included | |
| 5 | Priority incident response | included | |
| 6 | Advanced dashboards and analytics | included | |
| 7 | Tutorials, FAQs and webinars | included | |
| 8 | Email and chat support | included | |

Extra note: "$3 per additional challenge"

**Premium Tier features:**

| # | Feature | Access | Description |
|---|---------|--------|-------------|
| 1 | Unlimited challenges | included | |
| 2 | 3 solutions per challenge | included | |
| 3 | No per-challenge fees | included | |
| 4 | Configurable workflows with conditional logic, custom fields and routing | included | |
| 5 | 24/7 dedicated support team | included | |
| 6 | Advanced analytics with AI insights | included | |
| 7 | Personalized onboarding and strategy sessions | included | |
| 8 | Full API access and webhooks | included | |

Extra note: "Included (no per-challenge fee)"

### 2. UI: Update Features Section in Pricing Overview

Modify the Features section in `TierCard` within `PricingOverviewPage.tsx` to:
- Show check marks for `included` features
- Show X marks for `not_available` features (with muted/strikethrough text, matching the image style)
- Display the tier description note (e.g., "+ $5 per additional challenge") below the feature list

### 3. Clarification on Scope

- These features are **the same for both engagement models** (Marketplace and Aggregator tabs show the same features per tier)
- What varies by engagement model is the **fee structure** (consulting fee, management fee, platform fee) -- which is already handled correctly in the existing tier card sections

## Files Changed

| File | Action |
|------|--------|
| Database migration | **New** -- DELETE old features, INSERT new features for all 3 tiers |
| `src/pages/admin/pricing-overview/PricingOverviewPage.tsx` | **Modify** -- Update the Features `CollapsibleSection` to show X/strikethrough for not_available features and the description note |

## Technical Details

- The migration uses the existing tier IDs: Basic = `e3338419-...`, Standard = `f685fd94-...`, Premium = `41396207-...`
- Feature codes will use snake_case identifiers (e.g., `challenges_per_period`, `solutions_per_challenge`)
- The `description` column on `md_tier_features` will store the per-additional-challenge note
- The UI change is minor -- the existing Features section already handles `access_type` but needs the X + strikethrough styling for `not_available` items and a footer note from the description field

