

# Industry Pulse Frontend Implementation - Complete Technical Specification

## Root Cause Analysis: Why Frontend Logic Was Missing

### 1. Gap Identification

After thorough codebase analysis, I identified the following architectural gaps:

| Gap Category | What Was Built | What Was Missing |
|-------------|----------------|------------------|
| **Data Layer** | ✅ 10+ React Query hooks (CRUD for content, engagements, social, stats) | ❌ File upload mutations, AI enhancement calls |
| **Routing** | ✅ 5 base pages (Feed, Sparks, Create, Ranks, Profile) | ❌ 4 detail pages (Content Detail, Search, Notifications, Other Profile) |
| **UI Components** | ✅ ContentCard, EngagementBar, CommentSection | ❌ Type-specific creators (ReelCreator, SparkBuilder, PodcastStudio, etc.) |
| **Content Creation** | ✅ Simple type selection + basic text form | ❌ Full-featured forms per content type with media upload, AI, validation |
| **Form Validation** | ❌ None - uses simple `content.trim()` check | ❌ Zod schemas per content type |
| **File Uploads** | ❌ Not implemented | ❌ Supabase Storage integration, client-side validation |

### 2. Why This Happened

1. **Phase-Based Development**: The initial implementation focused on database schema, hooks, and basic page structures. The detailed UI forms and type-specific logic were deferred to later phases.

2. **Missing Screen-Level Specs**: The technical memory documented DB schema and hook patterns but lacked detailed screen-by-screen UI/UX specifications.

3. **"Coming Soon" Placeholder Pattern**: The `PulseCreatePage.tsx` shows a TODO comment and toast message indicating the mutation was intentionally deferred.

### 3. Current State Summary

```text
EXISTING IMPLEMENTATION:
├── Hooks (✅ Complete)
│   ├── usePulseContent.ts - CRUD operations
│   ├── usePulseEngagements.ts - Fire/Gold/Save/Bookmark
│   ├── usePulseSocial.ts - Comments, Follows, Notifications
│   └── usePulseStats.ts - XP, Leaderboards, Tags
│
├── Components (⚠️ Partial)
│   ├── ContentCard.tsx - ✅ Complete
│   ├── EngagementBar.tsx - ✅ Complete
│   └── CommentSection.tsx - ✅ Complete (not wired)
│
├── Pages (⚠️ Partial)
│   ├── PulseFeedPage.tsx - ✅ Complete
│   ├── PulseSparksPage.tsx - ✅ Complete
│   ├── PulseRanksPage.tsx - ✅ Complete
│   ├── PulseProfilePage.tsx - ✅ Complete
│   └── PulseCreatePage.tsx - ⚠️ Basic form only
│
└── Missing Routes (❌ Not Created)
    ├── /pulse/content/:id - Detail view
    ├── /pulse/search - Search functionality
    ├── /pulse/notifications - Notification list
    └── /pulse/profile/:providerId - Other user profiles
```

---

## Phase 1: Knowledge Spark Builder (Screen 124)

### 1.1 Screen Purpose
Create visually-rich "Knowledge Spark" cards with statistics, trends, and live preview.

### 1.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| AI Assist Toggle | `ai_enhanced` | boolean | - |
| Industry Category | `industry_segment_id` | UUID | Required |
| Headline | `headline` | string | Required, max 50 chars |
| Key Insight | `key_insight` | string | Required, max 200 chars |
| Main Statistic | Stored in `key_insight` or extracted | JSON parsed | Optional, pattern: percentage/currency/count |
| Trend Indicator | Stored in `key_insight` suffix | string | Optional, e.g., "+23% vs Q3" |
| Source | Stored in `caption` | string | Optional |
| Visibility | `content_status` | enum | 'published' or 'draft' |

### 1.3 Component Structure

```text
src/components/pulse/creators/
├── SparkBuilder.tsx          # Main component
├── SparkLivePreview.tsx      # Right-side preview panel
├── IndustryCategorySelector.tsx  # Chip-style category picker
└── spark.validation.ts       # Zod schema
```

### 1.4 Validation Schema (Zod)

```typescript
const sparkSchema = z.object({
  industry_segment_id: z.string().uuid("Select an industry category"),
  headline: z.string()
    .min(1, "Headline is required")
    .max(50, "Headline must be 50 characters or less"),
  key_insight: z.string()
    .min(1, "Key insight is required")
    .max(200, "Key insight must be 200 characters or less"),
  main_statistic: z.string().max(20).optional(),
  trend_indicator: z.string().max(30).optional(),
  source: z.string().max(100).optional(),
  ai_assist: z.boolean().default(false),
});
```

### 1.5 UI/UX Rules

1. **Live Preview**: Updates in real-time as user types
2. **Character Counters**: Show "0/50 characters" format
3. **Pro Tip Banner**: "Use specific numbers and concrete data. Sparks with statistics get 3x more engagement"
4. **Color Theme**: Pink/magenta gradient based on selected industry
5. **Publish Button**: Disabled until headline + key_insight filled

### 1.6 AI Enhancement Flow

```text
User clicks "AI Assist" toggle ON
→ Debounce 1 second after typing stops
→ Call edge function: award-pulse-xp (with enhance flag)
→ Extract statistics from text (regex: percentages, currencies, counts)
→ Populate main_statistic and trend_indicator fields
→ Set ai_enhanced = true
```

### 1.7 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/SparkBuilder.tsx` | Create | Main form component |
| `src/components/pulse/creators/SparkLivePreview.tsx` | Create | Live preview panel |
| `src/components/pulse/creators/IndustryCategorySelector.tsx` | Create | Reusable industry picker |
| `src/lib/validations/spark.ts` | Create | Zod validation schema |
| `src/pages/pulse/PulseCreatePage.tsx` | Modify | Route to SparkBuilder for spark type |

---

## Phase 2: Create Reel Page (Screen 123)

### 2.1 Screen Purpose
Upload or record short-form video content with captions, tags, and visibility settings.

### 2.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| Video File | `media_urls` | JSON array | Required, max 100MB, MP4/MOV/AVI |
| Caption | `caption` | string | Optional, max 200 chars |
| Tags | `pulse_content_tags` (junction) | UUID[] | Optional, max 10 tags |
| Cover Image | `cover_image_url` | string | Auto-generated or uploaded |
| Visibility | `visibility` (stored in JSON) | enum | 'public' or 'connections' |

### 2.3 Component Structure

```text
src/components/pulse/creators/
├── ReelCreator.tsx           # Main component
├── VideoUploader.tsx         # Drag/drop + webcam recording
├── CoverImageSelector.tsx    # Auto-generated frames or upload
├── TagInput.tsx              # Tag search/add component
├── VisibilitySelector.tsx    # Public/Connections toggle
└── reel.validation.ts        # Zod schema
```

### 2.4 Validation Schema

```typescript
const reelSchema = z.object({
  video_file: z.instanceof(File)
    .refine(f => f.size <= 100 * 1024 * 1024, "Video must be under 100MB")
    .refine(f => ['video/mp4', 'video/quicktime', 'video/x-msvideo'].includes(f.type), 
      "Supported formats: MP4, MOV, AVI"),
  caption: z.string().max(200, "Caption must be 200 characters or less").optional(),
  tags: z.array(z.string().uuid()).max(10, "Maximum 10 tags allowed").optional(),
  cover_image: z.instanceof(File).optional(),
  visibility: z.enum(['public', 'connections']).default('public'),
});
```

### 2.5 UI/UX Rules

1. **Upload Zone**: Drag & drop with "or click to browse files"
2. **Webcam Option**: "Record Web Camera" button with permission prompt
3. **AI Enhance Caption**: Button with sparkle icon, calls AI endpoint
4. **Character Counter**: "0/200" below caption textarea
5. **Tag Input**: Autocomplete from `pulse_tags` table, "Add" button
6. **Status Footer**: "No video selected" / "video.mp4 selected"
7. **Publish Button**: Disabled until video uploaded

### 2.6 File Upload Flow

```text
User selects/drops video file
→ Client-side validation (size, format)
→ Show upload progress bar
→ Upload to Supabase Storage: pulse-media/{user_id}/reels/{timestamp}_{filename}
→ Extract first frame as cover image (via canvas API)
→ Store cover_image_url in DB
→ Insert pulse_content record with media_urls: [storage_url]
```

### 2.7 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/ReelCreator.tsx` | Create | Main form component |
| `src/components/pulse/creators/VideoUploader.tsx` | Create | Drag/drop + webcam |
| `src/components/pulse/creators/CoverImageSelector.tsx` | Create | Frame extraction |
| `src/components/pulse/creators/TagInput.tsx` | Create | Reusable tag picker |
| `src/components/pulse/creators/VisibilitySelector.tsx` | Create | Public/Connections toggle |
| `src/hooks/mutations/usePulseUpload.ts` | Create | File upload to Storage |
| `src/lib/validations/reel.ts` | Create | Zod schema |

---

## Phase 3: Audio Studio / Podcast Creator (Screen 125)

### 3.1 Screen Purpose
Record or upload audio podcasts with waveform visualization and AI-generated descriptions.

### 3.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| Audio File | `media_urls` | JSON array | Required, max 500MB, MP3/WAV |
| Podcast Title | `title` | string | Required, max 200 chars |
| Description | `caption` | string | Optional, max 300 chars |
| Duration | Stored in `media_urls` metadata | number | Calculated from file |

### 3.3 Validation Schema

```typescript
const podcastSchema = z.object({
  audio_file: z.instanceof(File)
    .refine(f => f.size <= 500 * 1024 * 1024, "Audio must be under 500MB")
    .refine(f => ['audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(f.type),
      "Supported formats: MP3, WAV"),
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z.string()
    .max(300, "Description must be 300 characters or less")
    .optional(),
});
```

### 3.4 UI/UX Rules

1. **Waveform Display**: Purple bars visualization (decorative or from audio analysis)
2. **Two Options**: "Record Now" (mic icon) / "Upload Audio" (upload icon)
3. **Recording UI**: Timer display, pause/resume, stop button
4. **AI Button**: "Generate Description with AI" - analyzes title to suggest description
5. **Character Counter**: "0/300" for description
6. **Status Footer**: "Record or upload audio to continue"

### 3.5 Recording Flow

```text
User clicks "Record Now"
→ Request microphone permission
→ Show recording indicator with timer
→ On stop: Convert to audio blob
→ Upload to Storage: pulse-media/{user_id}/podcasts/{timestamp}.webm
→ Show waveform preview
```

### 3.6 Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/PodcastStudio.tsx` | Create | Main component |
| `src/components/pulse/creators/AudioRecorder.tsx` | Create | Mic recording logic |
| `src/components/pulse/creators/WaveformDisplay.tsx` | Create | Audio visualization |
| `src/lib/validations/podcast.ts` | Create | Zod schema |

---

## Phase 4: Image Gallery Creator (Screen 126)

### 4.1 Screen Purpose
Upload multiple images to create a carousel gallery with captions.

### 4.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| Caption | `caption` | string | Optional, max 500 chars |
| Images | `media_urls` | JSON array | Required, 1-10 images, max 50MB each |
| First Image | `cover_image_url` | string | Auto-set from first image |

### 4.3 Validation Schema

```typescript
const gallerySchema = z.object({
  caption: z.string()
    .max(500, "Caption must be 500 characters or less")
    .optional(),
  images: z.array(z.instanceof(File))
    .min(1, "At least one image is required")
    .max(10, "Maximum 10 images allowed")
    .refine(files => files.every(f => f.size <= 50 * 1024 * 1024), 
      "Each image must be under 50MB")
    .refine(files => files.every(f => f.type.startsWith('image/')),
      "Only image files are allowed"),
});
```

### 4.4 UI/UX Rules

1. **Caption Field**: Full-width textarea at top
2. **AI Enhance Button**: "AI Enhance Caption" with character counter
3. **Image Grid**: Shows uploaded images with remove button
4. **Add Zone**: Dashed border box with "+" icon, "Add Images - Drag & drop or click"
5. **Empty State**: Large icon + "No images yet. Add photos to get started!"
6. **Reorder**: Drag-and-drop to reorder images
7. **Publish Button**: Disabled until at least 1 image added

### 4.5 Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/GalleryCreator.tsx` | Create | Main component |
| `src/components/pulse/creators/ImageGrid.tsx` | Create | Sortable image grid |
| `src/lib/validations/gallery.ts` | Create | Zod schema |

---

## Phase 5: Article Editor (Screen 127)

### 5.1 Screen Purpose
Write long-form content with rich text formatting and writing tips.

### 5.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| Title | `title` | string | Required, max 200 chars |
| Body | `body_text` | text | Required, 100-50000 chars |

### 5.3 Validation Schema

```typescript
const articleSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  body_text: z.string()
    .min(100, "Article must be at least 100 characters")
    .max(50000, "Article must be 50,000 characters or less"),
});
```

### 5.4 UI/UX Rules

1. **Title Input**: Large placeholder "Your article title..."
2. **Body Textarea**: Tall editor area with placeholder
3. **Writing Tips Panel**: Fixed at bottom with expandable tips:
   - "Start with a compelling hook that grabs attention"
   - "Use data and specific examples to support your insights"
   - "Break content into scannable sections with subheadings"
   - "End with actionable takeaways for your readers"
4. **Markdown Support**: Basic markdown rendering in preview mode
5. **Word/Character Count**: Show in footer

### 5.5 Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/ArticleEditor.tsx` | Create | Main component |
| `src/components/pulse/creators/WritingTips.tsx` | Create | Tips panel |
| `src/lib/validations/article.ts` | Create | Zod schema |

---

## Phase 6: Quick Post Creator (Screen 128)

### 6.1 Screen Purpose
Simple text post with optional attachments (image, document, emoji).

### 6.2 Database Field Mapping

| UI Element | DB Column | Type | Validation |
|------------|-----------|------|------------|
| Text Content | `caption` | string | Required, max 3000 chars |
| Image Attachment | `media_urls` | JSON array | Optional, max 10MB |

### 6.3 Validation Schema

```typescript
const postSchema = z.object({
  content: z.string()
    .min(1, "Content is required")
    .max(3000, "Content must be 3000 characters or less"),
  image: z.instanceof(File)
    .refine(f => f.size <= 10 * 1024 * 1024, "Image must be under 10MB")
    .optional(),
});
```

### 6.4 UI/UX Rules

1. **Textarea**: Full width, "What do you want to talk about?"
2. **Character Counter**: "0/3000" in corner
3. **Pro Tip Banner**: Green background - "Posts with questions get 2x more engagement. Share insights, ask for opinions, or start a conversation!"
4. **Attachment Bar**: Icons for Image, Document, Emoji
5. **Post Button**: Green accent, disabled until content entered

### 6.5 Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/creators/PostCreator.tsx` | Create | Main component |
| `src/components/pulse/creators/AttachmentBar.tsx` | Create | Media attachment options |
| `src/lib/validations/post.ts` | Create | Zod schema |

---

## Phase 7: Enhanced Feed Page (Screen 122)

### 7.1 Screen Purpose
Rich content feed with Daily Standup banner, mixed content types, and masonry layout.

### 7.2 New Features from Reference

1. **Daily Standup Banner**: 
   - Header: "Daily Standup Ready!" with countdown timer
   - Subtitle: "3 critical Healthcare updates"
   - Buttons: "10x VISIBILITY BOOST" + "+150 XP"
   - Warning: "Miss this window and lose your visibility boost for today"

2. **Content Card Variants**:
   - **Reel**: Video preview with play button, duration badge
   - **Podcast**: "Play Episode" button, waveform dots, duration badge
   - **Spark**: Gradient background (pink/purple), statistic highlight, trend chart
   - **Article**: Thumbnail + title + "Read Article" button
   - **Gallery**: Carousel with dots indicator, "1 of 3" badge

### 7.3 Component Additions

```text
src/components/pulse/
├── feed/
│   ├── DailyStandupBanner.tsx    # Standup CTA with timer
│   ├── ReelCard.tsx              # Video-specific card
│   ├── PodcastCard.tsx           # Audio-specific card  
│   ├── SparkCard.tsx             # Statistic highlight card
│   ├── ArticleCard.tsx           # Long-form preview card
│   └── GalleryCard.tsx           # Carousel card
```

### 7.4 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/feed/DailyStandupBanner.tsx` | Create | Standup CTA |
| `src/components/pulse/feed/ContentCardFactory.tsx` | Create | Renders correct card type |
| `src/pages/pulse/PulseFeedPage.tsx` | Modify | Add standup banner, use factory |

---

## Phase 8: Missing Pages (Routes)

### 8.1 Content Detail Page (`/pulse/content/:contentId`)

**Purpose**: Full-screen content view with comments

**Features**:
- Full content display based on type
- EngagementBar (already built)
- CommentSection (already built, just wire up)
- Provider header with follow button
- Share/Copy link actions

**File**: `src/pages/pulse/PulseContentDetailPage.tsx`

### 8.2 Search Page (`/pulse/search`)

**Purpose**: Search content, tags, and people

**Features**:
- Search input with debounce (300ms)
- Tab filters: All | Content | Tags | People
- Recent searches (localStorage)
- Trending tags section

**New Hook**: `usePulseSearch(query, filters)`

**File**: `src/pages/pulse/PulseSearchPage.tsx`

### 8.3 Notifications Page (`/pulse/notifications`)

**Purpose**: View and manage notifications

**Features**:
- Infinite scroll list (hook exists)
- Mark as read on click (hook exists)
- Mark all read button (hook exists)
- Empty state

**File**: `src/pages/pulse/PulseNotificationsPage.tsx`

### 8.4 Other User Profile (`/pulse/profile/:providerId`)

**Purpose**: View another user's public profile

**Features**:
- Provider stats display
- Follow/Unfollow button
- Published content grid
- Follower/Following counts

**New Hook**: `useProviderById(providerId)`

**File**: `src/pages/pulse/PulseOtherProfilePage.tsx`

---

## Phase 9: File Upload Infrastructure

### 9.1 Upload Hook

```typescript
// src/hooks/mutations/usePulseUpload.ts

export function useUploadPulseMedia() {
  return useMutation({
    mutationFn: async ({ 
      file, 
      contentType, 
      providerId 
    }: UploadParams) => {
      // 1. Validate file size/type client-side
      validateFile(file, contentType);
      
      // 2. Generate path: pulse-media/{providerId}/{type}/{timestamp}_{filename}
      const path = generateStoragePath(providerId, contentType, file.name);
      
      // 3. Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('pulse-media')
        .upload(path, file, { upsert: false });
      
      if (error) throw error;
      
      // 4. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pulse-media')
        .getPublicUrl(path);
      
      return { path, publicUrl };
    }
  });
}
```

### 9.2 Validation Utilities

```typescript
// src/lib/validations/media.ts

export const MEDIA_LIMITS = {
  reel: { maxSize: 100 * 1024 * 1024, types: ['video/mp4', 'video/quicktime'] },
  podcast: { maxSize: 500 * 1024 * 1024, types: ['audio/mpeg', 'audio/wav'] },
  gallery: { maxSize: 50 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  post: { maxSize: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/gif'] },
};

export function validateFile(file: File, contentType: string): void {
  const limits = MEDIA_LIMITS[contentType];
  if (!limits) throw new Error('Unknown content type');
  
  if (file.size > limits.maxSize) {
    throw new Error(`File exceeds ${formatBytes(limits.maxSize)} limit`);
  }
  
  if (!limits.types.includes(file.type)) {
    throw new Error(`Unsupported file format`);
  }
}
```

---

## Phase 10: Wire Up PulseCreatePage Router

### 10.1 Updated Flow

```typescript
// PulseCreatePage.tsx routing logic

if (selectedType === 'spark') return <SparkBuilder />;
if (selectedType === 'reel') return <ReelCreator />;
if (selectedType === 'podcast') return <PodcastStudio />;
if (selectedType === 'gallery') return <GalleryCreator />;
if (selectedType === 'article') return <ArticleEditor />;
if (selectedType === 'post') return <PostCreator />;
```

### 10.2 Content Type Selection Cards

Update existing cards with proper icons, colors, and descriptions matching the reference screens.

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| **Phase 9** (Upload Infrastructure) | High | Medium | None - foundation |
| **Phase 1** (Spark Builder) | High | Medium | None |
| **Phase 6** (Quick Post) | High | Low | None |
| **Phase 2** (Reel Creator) | High | High | Phase 9 |
| **Phase 4** (Gallery) | Medium | Medium | Phase 9 |
| **Phase 3** (Podcast) | Medium | High | Phase 9 |
| **Phase 5** (Article) | Medium | Low | None |
| **Phase 7** (Feed Enhancement) | Medium | Medium | Phases 1-6 |
| **Phase 8** (Missing Pages) | High | Medium | None |
| **Phase 10** (Wire Router) | High | Low | Phases 1-6 |

---

## Technical Standards Compliance

All implementations will follow Project Knowledge standards:

1. **Hooks Order**: All useState/useQuery/useMutation at top, before conditional returns
2. **Error Handling**: Use `handleMutationError()` for all mutations
3. **Audit Fields**: Use `withCreatedBy()` for inserts
4. **Validation**: Zod schemas with React Hook Form
5. **Accessibility**: ARIA labels, 44px touch targets, keyboard navigation
6. **Loading States**: Skeleton components for async content
7. **File Naming**: `PascalCase.tsx` for components, `camelCase.ts` for utilities

