
## Fix Creator Module — 3 Changes

### Change 1: Seed Data (`supabase/functions/setup-test-scenario/index.ts`)
- Replace org with Tech Mahindra Limited (full profile)
- Challenge 1 CONTROLLED: "AI-Driven Clinical Trial Patient Matching" — $500K, 12 fields
- Challenge 2 STRUCTURED: "Predictive Quality Analytics" — $120K, 8 fields  
- Challenge 3 QUICK: "Carbon Footprint Tracker" — $10K, 5 fields
- All snapshots mirror challenge column data exactly

### Change 2: List View (`useMyChallenges.ts` + `MyChallengesPage.tsx`)
- Add problem_statement, reward_structure, currency_code, domain_tags to query + interface
- Show problem excerpt, prize badge, domain tags on each card

### Change 3: Detail View Badges (`CreatorSectionRenderers.tsx` + `CreatorChallengeDetailView.tsx`)
- Add "Your input" badge on Creator-owned sections
- Pass creatorFieldKeys to FilteredSections
