# QA-08: API Documentation

| Document ID | QA-08 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Operations | 150+ |

---

## API Operations by Module

### MOD-002: Enrollment
- `useProvider()` - Fetch provider profile
- `useProviderEnrollments()` - List enrollments
- `useCreateEnrollment()` - Create enrollment
- `useUpdateEnrollment()` - Update enrollment

### MOD-007: Proof Points
- `useProofPoints(providerId)` - List proof points
- `useCreateProofPoint()` - Create proof point
- `useUpdateProofPoint()` - Update proof point
- `useDeleteProofPoint()` - Soft delete

### MOD-008: Assessment
- `canStartAssessment(providerId, enrollmentId)` - Check eligibility
- `startAssessment(input)` - Create attempt
- `submitAssessment(attemptId)` - Calculate score
- `useAssessmentResults(attemptId)` - Get results

### MOD-010: Interview
- `useAvailableSlots(enrollmentId)` - List slots
- `book_interview_slot()` - RPC function
- `cancel_interview_booking()` - RPC function

### MOD-013: Pulse Content
- `usePulseFeed(filters)` - Feed with polling
- `useCreatePulseContent()` - Create content
- `usePublishPulseContent()` - Publish draft
- `useDeletePulseContent()` - Soft delete

### MOD-015: Pulse Stats
- `usePulseStats(providerId)` - Get XP/level
- `pulse_award_xp()` - DB function
- `pulse_update_streak()` - DB function

---

*See hooks in src/hooks/queries/ for full implementation*

**Document End - QA-08**
