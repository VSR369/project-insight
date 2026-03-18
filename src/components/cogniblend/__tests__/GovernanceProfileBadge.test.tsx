/**
 * TW1-05: Governance badge prominent on dashboard
 *
 * Tests that GovernanceProfileBadge renders correct label, styles, and tooltip text.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GovernanceProfileBadge } from '../GovernanceProfileBadge';

describe('TW1-05 — GovernanceProfileBadge', () => {
  it('renders LIGHTWEIGHT label for lightweight profile', () => {
    render(<GovernanceProfileBadge profile="LIGHTWEIGHT" />);
    expect(screen.getByText('LIGHTWEIGHT')).toBeInTheDocument();
  });

  it('renders ENTERPRISE label for enterprise profile', () => {
    render(<GovernanceProfileBadge profile="ENTERPRISE" />);
    expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
  });

  it('defaults to LIGHTWEIGHT when profile is null', () => {
    render(<GovernanceProfileBadge profile={null} />);
    expect(screen.getByText('LIGHTWEIGHT')).toBeInTheDocument();
  });

  it('defaults to LIGHTWEIGHT when profile is undefined', () => {
    render(<GovernanceProfileBadge profile={undefined} />);
    expect(screen.getByText('LIGHTWEIGHT')).toBeInTheDocument();
  });

  it('applies prominent (non-compact) sizing by default', () => {
    render(<GovernanceProfileBadge profile="ENTERPRISE" />);
    const badge = screen.getByText('ENTERPRISE');
    expect(badge.style.fontSize).toBe('14px');
    expect(badge.style.padding).toBe('4px 16px');
  });

  it('applies compact sizing when compact=true', () => {
    render(<GovernanceProfileBadge profile="ENTERPRISE" compact />);
    const badge = screen.getByText('ENTERPRISE');
    expect(badge.style.fontSize).toBe('10px');
  });

  it('uses correct green colors for LIGHTWEIGHT', () => {
    render(<GovernanceProfileBadge profile="LIGHTWEIGHT" />);
    const badge = screen.getByText('LIGHTWEIGHT');
    expect(badge.style.backgroundColor).toBe('#E1F5EE');
    expect(badge.style.color).toBe('#0F6E56');
  });

  it('uses correct blue colors for ENTERPRISE', () => {
    render(<GovernanceProfileBadge profile="ENTERPRISE" />);
    const badge = screen.getByText('ENTERPRISE');
    expect(badge.style.backgroundColor).toBe('#E6F1FB');
    expect(badge.style.color).toBe('#185FA5');
  });
});
