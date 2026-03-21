

## Analysis

The rendering infrastructure (`AiStructuredCards.tsx`, `AiContentRenderer.tsx` with JSON detection) is **already fully implemented**. The user's PASTE 2 (`AIResponseDisplay` wrapper) is functionally identical to the existing `AiContentRenderer` component.

The only missing piece is **PASTE 3** — instructing edge function system prompts to return structured JSON for monetary/evaluation data instead of plain text. This ensures AI responses actually trigger the structured card renderers.

## Plan: Add Structured JSON Output Instructions to Edge Function Prompts

### Files to modify

#### 1. `supabase/functions/ai-field-assist/index.ts`
Append structured JSON schema instructions to the system prompt. When the AI drafts `evaluation_criteria` or reward-related fields, it should return JSON matching the `MonetaryCard` and `EvaluationCard` schemas rather than free text.

#### 2. `supabase/functions/refine-challenge-section/index.ts`
Add a section to `SYSTEM_PROMPT` instructing the AI to return structured JSON when refining reward structures or evaluation criteria sections. The existing rule already mentions "return valid JSON matching the input structure" for structured fields — this extends it with the specific schemas.

#### 3. `supabase/functions/enhance-pulse-content/index.ts`
Add lightweight instruction: when the enhanced content involves scoring or evaluation feedback, return structured JSON.

### What the prompt additions look like

Each affected edge function gets this appended to its system prompt:

```
When providing feedback on reward structures, evaluation criteria, scoring,
or any structured data, return a JSON object using these schemas:

For monetary/prize data:
{"type":"monetary","description":"...","milestones":[{"name":"...","percentage":0}],"reward_distribution":{"platinum":"$X","gold":"$Y","silver":"$Z"},"tiered_perks":{"platinum":["..."],"gold":["..."],"silver":["..."]}}

For evaluation/scoring:
{"type":"evaluation","overall_score":82,"max_score":100,"grade":"A","feedback":"...","criteria":[{"name":"...","score":18,"max":20,"comment":"..."}],"recommendation":"..."}
```

### No new files needed
- `AIResponseDisplay` from PASTE 2 is redundant — `AiContentRenderer` already handles this exact use case
- All structured card renderers already exist in `AiStructuredCards.tsx`
- JSON auto-detection already works in `AiContentRenderer.tsx`

### Deployment
After modifying the edge functions, they need to be redeployed via `supabase--deploy_edge_functions`.

