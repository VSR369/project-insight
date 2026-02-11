

# Step-by-Step: Make Seeker Org Test Login Work

You don't need to write any code yourself. Just approve this plan and I will do everything for you:

## What I Will Do (Automatically)

### Step 1: Insert the database record
I will add a record to the database that connects the test user `seeker@test.local` to the "VSR" organization. This is like giving that user a membership card to the organization.

### Step 2: Update the Login page code
I will update the login page so that when someone clicks "Seeking Org", it:
- Checks if the user belongs to an organization
- Redirects them to the Organization dashboard (`/org/dashboard`) instead of the Provider screens

## What You Need To Do

**Nothing!** Just click the **Approve** button below. I will handle both the database insert and the code changes.

## After It's Done

1. Go to the login page
2. Click the "Seeking Org" test account button
3. You should land on the Organization dashboard instead of Provider screens

## Technical Details

| Change | Detail |
|--------|--------|
| Database | Insert 1 row into `org_users` linking user `50845a43-...` to org `48c85c00-...` with role `owner` |
| Code file | `src/pages/Login.tsx` -- add `org_users` query to login flow, update redirect logic |

