

# Responsive Design Standards & Audit Framework for Lovable.dev

## Part 1: Project Knowledge Document (Add to Project Knowledge)

---

### RESPONSIVE DESIGN STANDARDS v1.0

#### 1. BREAKPOINT SYSTEM (Tailwind CSS - Mandatory)

| Breakpoint | Prefix | Width | Use Case |
|------------|--------|-------|----------|
| Mobile | (default) | 0-639px | Base styles, single-column layouts |
| Small | `sm:` | 640px+ | Large phones, minor adjustments only |
| Medium | `md:` | 768px+ | Small tablets - **USE SPARINGLY** |
| Large | `lg:` | 1024px+ | **Primary horizontal breakpoint** for layouts |
| Extra Large | `xl:` | 1280px+ | Multi-column grids (3-4 columns) |
| 2XL | `2xl:` | 1536px+ | Wide desktop enhancements |

**CRITICAL RULE**: For card layouts, flex-row transitions, and button groupings, use `lg:` (1024px) NOT `md:` (768px). Tablets (768px-1023px) should retain stacked/mobile layouts.

---

#### 2. LAYOUT TRANSITION RULES

##### 2.1 Card/Content Layouts
```tsx
// ✅ CORRECT - Horizontal layout at desktop (1024px+)
<div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-4">

// ❌ WRONG - Horizontal layout at tablet causes distortion
<div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
```

##### 2.2 Grid Layouts
```tsx
// ✅ CORRECT - Progressive grid expansion
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">

// ❌ WRONG - 2 columns on tablet squeezes content
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
```

##### 2.3 Action Button Containers
```tsx
// ✅ CORRECT - Buttons stack on mobile/tablet, inline on desktop
<div className="flex flex-wrap gap-2 mt-3 lg:mt-0 w-full lg:w-auto">

// ❌ WRONG - Buttons inline on tablet causes squeeze
<div className="flex flex-wrap gap-2 mt-3 md:mt-0 w-full md:w-auto">
```

##### 2.4 Text Label Visibility
```tsx
// ✅ CORRECT - Icon-only on mobile/tablet, text on desktop
<Button>
  <Icon className="h-4 w-4" />
  <span className="hidden lg:inline ml-1">Label Text</span>
</Button>

// ❌ WRONG - Text shows on small tablets, causes overflow
<Button>
  <Icon className="h-4 w-4" />
  <span className="hidden sm:inline ml-1">Label Text</span>
</Button>
```

---

#### 3. WIDTH & SIZING PATTERNS

##### 3.1 Never Use Fixed Widths (Anti-Pattern)
```tsx
// ❌ WRONG - Fixed pixel widths
<div className="w-[500px]">
<div style={{ width: '500px' }}>

// ✅ CORRECT - Fluid with constraints
<div className="w-full max-w-lg">
<div className="w-full sm:max-w-md lg:max-w-lg">
```

##### 3.2 Standard Max-Width Classes
| Class | Width | Use Case |
|-------|-------|----------|
| `max-w-sm` | 384px | Compact dialogs, narrow cards |
| `max-w-md` | 448px | Standard dialogs, forms |
| `max-w-lg` | 512px | Default dialog size |
| `max-w-xl` | 576px | Wide dialogs |
| `max-w-2xl` | 672px | Data-heavy dialogs |
| `max-w-4xl` | 896px | Full-width previews |

##### 3.3 Dialog Responsive Pattern
```tsx
// Standard responsive dialog
<DialogContent className="w-full max-w-lg sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
```

---

#### 4. OVERFLOW HANDLING

##### 4.1 Tables (Mandatory Pattern)
```tsx
// ✅ CORRECT - All tables must be scrollable
<div className="relative w-full overflow-auto">
  <Table>...</Table>
</div>
```

##### 4.2 Horizontal Navigation
```tsx
// ✅ CORRECT - Scrollable nav with hidden scrollbar
<nav className="overflow-x-auto scrollbar-hide">
  <div className="flex gap-2 whitespace-nowrap">
    {items.map(item => <NavItem key={item.id} />)}
  </div>
</nav>
```

##### 4.3 Long Text Handling
```tsx
// Truncate with ellipsis
<span className="truncate max-w-[200px]">Long text...</span>

// Multi-line truncate
<p className="line-clamp-2">Long paragraph...</p>

// Allow wrapping (badges, tags)
<div className="flex flex-wrap gap-2">
  {tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
</div>
```

---

#### 5. TOUCH TARGET REQUIREMENTS

All interactive elements MUST be at least 44x44px on mobile:

```tsx
// ✅ CORRECT - Touch-friendly button
<Button size="default">...</Button> // h-10 = 40px (acceptable)
<Button className="min-h-[44px] min-w-[44px]">...</Button> // Explicit

// For icon buttons
<Button size="icon" className="touch-target">...</Button>
```

CSS utility available:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

#### 6. FONT SIZE SCALING

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Body text | `text-sm` (14px) | `text-sm` | `text-base` (16px) |
| Headings | `text-lg` | `text-xl` | `text-2xl` |
| Small text | `text-xs` (12px) | `text-xs` | `text-sm` |
| Labels | `text-sm` | `text-sm` | `text-sm` |

```tsx
// ✅ CORRECT - Responsive heading
<h1 className="text-lg md:text-xl lg:text-2xl font-semibold">

// ✅ CORRECT - Body text (Input component default)
<Input className="text-base md:text-sm" /> // Larger on mobile (prevents zoom)
```

---

#### 7. SPACING SYSTEM

```tsx
// Responsive padding
<div className="p-4 md:p-6 lg:p-8">

// Responsive gap
<div className="flex gap-2 md:gap-4 lg:gap-6">

// Responsive margins
<section className="mt-4 md:mt-6 lg:mt-8">
```

---

#### 8. SCROLLABLE CONTAINERS (Critical Pattern)

When using flexbox with scrollable children:
```tsx
// ✅ CORRECT - Enables scroll within flex container
<div className="flex flex-col h-full overflow-hidden">
  <header className="shrink-0">Fixed header</header>
  <main className="flex-1 min-h-0 overflow-y-auto">
    Scrollable content
  </main>
</div>

// ❌ WRONG - flex-1 without min-h-0 breaks scrolling
<div className="flex flex-col h-full">
  <main className="flex-1 overflow-y-auto">
    Won't scroll properly
  </main>
</div>
```

---

#### 9. THREE-COLUMN LAYOUT TRANSITIONS

Standard app layout pattern:
```tsx
// Left Sidebar: Hidden until xl (1280px)
<aside className="hidden xl:flex w-64 2xl:w-72">

// Main Content: Always visible
<main className="flex-1 min-w-0 overflow-auto">

// Right Sidebar: Hidden until lg (1024px)
<aside className="hidden lg:flex w-72 xl:w-80">
```

---

#### 10. FORM LAYOUT PATTERNS

```tsx
// Two-column form fields
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField name="firstName" />
  <FormField name="lastName" />
</div>

// Full-width on mobile, constrained on desktop
<Form className="w-full max-w-md mx-auto lg:mx-0">
```

---

#### 11. MODAL/DIALOG PATTERNS

```tsx
// Standard modal
<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">

// Wide modal with flex content
<DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
  <DialogHeader className="shrink-0">...</DialogHeader>
  <div className="flex-1 min-h-0 overflow-y-auto">
    Scrollable content
  </div>
  <DialogFooter className="shrink-0">...</DialogFooter>
</DialogContent>
```

---

#### 12. NAVIGATION PATTERNS

##### Bottom Navigation (Mobile)
```tsx
<nav className="fixed bottom-0 inset-x-0 lg:hidden border-t bg-background pb-safe">
  <div className="flex justify-around items-center h-14">
    {items.map(item => <NavItem key={item.id} className="touch-target" />)}
  </div>
</nav>
```

##### Desktop Navigation
```tsx
<nav className="hidden lg:flex items-center gap-2">
  {items.map(item => <NavLink key={item.id} />)}
</nav>
```

---

### ANTI-PATTERNS TO AVOID

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `md:flex-row` for cards | Distortion on 768px tablets | Use `lg:flex-row` |
| `sm:inline` for button text | Text overflow on small tablets | Use `lg:inline` |
| `md:grid-cols-2` for data grids | Content squeeze on tablets | Use `lg:grid-cols-2` |
| Fixed pixel widths | Overflow on smaller screens | Use `w-full max-w-[value]` |
| `flex-1` without `min-h-0` | Scroll containers don't work | Always pair them |
| Missing `overflow-auto` on tables | Horizontal overflow on mobile | Wrap tables in `overflow-auto` |
| Small touch targets | Poor mobile UX | Minimum 44x44px |

---

## Part 2: Refined Audit Prompt

```
Conduct a comprehensive responsive design audit and fix all issues.

## Audit Parameters

**Breakpoints to test:**
- Mobile: 375px (iPhone SE/12/13)
- Tablet: 768px (iPad Mini) and 820px (iPad Air)
- Desktop: 1024px and 1280px+

**Check for these specific issues:**

### Layout Issues
1. [ ] Cards/content switching to `md:flex-row` instead of `lg:flex-row`
2. [ ] Grids using `md:grid-cols-2` instead of `lg:grid-cols-2`
3. [ ] Action button containers using `md:mt-0 md:w-auto` instead of `lg:`
4. [ ] Button text using `sm:inline` instead of `lg:inline`

### Overflow Issues
5. [ ] Any element causing horizontal page scroll
6. [ ] Tables without `overflow-auto` wrapper
7. [ ] Text truncated mid-word or overflowing containers
8. [ ] Fixed widths (w-[Xpx]) instead of fluid widths

### Touch & Accessibility
9. [ ] Interactive elements smaller than 44x44px on mobile
10. [ ] Font sizes below 14px on mobile
11. [ ] Inputs without `text-base` (causes iOS zoom on focus)

### Container Issues
12. [ ] Modals exceeding viewport height without `max-h-[90vh] overflow-y-auto`
13. [ ] Flex containers with `flex-1` but missing `min-h-0` for scroll
14. [ ] Missing `overflow-hidden` on parent of scrollable flex children

### Navigation
15. [ ] Desktop nav not collapsing on mobile (missing `lg:hidden` / `hidden lg:flex`)
16. [ ] Bottom nav visible on desktop (missing `lg:hidden`)

## For each issue found, provide:
- File path and line number
- Current code snippet
- Fixed code snippet with explanation
- Which breakpoint(s) the fix affects

## Priority Order:
1. Horizontal overflow (breaks entire page)
2. Card/grid layout distortion at 768px
3. Button text overflow
4. Touch target sizing
5. Modal overflow
6. Minor spacing adjustments

## After fixes, verify:
- [ ] No horizontal scroll at any breakpoint
- [ ] All cards stack on tablet (768px-1023px)
- [ ] All text readable without truncation issues
- [ ] All buttons/links tappable on mobile
```

---

## Part 3: Quick Reference Card

```
RESPONSIVE QUICK REFERENCE

┌─────────────────────────────────────────────────────┐
│ BREAKPOINT USAGE                                    │
├─────────────────────────────────────────────────────┤
│ sm: (640px)  → Minor text/spacing adjustments       │
│ md: (768px)  → USE SPARINGLY (tablet danger zone)   │
│ lg: (1024px) → PRIMARY layout transitions           │
│ xl: (1280px) → 3-4 column grids, wide layouts       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LAYOUT TRANSITIONS                                  │
├─────────────────────────────────────────────────────┤
│ flex-col → lg:flex-row    (not md:flex-row)         │
│ grid-cols-1 → lg:grid-cols-2 → xl:grid-cols-4       │
│ w-full → lg:w-auto        (for inline buttons)      │
│ hidden → lg:inline        (for button labels)       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MANDATORY PATTERNS                                  │
├─────────────────────────────────────────────────────┤
│ Tables: <div className="overflow-auto"><Table/>     │
│ Dialogs: max-h-[90vh] overflow-y-auto               │
│ Scroll containers: min-h-0 + overflow-y-auto        │
│ Touch targets: min-h-[44px] min-w-[44px]            │
│ Inputs: text-base (prevents iOS zoom)               │
└─────────────────────────────────────────────────────┘
```

---

## Files to Update After Adding to Project Knowledge

1. **index.css** - Add `.touch-target` utility if not present (already exists)
2. **Future components** - Follow these standards when building new UI
3. **Existing components** - Audit progressively using the refined prompt

