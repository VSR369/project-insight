import { User, Flame, Video, Mic, Zap, FileText, Images, Layers } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/pulse/profile', label: 'Profile', icon: User },
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
      className="hidden lg:flex items-center justify-center gap-1 px-4 py-2"
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
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className={cn("h-4 w-4", isActive && "stroke-[2.5]")} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
