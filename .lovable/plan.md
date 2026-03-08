

# Fix: "Configure now" Button Does Nothing on System Config Page

## Problem
The `ExecutiveContactWarning` component (both compact and full variants) calls `navigate('/admin/system-config')` when clicked. When the user is already on that page, React Router treats it as a no-op — nothing happens.

## Fix
When already on the System Config page, the button should scroll to the ESCALATION accordion section. When on other pages, it should navigate first, then scroll.

### File: `src/components/admin/system-config/ExecutiveContactWarning.tsx`
- Change `onClick` to scroll to the ESCALATION accordion item using `document.getElementById` or a hash-based approach
- Use `id="config-group-ESCALATION"` on the accordion item (need to verify it exists)

### File: `src/components/admin/system-config/ConfigGroupAccordion.tsx`
- Add an `id` prop like `id={`config-group-${groupKey}`}` to the accordion item root element so it can be scrolled to

### Behavior
- On System Config page: scroll to `#config-group-ESCALATION` and ensure it's expanded
- On other pages (compact header banner): navigate to `/admin/system-config#ESCALATION`, then on mount the page scrolls to that section

