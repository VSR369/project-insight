# QA-09: End-to-End Workflows

| Document ID | QA-09 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Workflows | 15 |

---

## E2E Workflow Index

| ID | Workflow | Steps | Critical Path |
|----|----------|-------|---------------|
| E2E-001 | Provider Registration to Certification | 12 | Yes |
| E2E-002 | Assessment Flow | 5 | Yes |
| E2E-003 | Interview Scheduling | 4 | Yes |
| E2E-004 | Reviewer Evaluation | 6 | Yes |
| E2E-005 | Pulse Content Creation | 4 | No |
| E2E-006 | PulseCard Collaboration | 5 | No |

---

## E2E-001: Provider Registration to Certification

```text
Step 1: Register → status=registered (rank 15)
Step 2: Select Mode → status=mode_selected (rank 30)
Step 3: [If Employee] Org Info → status=org_validated (rank 40)
Step 4: Select Expertise → status=expertise_selected (rank 50)
Step 5: Add Proof Points → status=proof_points_min_met (rank 70)
Step 6: Start Assessment → status=assessment_in_progress (rank 100)
        [CONFIGURATION LOCKED]
Step 7: Submit Assessment → status=assessment_passed (rank 110)
Step 8: Schedule Interview → status=panel_scheduled (rank 120)
Step 9: Complete Interview → status=panel_completed (rank 130)
Step 10: Calculate Composite Score
Step 11: Determine Outcome (0-3 stars)
Step 12: Set Final Status → status=certified/verified (rank 140-150)
         [EVERYTHING FROZEN]
```

---

## E2E-002: Assessment Flow

```text
Precondition: lifecycle_rank >= 70

Step 1: Check canStartAssessment()
Step 2: Call startAssessment() → Creates attempt, sets rank=100
Step 3: Display 20 questions, start 60-min timer
Step 4: User answers questions
Step 5: Submit or timeout → Calculate score
        IF score >= 70%: rank=110 (passed)
        IF score < 70%: rank=105 (completed)
```

---

## E2E-003: Interview Scheduling

```text
Precondition: lifecycle_rank >= 110

Step 1: Fetch available composite slots
Step 2: User selects slot
Step 3: book_interview_slot() RPC
        - Validates no conflicts
        - Selects reviewers (weighted algorithm)
        - Creates booking
Step 4: Lifecycle → rank=120 (panel_scheduled)
```

---

*See state machines in QA-06 for detailed transitions*

**Document End - QA-09**
