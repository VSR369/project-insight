import { Home, Zap, Layers, PlusCircle, Trophy, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/pulse/feed', label: 'Feed', icon: Home },
  { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
  { path: '/pulse/cards', label: 'Cards', icon: Layers },
  { path: '/pulse/create', label: 'Create', icon: PlusCircle },
  { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
  { path: '/pulse/profile', label: 'Profile', icon: User },
];

export function PulseBottomNav() {
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-t border-border z-50 pb-safe"
      aria-label="Pulse navigation"
      role="navigation"
    >
      <div className="h-full max-w-lg mx-auto flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          // Special styling for Create button
          const isCreate = item.path === '/pulse/create';
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px] min-h-[44px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground focus-visible:text-foreground"
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              {isCreate ? (
                <div 
                  className="h-10 w-10 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-lg"
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
              ) : (
                <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5]")} aria-hidden="true" />
              )}
              <span className={cn(
                "text-[10px] font-medium",
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
