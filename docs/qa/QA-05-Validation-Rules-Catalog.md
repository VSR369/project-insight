# QA-05: Validation Rules Catalog

| Document ID | QA-05 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Rules | 100+ |

---

## 1. Document Purpose

This document catalogs all validation rules extracted from the codebase, including Zod schemas, database constraints, and business validations.

---

## 2. Validation Rules Index

| Category | Count | Source |
|----------|-------|--------|
| Registration Fields | 10 | Zod schemas |
| Proof Points | 15 | Zod + DB constraints |
| Assessment | 8 | Service validations |
| Interview | 10 | DB constraints |
| Pulse Content | 20 | Zod + Constants |
| PulseCards | 10 | Constants |
| Master Data | 30 | Zod schemas |
| **TOTAL** | **100+** | |

---

## 3. Registration Validation Rules

### VR-REG-001: First Name

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-001 |
| **Field** | first_name |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 1 |
| **Max Length** | 50 |
| **Pattern** | None |
| **Error Message** | "First name is required" |

---

### VR-REG-002: Last Name

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-002 |
| **Field** | last_name |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 1 |
| **Max Length** | 50 |
| **Pattern** | None |
| **Error Message** | "Last name is required" |

---

### VR-REG-003: Email

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-003 |
| **Field** | email |
| **Type** | string |
| **Required** | Yes |
| **Pattern** | Valid email format |
| **Unique** | Yes (across auth.users) |
| **Error Messages** | "Please enter a valid email", "This email is already registered" |

---

### VR-REG-004: Password

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-004 |
| **Field** | password |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 8 |
| **Error Message** | "Password must be at least 8 characters" |

---

### VR-REG-005: Address

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-005 |
| **Field** | address |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 1 |
| **Max Length** | 200 |
| **Error Message** | "Address is required" |

---

### VR-REG-006: PIN Code (Country-Specific)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-006 |
| **Field** | pin_code |
| **Type** | string |
| **Required** | Yes |
| **Patterns** | See below |

**Country-Specific Patterns:**

| Country | Pattern | Example | Error Message |
|---------|---------|---------|---------------|
| IN | `^[1-9][0-9]{5}$` | 400001 | "Indian pin code must be 6 digits and cannot start with 0" |
| US | `^\d{5}(-\d{4})?$` | 12345 | "US zip code must be 5 digits or 5+4 format" |
| GB | `^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$` | SW1A 1AA | "Please enter a valid UK postcode" |
| DEFAULT | `^[A-Za-z0-9\s-]{3,20}$` | - | "Please enter a valid postal code" |

---

### VR-REG-007: Country ID

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-007 |
| **Field** | country_id |
| **Type** | UUID |
| **Required** | Yes |
| **Foreign Key** | countries.id |
| **Error Message** | "Please select a country" |

---

### VR-REG-008: Industry Segment ID

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-REG-008 |
| **Field** | industry_segment_id |
| **Type** | UUID |
| **Required** | Yes |
| **Foreign Key** | industry_segments.id |
| **Error Message** | "Please select an industry" |

---

## 4. Proof Points Validation Rules

### VR-PP-001: Title

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-001 |
| **Field** | title |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 1 |
| **Max Length** | 200 |
| **Error Message** | "Title is required" |

---

### VR-PP-002: Description

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-002 |
| **Field** | description |
| **Type** | string |
| **Required** | Yes |
| **Min Length** | 10 |
| **Max Length** | 2000 |
| **Error Message** | "Description must be at least 10 characters" |

---

### VR-PP-003: Category

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-003 |
| **Field** | category |
| **Type** | enum |
| **Required** | Yes |
| **Valid Values** | 'general', 'specialty_specific' |
| **Error Message** | "Invalid category" |

---

### VR-PP-004: Type

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-004 |
| **Field** | type |
| **Type** | enum |
| **Required** | Yes |
| **Valid Values** | 'client_project', 'certification', 'publication', 'patent', 'speaking_engagement', 'open_source', 'award', 'case_study', 'training_delivered', 'tool_created' |
| **Error Message** | "Invalid proof point type" |

---

### VR-PP-005: Specialty Tags Requirement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-005 |
| **Condition** | category = 'specialty_specific' |
| **Requirement** | At least 1 speciality tag |
| **Error Message** | "Specialty-specific proof points require at least one speciality tag" |

---

### VR-PP-006: Link URL

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-006 |
| **Field** | link.url |
| **Type** | string |
| **Pattern** | Valid URL format |
| **Max Length** | 500 |
| **Error Message** | "Please enter a valid URL" |

---

### VR-PP-007: Relevance Rating (Reviewer)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-007 |
| **Field** | review_relevance_rating |
| **Type** | enum |
| **Required** | Yes (for review) |
| **Valid Values** | 'high', 'medium', 'low' |
| **Error Message** | "Relevance rating is required" |

---

### VR-PP-008: Score Rating (Reviewer)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PP-008 |
| **Field** | review_score_rating |
| **Type** | number |
| **Required** | Yes (for review) |
| **Min** | 0 |
| **Max** | 10 |
| **Step** | 0.5 |
| **Error Message** | "Score must be between 0 and 10" |

---

## 5. Assessment Validation Rules

### VR-AS-001: Minimum Rank to Start

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-AS-001 |
| **Validation** | lifecycle_rank >= 70 |
| **Error Message** | "Complete your proof points before starting the assessment" |

---

### VR-AS-002: Not Already In Progress

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-AS-002 |
| **Validation** | lifecycle_rank < 100 |
| **Error Message** | "Assessment already in progress or completed" |

---

### VR-AS-003: No Active Attempt

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-AS-003 |
| **Validation** | No unexpired attempt with submitted_at = NULL |
| **Error Message** | "You have an active assessment in progress" |

---

### VR-AS-004: Answer Selection

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-AS-004 |
| **Field** | selected_option |
| **Type** | number |
| **Valid Values** | 1, 2, 3, 4 (based on question options) |
| **Error Message** | "Please select an answer" |

---

### VR-AS-005: Time Limit

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-AS-005 |
| **Validation** | current_time < started_at + time_limit_minutes |
| **Action** | Auto-submit on expiry |

---

## 6. Interview Validation Rules

### VR-INT-001: Enrollment Rank for Booking

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-INT-001 |
| **Validation** | lifecycle_rank >= 110 |
| **Error Message** | "Assessment must be passed before scheduling interview" |

---

### VR-INT-002: No Existing Active Booking

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-INT-002 |
| **Validation** | No active booking for this enrollment |
| **Error Message** | "You already have an active booking for this enrollment" |

---

### VR-INT-003: Time Conflict Check

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-INT-003 |
| **Validation** | No overlapping bookings at same time |
| **Error Message** | "You already have an interview scheduled at this time" |

---

### VR-INT-004: Quorum Met

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-INT-004 |
| **Validation** | Available reviewers >= required quorum |
| **Error Message** | "Only X of Y required reviewers are available. Please select another slot." |

---

### VR-INT-005: Question Rating

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-INT-005 |
| **Field** | rating |
| **Type** | enum |
| **Valid Values** | 'right', 'wrong', 'not_answered' |
| **Required** | Yes (before submission) |

---

## 7. Pulse Content Validation Rules

### VR-PLS-001: Content Type

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-001 |
| **Field** | content_type |
| **Type** | enum |
| **Required** | Yes |
| **Valid Values** | 'reel', 'podcast', 'spark', 'article', 'gallery', 'post' |

---

### VR-PLS-002: Headline (Spark)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-002 |
| **Field** | headline |
| **Applies To** | content_type = 'spark' |
| **Required** | Yes |
| **Max Length** | 150 |

---

### VR-PLS-003: Body Text

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-003 |
| **Field** | body_text |
| **Type** | string |
| **Max Length** | 10000 (article), 3000 (post) |

---

### VR-PLS-004: Video Duration (Reel)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-004 |
| **Field** | duration_seconds |
| **Applies To** | content_type = 'reel' |
| **Max** | 180 seconds (3 minutes) |
| **Error Message** | "Reels must be 3 minutes or less" |

---

### VR-PLS-005: Audio Duration (Podcast)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-005 |
| **Field** | duration_seconds |
| **Applies To** | content_type = 'podcast' |
| **Max** | 3600 seconds (60 minutes) |
| **Error Message** | "Podcasts must be 60 minutes or less" |

---

### VR-PLS-006: Video/Audio File Size

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-006 |
| **Field** | file size |
| **Max** | 500 MB (524,288,000 bytes) |
| **Error Message** | "File must be 500MB or less" |

---

### VR-PLS-007: Gallery Image Size

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-007 |
| **Field** | image file size |
| **Max** | 50 MB (52,428,800 bytes) |

---

### VR-PLS-008: Gallery Image Count

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-008 |
| **Field** | gallery images |
| **Max** | 10 images |
| **Error Message** | "Maximum 10 images per gallery" |

---

### VR-PLS-009: Rate Limit - Hourly

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-009 |
| **Validation** | Max 5 content creations per hour |
| **Error Message** | "Rate limit exceeded. Try again later." |

---

### VR-PLS-010: Rate Limit - Daily

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PLS-010 |
| **Validation** | Max 20 content creations per day |
| **Error Message** | "Daily content limit reached" |

---

## 8. PulseCards Validation Rules

### VR-PC-001: Card Content Length

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-001 |
| **Field** | content |
| **Max Length** | 280 characters |
| **Error Message** | "Content must be 280 characters or less" |

---

### VR-PC-002: Reputation to Start Card

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-002 |
| **Validation** | reputation >= 0 (currently 0, will increase to 50) |
| **Error Message** | "You need 50 reputation to start cards" |

---

### VR-PC-003: Reputation to Build

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-003 |
| **Validation** | reputation >= 0 (currently 0, will increase to 200) |
| **Error Message** | "You need 200 reputation to build on cards" |

---

### VR-PC-004: Layer Count Limit

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-004 |
| **Validation** | layers per card <= 100 |
| **Error Message** | "Maximum layers reached for this card" |

---

### VR-PC-005: One Vote Per Layer

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-005 |
| **Validation** | Only one vote per user per layer |
| **Error Message** | "You have already voted on this layer" |

---

### VR-PC-006: Media File Size

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-PC-006 |
| **Field** | media file |
| **Max** | 50 MB |

---

## 9. Master Data Validation Rules

### VR-MD-001: Name Field (Generic)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-MD-001 |
| **Field** | name |
| **Required** | Yes |
| **Min Length** | 1 |
| **Max Length** | 100 |
| **Pattern** | `^[a-zA-Z0-9\s\-_]+$` |
| **Error Message** | "Name is required" |

---

### VR-MD-002: Display Order

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-MD-002 |
| **Field** | display_order |
| **Type** | integer |
| **Min** | 0 |
| **Default** | 0 |

---

### VR-MD-003: Is Active

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-MD-003 |
| **Field** | is_active |
| **Type** | boolean |
| **Default** | true |

---

### VR-MD-004: Description

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-MD-004 |
| **Field** | description |
| **Type** | string |
| **Max Length** | 500 |
| **Required** | No |

---

### VR-MD-005: Code Field (Unique)

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-MD-005 |
| **Field** | code |
| **Type** | string |
| **Required** | Yes (where applicable) |
| **Unique** | Yes |
| **Pattern** | Uppercase alphanumeric |

---

## 10. Database Constraint Validations

### VR-DB-001: UUID Format

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-DB-001 |
| **Applies To** | All id and *_id columns |
| **Format** | UUID v4 |
| **Default** | gen_random_uuid() |

---

### VR-DB-002: Timestamp Format

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-DB-002 |
| **Applies To** | All *_at columns |
| **Format** | TIMESTAMPTZ (ISO 8601) |
| **Default** | NOW() (for created_at) |

---

### VR-DB-003: Foreign Key Integrity

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-DB-003 |
| **Validation** | Referenced record must exist |
| **Error** | "foreign key constraint violation" |

---

### VR-DB-004: Not Null Constraints

| Attribute | Value |
|-----------|-------|
| **Rule ID** | VR-DB-004 |
| **Applies To** | Required fields |
| **Error** | "null value in column violates not-null constraint" |

---

## 11. Traceability

| Validation Rule | Business Rule | Test Cases |
|-----------------|---------------|------------|
| VR-REG-001 to VR-REG-008 | BR-REG-001, BR-REG-002 | TC-VAL-001 to TC-VAL-010 |
| VR-PP-001 to VR-PP-008 | BR-PP-001 to BR-PP-005 | TC-VAL-011 to TC-VAL-020 |
| VR-AS-001 to VR-AS-005 | BR-AS-001 to BR-AS-008 | TC-VAL-021 to TC-VAL-030 |
| VR-INT-001 to VR-INT-005 | BR-IS-001 to BR-IS-005 | TC-VAL-031 to TC-VAL-040 |
| VR-PLS-001 to VR-PLS-010 | BR-PS-001, BR-PS-006, BR-PS-007 | TC-VAL-041 to TC-VAL-060 |
| VR-PC-001 to VR-PC-006 | BR-PC-001 to BR-PC-004 | TC-VAL-061 to TC-VAL-070 |

---

**Document End - QA-05**
