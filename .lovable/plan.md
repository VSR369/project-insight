

# Generate Prompt Audit Report for All Active Curation Sections

## Overview

Generate a comprehensive Markdown document containing the complete prompt configuration for all 26 active curation sections (3 orphans deactivated), structured for Claude audit consumption.

## What the document will contain

For each section, a standardized card showing all 5 layers:
1. **Section metadata**: key, label, importance, wave, tab, tone, word limits
2. **Platform preamble**: present/absent flag (content identical across all — shown once at top)
3. **Quality criteria**: name, severity, description, cross-references
4. **Master data constraints**: field, source, strict/recommended
5. **Computation rules**: all rules with template variables
6. **Content templates**: blueprint/poc/pilot templates
7. **Research directives**: web search queries with purpose/when
8. **Industry frameworks + analyst sources**
9. **Supervisor instructions**: review_instructions, dos, donts
10. **Examples**: example_good, example_poor, supervisor_examples
11. **Required elements**
12. **Cross-references**: linked sections

## Implementation

Single script execution that:
1. Queries `ai_review_section_config` for all `role_context = 'curation'` sections (active + inactive flagged)
2. Formats each section into a structured Markdown card
3. Groups by Wave → Tab Group
4. Outputs to `/mnt/documents/prompt-audit-report-all-sections-post-fix.md`

## Output

A single downloadable Markdown file ready to paste into Claude for re-audit.

## Files Modified

None — this is a data extraction task using `code--exec`.

