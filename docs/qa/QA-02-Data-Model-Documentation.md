# QA-02: Data Model Documentation

| Document ID | QA-02 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Tables | 50+ |

---

## Core Tables Summary

| Table | Module | RLS | Description |
|-------|--------|-----|-------------|
| solution_providers | MOD-002 | Yes | Provider profiles |
| provider_industry_enrollments | MOD-002 | Yes | Multi-industry enrollments |
| proof_points | MOD-007 | Yes | Evidence documents |
| assessment_attempts | MOD-008 | Yes | Assessment records |
| interview_bookings | MOD-010 | Yes | Interview scheduling |
| panel_reviewers | MOD-011 | Yes | Reviewer profiles |
| pulse_content | MOD-013 | Yes | Social content |
| pulse_provider_stats | MOD-015 | Yes | Gamification stats |
| pulse_cards | MOD-016 | Yes | Wiki cards |

## Key Relationships

```text
auth.users (1) ──► (1) solution_providers ──► (N) provider_industry_enrollments
                                           ──► (N) proof_points
                                           ──► (N) assessment_attempts
                                           ──► (N) pulse_content
                                           ──► (1) pulse_provider_stats

industry_segments ──► proficiency_areas ──► sub_domains ──► specialities

interview_bookings ──► booking_reviewers ──► panel_reviewers
                   ──► interview_evaluations ──► interview_question_responses
```

## Audit Fields (All Tables)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| created_at | TIMESTAMPTZ | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NULL | Last modification |
| created_by | UUID | NULL | Creator user ID |
| updated_by | UUID | NULL | Last modifier ID |

## Soft Delete Pattern

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| is_deleted | BOOLEAN | false | Soft delete flag |
| deleted_at | TIMESTAMPTZ | NULL | Deletion timestamp |
| deleted_by | UUID | NULL | Deleter user ID |

---

*See full database schema in Supabase types file*

**Document End - QA-02**
