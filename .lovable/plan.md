

# Plan: Role-Appropriate Success Message After Intake Submission

## Problem
After AM or RQ submits their intake, the toast just says "Solution Request submitted successfully" — it doesn't tell them what happens next or who will handle it. The AM/RQ should see a message indicating the challenge has been sent to the Challenge Creator/Architect for further action, with wording appropriate to the engagement model.

## Changes

### File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

**1. Update `onSuccess` in `useSubmitSolutionRequest`** to use the `variables` parameter (2nd arg) to access `operatingModel` and show model-specific toast:

- **MP model**: `"Solution Request submitted — sent to Challenge Architect for Spec Review"`
- **AGG model**: `"Solution Request submitted — sent to Challenge Creator for Spec Review"`

```typescript
onSuccess: (_data, variables) => {
  const role = variables.operatingModel === 'MP'
    ? 'Challenge Architect'
    : 'Challenge Creator';
  toast.success(`Solution Request submitted — sent to ${role} for Spec Review`);
  // ... invalidations unchanged
},
```

**2. Update `onSuccess` in `useSaveDraft`** — keep the existing "Draft saved successfully" message (drafts don't route anywhere).

### No other files need changes
The toast is centralized in the mutation hook — all callers (SimpleIntakeForm, CogniSubmitRequestPage, NewSolutionRequestPage, ConversationalIntakePage, ChallengeWizardPage) inherit the updated message automatically.

