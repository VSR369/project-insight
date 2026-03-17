/**
 * CogniSidebar — Left navigation for CogniBlend shell.
 * Fixed 256px, full height, white background, org branding + nav links.
 */

import { useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();

  // TODO: Replace with real org context data
  const orgName = 'Acme Innovation Labs';
  const governanceProfile = 'LIGHTWEIGHT';

  const handleNav = (path: string) => {
    navigate(path);
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
          className="font-bold truncate"
          style={{ fontSize: 15, color: '#1F3864' }}
        >
          {orgName}
        </h2>
        <div className="mt-2">
          <GovernanceBadge profile={governanceProfile} />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, backgroundColor: '#E5E7EB' }} />

      {/* Navigation */}
      <nav className="px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                transition-colors text-sm font-medium
                ${active
                  ? 'bg-[#E6F1FB] text-[#185FA5]'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
