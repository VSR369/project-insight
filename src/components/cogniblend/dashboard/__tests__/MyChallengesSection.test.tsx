/**
 * TW1-06: Dashboard filter tabs work for each role
 *
 * Tests that MyChallengesSection renders role tabs with correct counts
 * and filters the list when a tab is clicked.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyChallengesSection } from '../MyChallengesSection';
import type { MyChallengeItem } from '@/hooks/cogniblend/useMyChallenges';

/* ── Mock react-router-dom ───────────────────────────── */
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

/* ── Fixtures ─────────────────────────────────────────── */
const ITEMS: MyChallengeItem[] = [
  {
    challenge_id: 'c1',
    title: 'AI Safety Research',
    master_status: 'ACTIVE',
    phase_status: 'ACTIVE',
    current_phase: 2,
    governance_profile: 'LIGHTWEIGHT',
    role_code: 'CR',
    operating_model: 'MP',
    created_at: '2025-06-01T10:00:00Z',
  {
    challenge_id: 'c2',
    title: 'Quantum Computing',
    master_status: 'IN_PREPARATION',
    phase_status: 'LEGAL_VERIFICATION_PENDING',
    current_phase: 1,
    governance_profile: 'ENTERPRISE',
    role_code: 'CU',
    operating_model: 'MP',
  },
  {
    challenge_id: 'c3',
    title: 'Green Energy',
    master_status: 'ACTIVE',
    phase_status: 'ACTIVE',
    current_phase: 3,
    governance_profile: 'LIGHTWEIGHT',
    role_code: 'CR',
    operating_model: 'AGG',
  },
];

const ROLE_COUNTS: Record<string, number> = { CR: 2, CU: 1, ER: 0, ID: 0 };

describe('TW1-06 — MyChallengesSection filter tabs', () => {
  it('renders all 5 tabs with correct labels', () => {
    render(<MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('As Creator')).toBeInTheDocument();
    expect(screen.getByText('As Curator')).toBeInTheDocument();
    expect(screen.getByText('As Reviewer')).toBeInTheDocument();
    expect(screen.getByText('As Approver')).toBeInTheDocument();
  });

  it('shows all items by default (All tab)', () => {
    render(<MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />);
    expect(screen.getByText('AI Safety Research')).toBeInTheDocument();
    expect(screen.getByText('Quantum Computing')).toBeInTheDocument();
    expect(screen.getByText('Green Energy')).toBeInTheDocument();
  });

  it('filters to Creator items when As Creator tab is clicked', () => {
    render(<MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />);
    fireEvent.click(screen.getByText('As Creator'));
    expect(screen.getByText('AI Safety Research')).toBeInTheDocument();
    expect(screen.getByText('Green Energy')).toBeInTheDocument();
    expect(screen.queryByText('Quantum Computing')).not.toBeInTheDocument();
  });

  it('filters to Curator items when As Curator tab is clicked', () => {
    render(<MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />);
    fireEvent.click(screen.getByText('As Curator'));
    expect(screen.getByText('Quantum Computing')).toBeInTheDocument();
    expect(screen.queryByText('AI Safety Research')).not.toBeInTheDocument();
  });

  it('shows empty state when a role has no items', () => {
    render(<MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />);
    fireEvent.click(screen.getByText('As Reviewer'));
    expect(screen.getByText('No challenges for this role.')).toBeInTheDocument();
  });

  it('displays badge counts matching roleCounts', () => {
    const { container } = render(
      <MyChallengesSection items={ITEMS} roleCounts={ROLE_COUNTS} isLoading={false} />,
    );
    // The "All" tab badge should show total count (3)
    const buttons = container.querySelectorAll('button[type="button"]');
    const allTab = buttons[0];
    expect(allTab.textContent).toContain('3');
  });

  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <MyChallengesSection items={[]} roleCounts={{}} isLoading={true} />,
    );
    // Should show skeletons, not tabs
    expect(screen.queryByText('All')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
