/**
 * CogniSidebar — Left navigation for CogniBlend shell.
 * Mobile (<768px): hidden, slide-in overlay with X button.
 * Tablet (768–1024px): icon-only 64px, hover expands to 256px.
 * Desktop (≥1024px): full 256px.
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, X } from 'lucide-react';
import { CogniSidebarNav } from './CogniSidebarNav';

import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';

interface CogniSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CogniSidebar({ isOpen, onClose }: CogniSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const { data: currentOrg } = useCurrentOrg();

  const orgName = currentOrg?.orgName ?? 'Organization';
  

  const handleDashboardNav = () => {
    navigate('/cogni/dashboard');
    onClose();
  };

  const isDashboardActive = location.pathname === '/cogni/dashboard';

  /*
   * Width logic via Tailwind:
   * - Mobile: full 256px overlay (controlled by isOpen translate)
   * - Tablet (md): 64px collapsed, 256px on hover
   * - Desktop (lg): always 256px
   *
   * We use a `group` + hovered state for the tablet expand-on-hover.
   */
  const isExpanded = hovered; // tablet hover state

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        fixed top-0 left-0 z-50 h-full
        bg-white border-r transition-all duration-200 overflow-hidden
        w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        ${isExpanded ? 'md:w-64' : 'md:w-16'}
        lg:w-64
      `}
      style={{ borderColor: '#E5E7EB' }}
    >
      {/* Mobile close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted transition-colors md:hidden"
        aria-label="Close sidebar"
      >
        <X className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Org branding */}
      <div className="px-5 pt-5 pb-4 overflow-hidden">
        <h2
          className={`
            font-bold cursor-pointer whitespace-nowrap transition-opacity duration-200
            ${isExpanded ? 'md:opacity-100' : 'md:opacity-0'}
            lg:opacity-100
          `}
          style={{ fontSize: 15, color: '#1F3864' }}
          onClick={handleDashboardNav}
        >
          {orgName}
        </h2>
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, backgroundColor: '#E5E7EB' }} />

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={handleDashboardNav}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm font-medium overflow-hidden"
          style={{
            borderLeft: isDashboardActive ? '3px solid #378ADD' : '3px solid transparent',
            backgroundColor: isDashboardActive ? '#F0F7FF' : 'transparent',
            color: isDashboardActive ? '#378ADD' : '#666',
          }}
        >
          <LayoutDashboard style={{ width: 18, height: 18 }} className="shrink-0" />
          <span className={`
            truncate whitespace-nowrap transition-opacity duration-200
            ${isExpanded ? 'md:opacity-100' : 'md:opacity-0 md:w-0'}
            lg:opacity-100 lg:w-auto
          `}>
            Dashboard
          </span>
        </button>
      </div>

      {/* Role-aware navigation sections */}
      <div className="flex-1 overflow-y-auto">
        <CogniSidebarNav onNavigate={onClose} collapsed={!isExpanded} />
      </div>
    </aside>
  );
}
