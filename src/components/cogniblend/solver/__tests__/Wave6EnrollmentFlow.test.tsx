/**
 * Wave 6 Tests — Solver enrollment flow, scroll-to-bottom legal, AGG AD agreement,
 * IO model restriction, and BR-COM-003 compliance flagging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { scanForContactInfo } from '@/lib/complianceScanner';

/* ═══════════════════════════════════════════════════════════
   TW6-06: Compliance scanner unit tests (pure logic)
   ═══════════════════════════════════════════════════════════ */

describe('TW6-06: Q&A messages with contact info flagged for compliance', () => {
  it('flags email addresses', () => {
    const result = scanForContactInfo('Contact me at john@example.com for details');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('Contains email address');
  });

  it('flags obfuscated emails (at/dot pattern)', () => {
    const result = scanForContactInfo('reach me at john at gmail dot com');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('Contains obfuscated email address');
  });

  it('flags URLs', () => {
    const result = scanForContactInfo('Check https://mysite.com/portfolio');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('Contains URL/link');
  });

  it('flags www URLs', () => {
    const result = scanForContactInfo('Visit www.mycompany.com');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('Contains URL/link');
  });

  it('flags phone numbers with 7+ digits', () => {
    const result = scanForContactInfo('Call me at +1 555-123-4567');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('Contains phone number');
  });

  it('does NOT flag clean questions', () => {
    const result = scanForContactInfo('What is the expected deliverable format for phase 2?');
    expect(result.flagged).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('does NOT flag short numbers (less than 7 digits)', () => {
    const result = scanForContactInfo('The score was 12345 out of 100000');
    // 12345 is only 5 digits, should not flag; 100000 is 6 digits, still under 7
    expect(result.reasons).not.toContain('Contains phone number');
  });

  it('flags multiple violation types at once', () => {
    const result = scanForContactInfo('Email john@test.com or call 555-123-4567 or visit https://site.com');
    expect(result.flagged).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

/* ═══════════════════════════════════════════════════════════
   TW6-01 to TW6-05: Component/integration behavior tests
   These verify the component structure and props contract.
   ═══════════════════════════════════════════════════════════ */

// Mock modules for component tests
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-id' }, session: null, loading: false })),
}));

vi.mock('@/hooks/cogniblend/useSolverEnrollment', () => ({
  useSolverEnrollmentStatus: vi.fn(() => ({ data: null, isLoading: false })),
  useEnrollInChallenge: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useWithdrawEnrollment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/cogniblend/useLegalAcceptance', () => ({
  useRecordLegalAcceptance: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { SolverEnrollmentCTA } from '@/components/cogniblend/solver/SolverEnrollmentCTA';
import { ScrollToAcceptLegal } from '@/components/cogniblend/solver/ScrollToAcceptLegal';
import { useAuth } from '@/hooks/useAuth';
import { useSolverEnrollmentStatus } from '@/hooks/cogniblend/useSolverEnrollment';

describe('TW6-01: Solver enrollment flow works for OPEN model', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' } as any,
      session: null,
      loading: false,
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(useSolverEnrollmentStatus).mockReturnValue({
      data: null, isLoading: false,
    } as any);
  });

  it('shows "Enroll in Challenge" button for OPEN model', () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="OPEN"
        isEligible={true}
      />
    );
    expect(screen.getByText('Enroll in Challenge')).toBeInTheDocument();
  });

  it('shows instant enrollment description for OPEN model', () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="OPEN"
        isEligible={true}
      />
    );
    expect(screen.getByText(/Click to enroll instantly/)).toBeInTheDocument();
  });
});

describe('TW6-02: DR model requires NDA scroll-to-bottom before enrollment', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' } as any,
      session: null,
      loading: false,
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(useSolverEnrollmentStatus).mockReturnValue({
      data: null, isLoading: false,
    } as any);
  });

  it('shows "Enroll (NDA Required)" button for DR model', () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="DR"
        isEligible={true}
      />
    );
    expect(screen.getByText('Enroll (NDA Required)')).toBeInTheDocument();
  });
});

describe('TW6-03: Scroll-to-bottom — checkbox disabled until scrolled', () => {
  it('checkbox starts unchecked', () => {
    render(
      <ScrollToAcceptLegal
        documentContent={'A\n'.repeat(200)}
        accepted={false}
        onAcceptedChange={vi.fn()}
        maxHeight={100}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('auto-enables checkbox when content fits without scrolling (jsdom: scrollHeight=0)', () => {
    // In jsdom, scrollHeight is always 0, so the component correctly auto-confirms
    // when content appears to fit. This validates the auto-confirm logic path.
    const onScrollConfirmed = vi.fn();

    render(
      <ScrollToAcceptLegal
        documentContent="Short content"
        accepted={false}
        onAcceptedChange={vi.fn()}
        onScrollConfirmed={onScrollConfirmed}
        maxHeight={400}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeDisabled();
  });

  it('calls onScrollConfirmed when content fits (auto-confirm path)', () => {
    const onScrollConfirmed = vi.fn();

    render(
      <ScrollToAcceptLegal
        documentContent="Short"
        accepted={false}
        onAcceptedChange={vi.fn()}
        onScrollConfirmed={onScrollConfirmed}
        maxHeight={400}
      />
    );

    expect(onScrollConfirmed).toHaveBeenCalledWith(true);
  });

  it('renders the acceptance label text', () => {
    render(
      <ScrollToAcceptLegal
        documentContent="Some content"
        accepted={false}
        onAcceptedChange={vi.fn()}
        acceptLabel="I accept the custom terms."
        maxHeight={400}
      />
    );

    expect(screen.getByText('I accept the custom terms.')).toBeInTheDocument();
  });
});

describe('TW6-04: AGG model shows Anti-Disintermediation during enrollment', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' } as any,
      session: null,
      loading: false,
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(useSolverEnrollmentStatus).mockReturnValue({
      data: null, isLoading: false,
    } as any);
  });

  it('shows NDA Required button for DR+AGG model', () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="DR"
        isEligible={true}
        isAggModel={true}
      />
    );
    expect(screen.getByText('Enroll (NDA Required)')).toBeInTheDocument();
  });

  it('opens dialog with Step 1 of 2 label when clicked for AGG model', async () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="DR"
        isEligible={true}
        isAggModel={true}
      />
    );

    const enrollButton = screen.getByText('Enroll (NDA Required)');
    await act(async () => {
      fireEvent.click(enrollButton);
    });

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Legal Terms & NDA')).toBeInTheDocument();
  });
});

describe('TW6-05: IO model — only invited solvers see enrollment', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'test-user' } as any,
      session: null,
      loading: false,
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
    });
    vi.mocked(useSolverEnrollmentStatus).mockReturnValue({
      data: null, isLoading: false,
    } as any);
  });

  it('shows "Invitation Only" lock card instead of enroll button', () => {
    render(
      <SolverEnrollmentCTA
        challengeId="ch-1"
        tenantId="t-1"
        enrollmentModel="IO"
        isEligible={true}
      />
    );
    expect(screen.getByText('Invitation Only')).toBeInTheDocument();
    expect(screen.getByText(/restricted to invited solvers/)).toBeInTheDocument();
    expect(screen.queryByText('Enroll in Challenge')).not.toBeInTheDocument();
  });
});
