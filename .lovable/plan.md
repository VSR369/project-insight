

## Plan: Remove Payment Schedule Section (Redundant with Reward Structure)

### Why
The Reward Structure component now includes a full milestone payment breakdown with editable rows, percentage validation (must sum to 100%), and AI-suggested distributions. The separate "Payment Schedule" section duplicates this functionality entirely.

### Changes

#### 1. Remove Payment Schedule from section config (`CurationReviewPage.tsx`)
- Delete the `payment_schedule` section object (lines ~319-328) from the `SECTIONS` array
- Remove the `isPaymentSchedule` conditional rendering block (lines ~1276-1281) inside the accordion content
- Remove the `PaymentScheduleSection` import

#### 2. Delete the standalone component
- Delete `src/components/cogniblend/PaymentScheduleSection.tsx` entirely

#### 3. Cleanup
- Remove any unused imports related to PaymentScheduleSection across the codebase

### What stays
- The milestone editing inside `RewardStructureDisplay.tsx` (already has add/remove/edit rows, 100% validation, AI suggest)
- The `payment_milestones` data within `reward_structure` JSONB — same storage location, just one editor instead of two

