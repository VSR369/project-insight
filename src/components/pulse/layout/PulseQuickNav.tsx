import { Flame, Video, Mic, Zap, FileText, Images, Layers, LayoutDashboard } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, isExternal: true },
  { path: '/pulse/feed', label: 'Feed', icon: Flame },
  { path: '/pulse/reels', label: 'Reels', icon: Video },
  { path: '/pulse/podcasts', label: 'Podcast', icon: Mic },
  { path: '/pulse/sparks', label: 'Spark', icon: Zap },
  { path: '/pulse/articles', label: 'Article', icon: FileText },
  { path: '/pulse/gallery', label: 'Gallery', icon: Images },
  { path: '/pulse/cards', label: 'Pulse Cards', icon: Layers },
];

export function PulseQuickNav() {
  const location = useLocation();

  return (
    <nav 
      className="hidden lg:flex items-center justify-center gap-0.5 px-2 py-1.5 overflow-x-auto scrollbar-hide"
      aria-label="Pulse navigation"
      role="navigation"
    >
      {NAV_ITEMS.map((item) => {
        // For dashboard link, never show as "active" since it's external to Pulse
        const isActive = item.isExternal ? false : location.pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-md text-[11px] lg:text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "min-h-[36px]",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", isActive && "stroke-[2.5]")} aria-hidden="true" />
            <span className="hidden xl:inline">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
