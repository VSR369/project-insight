
# Plan: Industry-Specific Topic System for Pulse Cards

## Overview
Replace the ad-hoc generic topics with industry-segment-linked topics. Show only topics relevant to the provider's enrolled industry segments, plus a "General" topic for cross-industry knowledge sharing.

## Current State Analysis

### Current Topics (ad-hoc/generic)
- 10 generic topics: AI & ML, Business Strategy, DevOps, etc.
- All have `industry_segment_id = NULL`
- Not connected to provider's actual industry expertise

### Industry Segments Available
| Industry | ID |
|----------|-----|
| Technology | ffb4ba70-affe-4558-853d-3a1b27444210 |
| Technology (India IT Services) | b1a248ce-15b9-4733-a035-a904a786fe30 |
| Healthcare | 41ee5438-f270-488c-aae1-b46c120bc276 |
| Finance | 853821a3-5c45-42cf-b035-3f8609e025dc |
| Manufacturing (Auto Components) | a333531e-8a60-4682-87df-a9fdc617a232 |
| Retail | 297e445b-4583-49b8-a0ec-d0916b50b977 |
| Education | 07ec4ff5-4e92-45e4-b949-2f38683f537b |
| Consulting | 357558fe-56d0-4bb7-a6f8-21d5ac109fc6 |
| Energy | 70ef723b-381e-488e-9aa8-628af68dac10 |

## Proposed Solution

### 1. New Topic Structure

#### A) General Topic (visible to all)
- `industry_segment_id = NULL`
- For cross-industry knowledge (leadership, productivity, career tips)

#### B) Industry-Specific Topics
Each industry segment gets 2-3 relevant topics linked via `industry_segment_id`.

| Industry | Topics |
|----------|--------|
| General | 🌍 General Knowledge |
| Technology | 💻 Software Engineering, 🤖 AI & Automation, ☁️ Cloud & DevOps |
| Healthcare | 🏥 Clinical Practice, 💊 Pharma & Life Sciences, 🔬 Medical Research |
| Finance | 📈 Investment & Markets, 🏦 Banking Operations, 📊 Risk & Compliance |
| Manufacturing | ⚙️ Production & Quality, 🔧 Supply Chain, 🏭 Lean Manufacturing |
| Retail | 🛒 E-commerce, 📦 Inventory Management, 🎯 Customer Experience |
| Education | 📚 Pedagogy & Learning, 💡 EdTech Innovation, 🎓 Curriculum Design |
| Consulting | 📋 Strategy & Advisory, 🤝 Client Engagement, 📊 Business Analysis |
| Energy | ⚡ Power Generation, 🌱 Renewables & Sustainability, 🛢️ Oil & Gas |

### 2. Data Changes

#### Step 1: Delete existing ad-hoc topics
```sql
DELETE FROM pulse_card_topics;
```

#### Step 2: Insert new structured topics
Insert ~28 topics:
- 1 General topic (NULL industry)
- 3 topics per industry segment (9 industries × 3 = 27)

### 3. Code Changes

#### A) `usePulseCardTopics.ts` - Add provider filtering
Create a new hook `usePulseCardTopicsForProvider` that:
1. Takes provider's enrolled industry segment IDs
2. Returns topics where:
   - `industry_segment_id IS NULL` (General), OR
   - `industry_segment_id IN (provider's enrolled segments)`

```typescript
export function usePulseCardTopicsForProvider(industrySegmentIds: string[]) {
  return useQuery({
    queryKey: ['pulse-card-topics-for-provider', industrySegmentIds],
    queryFn: async () => {
      // Fetch topics matching provider's industries OR general
      const { data, error } = await supabase
        .from('pulse_card_topics')
        .select(`*, industry_segment:industry_segments(id, name)`)
        .eq('is_active', true)
        .or(`industry_segment_id.is.null,industry_segment_id.in.(${industrySegmentIds.join(',')})`)
        .order('display_order');
      // ...
    },
  });
}
```

#### B) `TopicSelector.tsx` - Use enrollment context
1. Import `useEnrollmentContext` or `useProviderEnrollments`
2. Get provider's enrolled industry segment IDs
3. Pass to new hook to filter topics

#### C) `CreateCardDialog.tsx` - Pass enrollment context
1. Get provider's enrollments
2. Extract industry segment IDs
3. Pass to TopicSelector

### 4. UX Flow

When provider opens Create Card dialog:
1. System reads provider's enrolled industries (e.g., Technology, Healthcare)
2. TopicSelector shows:
   - 🌍 **General** (always visible)
   - 💻 Software Engineering (Technology)
   - 🤖 AI & Automation (Technology)
   - ☁️ Cloud & DevOps (Technology)
   - 🏥 Clinical Practice (Healthcare)
   - 💊 Pharma & Life Sciences (Healthcare)
   - 🔬 Medical Research (Healthcare)
3. Provider with single enrollment sees ~4 topics (1 General + 3 Industry)
4. Provider with multiple enrollments sees more topic variety

### 5. Visual Grouping (Optional Enhancement)
Group topics by industry segment:
```
General
  🌍 General Knowledge

Technology
  💻 Software Engineering
  🤖 AI & Automation
  ☁️ Cloud & DevOps

Healthcare
  🏥 Clinical Practice
  ...
```

## Files to Modify

| File | Change |
|------|--------|
| `pulse_card_topics` table | Delete existing, insert new structured data |
| `src/hooks/queries/usePulseCardTopics.ts` | Add `usePulseCardTopicsForProvider()` hook |
| `src/components/pulse/cards/TopicSelector.tsx` | Use enrollment context to filter topics |
| `src/components/pulse/cards/CreateCardDialog.tsx` | Pass provider enrollments to TopicSelector |

## Implementation Sequence

1. **Database**: Delete old topics, insert new industry-linked topics
2. **Hook**: Create `usePulseCardTopicsForProvider()` with filtering logic
3. **TopicSelector**: Update to use enrollment context and new hook
4. **CreateCardDialog**: Ensure provider enrollments are available to TopicSelector
5. **Test**: Verify topics filter correctly per provider's enrollments

## Benefits
- Topics are contextually relevant to provider's expertise
- Clean, organized topic structure
- General topic allows cross-industry sharing
- Scalable pattern for adding new industries
- Respects multi-enrollment architecture
