

# Assessment: Payment Gateway Deferral Compatibility

## Verdict: No blocking issues. The current architecture is cleanly deferral-ready.

Here is why the current implementation will not cause problems when you integrate a real payment gateway later:

## What's Already in Place

1. **`registration_payments` table** has all the fields a real gateway needs: `transaction_id` (auto-generated UUID), `gateway_reference`, `payment_method`, `status` (Pending/Completed/Failed/Refunded), `payment_attempts`, `failure_reason`.

2. **Payment creation is isolated** — lines 258-274 in `BillingForm.tsx` create a dummy record with `status: 'Completed'` and `gateway_reference: SIM-{timestamp}`. This is a single, clearly-commented block that can be swapped out.

3. **Subscription status is decoupled** — the subscription is set to `active` independently of the payment record. When you add a real gateway, you would change this to `pending_billing` until payment confirmation arrives.

4. **V1 verification already reads from `registration_payments`** — `VerificationChecklist.tsx` checks `paymentRecord.status === 'Completed'`, so real gateway statuses will flow through without UI changes.

## Two Minor Items to Note (Not Blockers)

| Item | Current State | Gateway Integration Impact |
|------|--------------|---------------------------|
| `useCreateRegistrationPayment` hook exists but is **not used** — `BillingForm` does a raw `supabase.from()` insert instead | Works fine for now | When integrating, refactor to use the hook (which already has proper audit fields via `withCreatedBy`) or replace with a gateway edge function call |
| Payment insert is wrapped in a **silent try/catch** (line 272: `catch {}`) so failures are swallowed | Acceptable for dummy flow | Must become blocking when real payments are added — a failed payment should halt registration |

## No Changes Needed Now

The dummy payment flow is structurally sound for deferral. When you're ready for production gateway integration, the work will be:

1. Create an edge function that calls the gateway API (Stripe, etc.)
2. Replace the dummy insert block in `BillingForm.tsx` with a call to that edge function
3. Change subscription initial status from `active` to `pending_billing`
4. Add a webhook handler edge function for gateway callbacks to confirm payment and activate the subscription
5. Make the payment failure path blocking instead of silent

All of these are additive changes — nothing in the current schema or code needs to be torn out.

