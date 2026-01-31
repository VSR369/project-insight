
# Industry Pulse Social Channel Test Implementation Plan

## Overview

Create a comprehensive test suite for the Industry Pulse social networking features, following the existing `RegressionTestPage` pattern. This will include:

- A new **"Social Channel Test"** menu item in Admin Sidebar
- A test dashboard displaying real-time results with statistics
- Test cases covering all social interactions (content, engagements, comments, follows, leaderboards, XP/points)
- Multi-solution provider scenarios

---

## Architecture

### Layered Structure (Following Existing Pattern)

```text
┌─────────────────────────────────────────────────────────────┐
│                   Admin Sidebar (Menu)                       │
│                   + "Social Channel Test"                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│               PulseSocialTestPage.tsx                        │
│  - Dashboard layout with stats cards                         │
│  - Progress bar and controls                                 │
│  - Execution log viewer                                      │
│  - Accordion test categories                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            usePulseSocialTestRunner.ts                       │
│  - State management (isRunning, progress, results)           │
│  - runAllTests, runCategoryTests, cancelTests, reset         │
│  - Export functionality                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│            pulseSocialTestRunner.ts                          │
│  - Test category definitions                                 │
│  - Individual test case implementations                      │
│  - Supabase query-based validations                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Categories (Based on Specification + Platform Alignment)

### Category 1: Content Creation Tests (CC-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| CC-001 | Create post content | Verify post creation and storage | Insert into pulse_content, verify data |
| CC-002 | Create spark content | Verify Knowledge Spark creation | Insert with content_type='spark' |
| CC-003 | Create article content | Verify article with body_text | Insert with content_type='article' |
| CC-004 | Publish content | Verify status transition to 'published' | Update content_status, check XP awarded |
| CC-005 | Archive content | Verify archival functionality | Update to 'archived' status |
| CC-006 | Delete content (soft) | Verify soft delete with is_deleted flag | Update is_deleted, deleted_at |

### Category 2: Engagement Tests (EN-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| EN-001 | Fire reaction toggle | Verify fire engagement creates/removes | Toggle engagement, check count update |
| EN-002 | Gold award toggle | Verify gold engagement with XP | Toggle, verify XP awarded to creator |
| EN-003 | Save engagement toggle | Verify save functionality | Toggle save, check count |
| EN-004 | Bookmark engagement | Verify private bookmark (no count) | Toggle bookmark, verify no public count |
| EN-005 | Self-engagement blocked | Verify cannot fire/gold own content | Attempt self-engagement, expect rejection |
| EN-006 | Engagement persistence | Verify engagements survive refresh | Create engagement, refetch, verify exists |

### Category 3: Comments & Replies Tests (CM-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| CM-001 | Add top-level comment | Verify comment creation | Insert comment, verify storage |
| CM-002 | Add nested reply | Verify reply with parent_comment_id | Insert with parent_id, verify hierarchy |
| CM-003 | Delete own comment | Verify soft delete of comment | Update is_deleted, verify hidden |
| CM-004 | Comment count updates | Verify content comment_count field | Add comment, check count increment |

### Category 4: Follow/Connection Tests (FL-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| FL-001 | Follow provider | Verify connection creation | Insert into pulse_connections |
| FL-002 | Unfollow provider | Verify connection removal | Delete connection, verify removed |
| FL-003 | Self-follow blocked | Verify cannot follow self | Attempt self-follow, expect constraint failure |
| FL-004 | Follower count accuracy | Verify follower list query | Follow, query followers, verify count |

### Category 5: XP & Gamification Tests (XP-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| XP-001 | XP awarded on publish | Verify content XP award | Publish content, check total_xp increase |
| XP-002 | Level calculation | Verify level formula | Check pulse_calculate_level function |
| XP-003 | Streak multiplier | Verify streak bonus calculation | Test getStreakMultiplier function |
| XP-004 | Provider stats exist | Verify stats record creation | Query pulse_provider_stats |

### Category 6: Leaderboard Tests (LB-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| LB-001 | Global leaderboard query | Verify ranked list returns | Query leaderboard, check ordering |
| LB-002 | Weekly leaderboard | Verify XP delta calculation | Query weekly, check xp_change field |
| LB-003 | Rank change tracking | Verify rank_change calculation | Check movement indicator |

### Category 7: Feed & Content Discovery Tests (FD-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| FD-001 | Feed query returns data | Verify published content in feed | Query pulse_content with status filter |
| FD-002 | Content type filter | Verify type filtering works | Query with contentType param |
| FD-003 | Industry filter | Verify industry segment filtering | Query with industrySegmentId |
| FD-004 | Provider content filter | Verify provider_id filtering | Query with providerId |

### Category 8: Multi-Provider Scenarios (MP-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| MP-001 | Multiple providers exist | Verify >1 provider in system | Count solution_providers |
| MP-002 | Cross-provider engagement | Verify engagement between providers | Provider A engages Provider B content |
| MP-003 | Follow between providers | Verify connection between providers | Provider A follows Provider B |
| MP-004 | Provider isolation | Verify content ownership | Query own content vs all content |

### Category 9: Notification Tests (NT-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| NT-001 | Notification query | Verify notifications fetch | Query pulse_notifications |
| NT-002 | Unread count accuracy | Verify is_read filter count | Count where is_read=false |
| NT-003 | Mark notification read | Verify read state update | Update is_read, verify change |

### Category 10: Security & RLS Tests (SR-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| SR-001 | RLS on pulse_content | Verify published content visible | Query as authenticated user |
| SR-002 | RLS on engagements | Verify own engagements accessible | Query engagements |
| SR-003 | RLS on connections | Verify connections queryable | Query pulse_connections |

### Category 11: Pulse Cards Tests (PC-xxx)
| ID | Test Name | Description | Implementation |
|----|-----------|-------------|----------------|
| PC-001 | Card topics query | Verify topic listing | Query pulse_card_topics |
| PC-002 | Cards query | Verify card listing | Query pulse_cards |
| PC-003 | Card layers query | Verify layer retrieval | Query pulse_card_layers |
| PC-004 | Reputation calculation | Verify reputation points | Call pulse_cards_get_reputation |

---

## Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/services/pulseSocialTestRunner.ts` | Test case definitions and runner logic |
| `src/hooks/usePulseSocialTestRunner.ts` | React hook for state management |
| `src/pages/admin/PulseSocialTestPage.tsx` | Dashboard UI with stats and controls |

## Files to Modify

| File Path | Changes |
|-----------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Social Channel Test" menu item |
| `src/App.tsx` | Add route for `/admin/pulse-social-test` |

---

## Technical Implementation Details

### Test Runner Service Pattern

```typescript
// pulseSocialTestRunner.ts structure
export interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  run: () => Promise<TestResult>;
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
}

// Helper for test execution with timing
async function runTest(testFn: () => Promise<void>): Promise<TestResult> {
  const start = performance.now();
  try {
    await testFn();
    return { status: "pass", duration: Math.round(performance.now() - start) };
  } catch (error) {
    // Handle SKIP: prefix for skipped tests
    // Otherwise mark as fail
  }
}
```

### Dashboard Statistics

The dashboard will display:
- **5 Summary Cards**: Total Tests, Passed, Failed, Skipped, Remaining
- **Progress Bar**: Real-time progress with current test name
- **Execution Log**: Scrollable log with color-coded entries
- **Accordion Categories**: Expandable sections with test tables

### Menu Integration

Add to Admin Sidebar "Other" section:
```typescript
{ title: 'Social Channel Test', icon: Activity, path: '/admin/pulse-social-test' }
```

---

## Test Data Considerations

### Prerequisites
- Current user must be authenticated
- User should have a `solution_providers` record
- At least one `provider_industry_enrollment` should exist

### Test Isolation
- Tests that create data will use dedicated test markers where possible
- Cleanup is handled by soft-delete patterns
- Tests marked as "SKIP:" if prerequisites not met

### Multi-Provider Testing
- Will query for additional providers in the system
- If only one provider exists, multi-provider tests skip gracefully
- Cross-provider tests verify engagement/follow between different users

---

## Success Metrics

After implementation:
1. **Menu item visible** in Admin Sidebar under "Other"
2. **Dashboard loads** with all 11 test categories
3. **"Run All Tests"** executes all ~45 tests sequentially
4. **Real-time progress** updates during execution
5. **Pass/Fail/Skip** badges display correctly
6. **Export** generates downloadable JSON report
7. **Category runs** allow running subset of tests

---

## Estimated Test Count

| Category | Test Count |
|----------|------------|
| Content Creation | 6 |
| Engagements | 6 |
| Comments | 4 |
| Follow/Connections | 4 |
| XP & Gamification | 4 |
| Leaderboards | 3 |
| Feed & Discovery | 4 |
| Multi-Provider | 4 |
| Notifications | 3 |
| Security & RLS | 3 |
| Pulse Cards | 4 |
| **Total** | **45** |

