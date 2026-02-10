

# Add Log Out Option to Registration Wizard Header

## Change

Update `src/components/layouts/RegistrationWizardLayout.tsx` to add a "Log out" button/link in the header area, next to the existing "Already have an account? Sign in" link.

## Details

- Import `useOptionalAuth` from `@/hooks/useAuth` (the optional variant that won't throw if AuthProvider is missing during early registration steps)
- If a user session exists (i.e., they're logged in while on the registration flow), show a "Log out" button
- If no session, continue showing the existing "Already have an account? Sign in" link
- The Log out action calls `signOut()` and redirects to `/login`
- Styling: simple text link matching the existing muted-foreground style, with a `LogOut` icon from lucide-react
- Both links can be shown together separated by a divider, so the user can either sign in to an existing account or log out of the current session

## Visual Result

```
Registration                          Log out  |  Already have an account? Sign in
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/layouts/RegistrationWizardLayout.tsx` | Import `useOptionalAuth`, add conditional Log out button in header |

