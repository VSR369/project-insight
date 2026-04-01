

# Bug Fix: STRUCTURED Governance Mode Always Highlighted on Basic Tier

## Root Cause

The **DemoLoginPage** (`src/pages/cogniblend/DemoLoginPage.tsx`, line 116) initializes governance mode as `'STRUCTURED'` by default:
```ts
const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('STRUCTURED');
```

When a user logs in via the demo page without changing the selector, `'STRUCTURED'` is persisted to `sessionStorage`. ChallengeCreatePage then reads this value (lines 221-224) and sets it as the active governance mode — **bypassing the tier ceiling check entirely**.

This means even a Basic-tier org (which should only allow QUICK) gets STRUCTURED highlighted.

## Fix (2 files)

### 1. DemoLoginPage — Default to QUICK
Change the initial state from `'STRUCTURED'` to `'QUICK'`:
```ts
const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('QUICK');
```

### 2. ChallengeCreatePage — Clamp sessionStorage value against tier
In the useEffect that reads `cogni_demo_governance` (lines 220-228), add a tier-ceiling check so even if sessionStorage contains STRUCTURED, it gets clamped to the org's available modes:

```ts
useEffect(() => {
  const demoGov = sessionStorage.getItem('cogni_demo_governance') as GovernanceMode | null;
  sessionStorage.removeItem('cogni_demo_governance');

  if (currentOrg) {
    const available = getAvailableGovernanceModes(currentOrg.tierCode);
    if (demoGov && available.includes(demoGov)) {
      setGovernanceMode(demoGov);
    } else {
      setGovernanceMode(getDefaultGovernanceMode(currentOrg.tierCode, currentOrg.governanceProfile));
    }
  }
}, [currentOrg]);
```

This ensures governance mode always respects the tier ceiling, whether set from demo login or org defaults.

## Impact
- No DB changes
- No new dependencies
- Fixes the visual mismatch where STRUCTURED appears selected on a Basic-tier org

