

# Fix: Billing Page -- Keep Payment Fields, Simulate Payment, Fix Order Summary

## Problem Summary

1. **"Missing registration data" error** -- The `handleSubmit` function fails because `state.organizationId`, `state.tenantId`, or `state.step4` may be missing (session started before persistence was deployed, or hot-reload scenario).
2. **No payment gateway** -- Credit card fields exist but are not connected. Clicking "Complete Registration" should simulate a successful payment by writing the correct statuses to the database so the workflow can continue.
3. **Order Summary is incomplete** -- Missing membership fee line item. "Due Today" only shows subscription price, not subscription + membership fee.

## Solution

### Keep ALL existing payment fields as-is (Credit Card, ACH, Wire tabs stay unchanged). On "Complete Registration", treat the payment as simulated-success and write the following to the database:

### Part 1: Missing Data Guard

Add a guard at the top of the render (after all hooks) in `BillingForm.tsx`. If `state.organizationId` or `state.step4` is missing, show a card with:
- "Session data not found" message
- "Return to Step 1" button

This replaces the toast error that leaves users stranded.

### Part 2: Fix handleSubmit -- Simulate Payment Success

Update `handleSubmit` to pass the computed pricing into `createSubscription` and set status to `active` (instead of `pending_billing`):

```text
Current flow:
  1. saveBilling -> upsert seeker_billing_info
  2. createSubscription -> insert seeker_subscriptions with status='pending_billing'
  3. update seeker_organizations.registration_step = 5

New flow (simulated payment):
  1. saveBilling -> upsert seeker_billing_info (unchanged)
  2. createSubscription -> insert seeker_subscriptions with:
     - status = 'active' (payment simulated as successful)
     - monthly_base_price = baseMonthly
     - effective_monthly_cost = effectiveMonthly
     - discount_percentage = total discount
  3. If membership selected -> insert seeker_memberships record
  4. update seeker_organizations.registration_step = 5
  5. Navigate to onboarding/login
```

Update `useCreateSubscription` mutation to accept `status` parameter (default `'active'`) so the caller can set it.

### Part 3: Fix Order Summary

Update the Order Summary card to include:

| Line Item | Value |
|-----------|-------|
| Base Price | $X.XX/mo |
| Billing discount | -Y% (if applicable) |
| Subsidized discount | -Z% (if applicable) |
| **Subscription subtotal** | $X.XX |
| Membership Fee | $500.00 or $900.00 (if selected) |
| Per-Challenge Fees | billed on usage |
| Tax | not applicable at registration |
| **Due Today** | subscription + membership fee |

Changes:
- Look up `annual_fee_usd` from `membershipTiers` using `state.step4?.membership_tier_id`
- Add membership fee as a priced line item (not just a discount badge)
- Update "Due Today" total: `effectiveMonthly + membershipFee`
- Replace "Est. Challenge Fees: varies" with "Per-Challenge Fees: billed on usage"
- Replace "Tax: calculated at checkout" with "Tax: not applicable at registration"
- Use `state.localeInfo?.currency_symbol ?? '$'` instead of hardcoded `$`

### Part 4: Create Membership Record on Registration

If the user selected a membership tier in Step 4, the submit handler should also create a `seeker_memberships` row:

```text
seeker_memberships:
  organization_id
  tenant_id
  membership_tier_id = state.step4.membership_tier_id
  lifecycle_status = 'active'
  starts_at = now
  ends_at = now + duration_months (12 for annual, 24 for multi-year)
  auto_renew = true
  fee_discount_pct = from membership tier
```

This will be done via a new `useCreateMembership` mutation hook added to `useBillingData.ts`.

## Files Modified

| File | Change |
|------|--------|
| `src/components/registration/BillingForm.tsx` | (1) Add missing-data guard, (2) pass pricing values + `status='active'` to createSubscription, (3) call createMembership if membership selected, (4) fix Order Summary with membership fee line + correct Due Today total + locale currency |
| `src/hooks/queries/useBillingData.ts` | (1) Update `useCreateSubscription` to accept `status` parameter, (2) add `useCreateMembership` mutation hook |

## Edge Cases

- **No membership selected**: Membership fee line hidden, no `seeker_memberships` insert, Due Today = subscription only
- **Internal department (shadow billing)**: Already handled -- shows "Shadow billing -- no actual charge", Due Today = $0
- **Missing session data**: Shows a clear "Return to Step 1" card instead of a toast that disappears
- **Future Stripe integration**: When payment gateway is added, change `status` back to `pending_billing` and add Stripe payment intent flow between steps 2 and 3 of the submit handler. All other logic remains unchanged.

