/**
 * AllRolesSummaryWidget — Shows pending action counts for all user roles.
 * Visible when user has 2+ roles. Click a card to switch workspace role.
 */

import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_COLORS, ROLE_DISPLAY } from '@/types/cogniRoles';

export function AllRolesSummaryWidget() {
  const {
    activeRole,
    availableRoles,
    setActiveRole,
    roleChallengeCount,
  } = useCogniRoleContext();

  if (availableRoles.length < 2) return null;

  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Your Roles</h3>
      <div className="flex flex-wrap gap-2">
        {availableRoles.map((code) => {
          const color = ROLE_COLORS[code];
          const label = ROLE_DISPLAY[code] ?? code;
          const count = roleChallengeCount[code] ?? 0;
          const isActive = code === activeRole;

          return (
            <button
              key={code}
              onClick={() => setActiveRole(code)}
              className={`
                flex items-center gap-2 rounded-lg border px-3 py-2 text-sm
                transition-all hover:shadow-sm
                ${isActive
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/30'
                }
              `}
            >
              <span
                className="inline-flex items-center justify-center rounded-full font-bold shrink-0"
                style={{
                  fontSize: 10,
                  width: 28,
                  height: 20,
                  backgroundColor: color?.bg ?? 'hsl(var(--muted))',
                  color: color?.color ?? 'hsl(var(--muted-foreground))',
                }}
              >
                {color?.label ?? code}
              </span>
              <span className="font-medium text-foreground hidden lg:inline">{label}</span>
              {count > 0 && (
                <span className="text-xs font-semibold text-primary tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        Click any role to switch workspace
      </p>
    </div>
  );
}
