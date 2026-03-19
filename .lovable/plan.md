

# Plan: Add Engagement Model Selector to Solution Request Form

## Problem
The Solution Request page (`CogniSubmitRequestPage.tsx`) hardcodes the engagement model from the org-level `seeker_organizations.operating_model` field. There is no selector — it just displays a badge saying "Marketplace" or "Aggregator" based on the org default. Per business rules (BR-ENG, per-challenge model selection), the user should be able to choose the engagement model at request time, with the org default as the pre-selected value.

## Changes

### 1. Add engagement model field to schema and form (`CogniSubmitRequestPage.tsx`)
- Add `engagement_model: z.enum(['MP', 'AGG'])` to the form schema
- Default it to `orgContext?.operatingModel ?? 'AGG'` (org preference as default, not locked)
- Replace the static badge with the `EngagementModelSelector` component (already built) or a simpler RadioGroup inline selector (MP / AGG)
- Derive `isMP` / `isAGG` from the form's watched `engagement_model` field instead of from `orgContext?.operatingModel`
- Update `buildPayload` to use `data.engagement_model` instead of `orgContext?.operatingModel`
- Architect field remains conditionally shown when MP is selected (reactive to form value)

### 2. Wire engagement model to existing `EngagementModelSelector` or inline radio
- Use `useEngagementModels()` hook to fetch active models from `md_engagement_models`
- Show a compact two-option radio/card selector near the top of the form (below the Request Info header)
- Pre-select the org's default model

### 3. Reactive form behavior
- When user switches from MP to AGG: hide Architect field, update help text
- When user switches from AGG to MP: show Architect field, update help text
- The badge in the Request Info header updates reactively

### Technical Details
- Only `src/pages/cogniblend/CogniSubmitRequestPage.tsx` needs modification
- `EngagementModelSelector` component and `useEngagementModels` hook already exist and can be reused
- `buildSchema(isMP)` function signature changes to use form-watched value instead of org context

