import { Home, Zap, Layers, PlusCircle, Trophy, LayoutDashboard } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/pulse/feed', label: 'Feed', icon: Home },
  { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
  { path: '/pulse/create', label: 'Create', icon: PlusCircle },
  { path: '/pulse/cards', label: 'Cards', icon: Layers },
  { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
  { path: '/dashboard', label: 'Exit', icon: LayoutDashboard, isExternal: true },
];

export function PulseBottomNav() {
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-t border-border z-50 pb-safe"
      aria-label="Pulse navigation"
      role="navigation"
    >
      <div className="h-full w-full max-w-lg mx-auto flex items-center justify-around px-1 sm:px-2">
        {navItems.map((item) => {
          // For dashboard link, never show as "active" since it's external to Pulse
          const isActive = item.isExternal ? false : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          // Special styling for Create button
          const isCreate = item.path === '/pulse/create';
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 rounded-lg transition-colors min-w-[48px] sm:min-w-[56px] min-h-[44px] touch-target",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isCreate ? (
                <div 
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary flex items-center justify-center -mt-3 sm:-mt-4 shadow-lg"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
              ) : (
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", isActive && "stroke-[2.5]")} aria-hidden="true" />
              )}
              <span className={cn(
                "text-[9px] sm:text-[10px] font-medium",
                isCreate && "mt-0.5"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
