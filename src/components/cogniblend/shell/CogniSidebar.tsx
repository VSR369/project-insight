/**
 * CogniSidebar — Left navigation for CogniBlend shell.
 * Fixed 256px, full height, white background, org branding + nav links.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { CogniSidebarNav } from './CogniSidebarNav';

interface CogniSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Governance profile badge */
function GovernanceBadge({ profile }: { profile: string }) {
  const isEnterprise = profile === 'ENTERPRISE';
  return (
    <span
      className="inline-block font-semibold uppercase"
      style={{
        fontSize: 11,
        padding: '2px 10px',
        borderRadius: 12,
        backgroundColor: isEnterprise ? '#E6F1FB' : '#E1F5EE',
        color: isEnterprise ? '#185FA5' : '#0F6E56',
      }}
    >
      {profile}
    </span>
  );
}

export function CogniSidebar({ isOpen, onClose }: CogniSidebarProps) {
  const navigate = useNavigate();

  // TODO: Replace with real org context data
  const orgName = 'Acme Innovation Labs';
  const governanceProfile = 'LIGHTWEIGHT';

  const handleDashboardNav = () => {
    navigate('/cogni/dashboard');
    onClose();
  };

  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 h-full w-64
        bg-white border-r
        transition-transform duration-200
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
      style={{ borderColor: '#E5E7EB' }}
    >
      {/* Org branding */}
      <div className="px-5 pt-5 pb-4">
        <h2
          className="font-bold truncate cursor-pointer"
          style={{ fontSize: 15, color: '#1F3864' }}
          onClick={handleDashboardNav}
        >
          {orgName}
        </h2>
        <div className="mt-2">
          <GovernanceBadge profile={governanceProfile} />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, backgroundColor: '#E5E7EB' }} />

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={handleDashboardNav}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm font-medium"
          style={{
            borderLeft: location.pathname === '/cogni/dashboard' ? '3px solid #378ADD' : '3px solid transparent',
            backgroundColor: location.pathname === '/cogni/dashboard' ? '#F0F7FF' : 'transparent',
            color: location.pathname === '/cogni/dashboard' ? '#378ADD' : '#666',
          }}
        >
          <LayoutDashboard style={{ width: 18, height: 18 }} className="shrink-0" />
          <span>Dashboard</span>
        </button>
      </div>

      {/* Role-aware navigation sections */}
      <div className="flex-1 overflow-y-auto">
        <CogniSidebarNav onNavigate={onClose} />
      </div>
    </aside>
  );
}
