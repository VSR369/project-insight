

## Answers to Your Two Questions

### Question 1: How is a Seeker Organization uniquely identified?

**Two-layer uniqueness enforcement exists today:**

| Layer | Mechanism | What It Does |
|---|---|---|
| **Database (hard constraint)** | `UNIQUE INDEX idx_seeker_orgs_unique_name_country ON (LOWER(organization_name), hq_country_id) WHERE is_deleted = false` | Prevents two active organizations with the **same name in the same country**. Case-insensitive. Soft-deleted orgs are excluded. |
| **Advisory (soft check)** | `check_duplicate_organization()` RPC + trigram similarity index (`gin_trgm_ops`) | Warns the user via the `DuplicateOrgModal` if a **similar** name (>40% similarity) exists in the same country. User can choose to proceed anyway. |

So the composite natural key is: **`LOWER(organization_name) + hq_country_id`** for active (non-deleted) records.

This means:
- "Acme Corp" in **USA** and "Acme Corp" in **UK** are two different valid organizations
- "Acme Corp" and "ACME CORP" in the **same country** are considered duplicates (case-insensitive)
- A deleted "Acme Corp" in USA does not block a new "Acme Corp" in USA

---

### Question 2: Different organization, same email — what is the correct action?

**Current state:** The `create-org-admin` edge function calls `auth.admin.createUser()` which fails with "User already registered" because Supabase Auth enforces unique emails globally.

**The correct architectural answer:**

A single **person** (auth user) CAN legitimately be the admin of **multiple** organizations. The `org_users` table already supports this — it has a `UNIQUE(user_id, organization_id)` constraint, meaning the same `user_id` can appear in multiple rows with different `organization_id` values.

The correct flow is:

| Scenario | Action |
|---|---|
| Email is **new** | Create auth user + create `org_users` record (current behavior) |
| Email **exists**, user is NOT already mapped to THIS org | Skip auth user creation, look up existing `user_id`, create new `org_users` record mapping them as `tenant_admin` of the new org |
| Email **exists**, user IS already mapped to THIS org | Return error — "You are already registered with this organization" |

```text
create-org-admin logic:

1. Try createUser(email, password)
2. If success → userId = newUser.id → insert org_users → done
3. If "already registered":
   a. Look up existing user by email → userId
   b. Check org_users for (userId, organization_id)
      - If exists → return error "Already admin of this org"
      - If not → insert org_users(userId, organization_id, tenant_admin) → done
```

**Data integrity implications:**
- The auth user's password is NOT updated (they keep their existing password)
- The user gets a **new `org_users` row** linking them to the new organization as `tenant_admin`
- The `seeker_organizations` record is separate — a new org with its own `tenant_id`
- When the user logs in, they will need an **org-switcher** to choose which organization context to operate in (future requirement)

**This means the edge function fix should:**
1. Make user creation idempotent (handle "already registered" gracefully)
2. Check for duplicate `org_users` mapping before inserting
3. Return success with the existing `user_id` so the flow can proceed to the preview screen

No plan is needed here — these are architectural answers to your questions. When you are ready to implement, say so and I will present the implementation plan for the edge function fix + preview screen.

