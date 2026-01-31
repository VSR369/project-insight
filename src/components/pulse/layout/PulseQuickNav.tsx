import { Flame, Video, Mic, Zap, FileText, Images, Layers } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
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
      className="hidden lg:flex items-center justify-center gap-0.5 px-2 py-1.5"
      aria-label="Pulse navigation"
      role="navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        const Icon = item.icon;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", isActive && "stroke-[2.5]")} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
