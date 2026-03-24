/**
 * TW1-05: Governance badge prominent on dashboard
 *
 * Tests that GovernanceProfileBadge renders correct label, styles, and tooltip text.
 * Legacy LIGHTWEIGHT/ENTERPRISE inputs map to QUICK/STRUCTURED via resolveGovernanceMode.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GovernanceProfileBadge } from '../GovernanceProfileBadge';

describe('TW1-05 — GovernanceProfileBadge', () => {
  it('renders QUICK label for legacy LIGHTWEIGHT profile', () => {
    render(<GovernanceProfileBadge profile="LIGHTWEIGHT" />);
    expect(screen.getByText('QUICK')).toBeInTheDocument();
  });

  it('renders STRUCTURED label for legacy ENTERPRISE profile', () => {
    render(<GovernanceProfileBadge profile="ENTERPRISE" />);
    expect(screen.getByText('STRUCTURED')).toBeInTheDocument();
  });

  it('renders QUICK label for QUICK profile', () => {
    render(<GovernanceProfileBadge profile="QUICK" />);
    expect(screen.getByText('QUICK')).toBeInTheDocument();
  });

  it('renders CONTROLLED label for CONTROLLED profile', () => {
    render(<GovernanceProfileBadge profile="CONTROLLED" />);
    expect(screen.getByText('CONTROLLED')).toBeInTheDocument();
  });

  it('defaults to STRUCTURED when profile is null', () => {
    render(<GovernanceProfileBadge profile={null} />);
    expect(screen.getByText('STRUCTURED')).toBeInTheDocument();
  });

  it('defaults to STRUCTURED when profile is undefined', () => {
    render(<GovernanceProfileBadge profile={undefined} />);
    expect(screen.getByText('STRUCTURED')).toBeInTheDocument();
  });

  it('applies prominent (non-compact) sizing by default', () => {
    render(<GovernanceProfileBadge profile="STRUCTURED" />);
    const badge = screen.getByText('STRUCTURED');
    expect(badge.style.fontSize).toBe('14px');
    expect(badge.style.padding).toBe('4px 16px');
  });

  it('applies compact sizing when compact=true', () => {
    render(<GovernanceProfileBadge profile="STRUCTURED" compact />);
    const badge = screen.getByText('STRUCTURED');
    expect(badge.style.fontSize).toBe('10px');
  });

  it('uses correct green colors for QUICK', () => {
    render(<GovernanceProfileBadge profile="QUICK" />);
    const badge = screen.getByText('QUICK');
    expect(badge.style.backgroundColor).toBe('#E1F5EE');
    expect(badge.style.color).toBe('#0F6E56');
  });

  it('uses correct blue colors for STRUCTURED', () => {
    render(<GovernanceProfileBadge profile="STRUCTURED" />);
    const badge = screen.getByText('STRUCTURED');
    expect(badge.style.backgroundColor).toBe('#E6F1FB');
    expect(badge.style.color).toBe('#185FA5');
  });

  it('uses correct purple colors for CONTROLLED', () => {
    render(<GovernanceProfileBadge profile="CONTROLLED" />);
    const badge = screen.getByText('CONTROLLED');
    expect(badge.style.backgroundColor).toBe('#F3E8FF');
    expect(badge.style.color).toBe('#6D28D9');
  });
});
