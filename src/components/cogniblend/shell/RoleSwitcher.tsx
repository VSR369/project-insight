/**
 * RoleSwitcher — Compact dropdown in the top bar for switching active workspace role.
 * Shows a colored pill with the active role; dropdown lists all available roles with counts.
 */

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Zap } from 'lucide-react';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_COLORS, ROLE_DISPLAY } from '@/types/cogniRoles';

export function RoleSwitcher() {
  // ══════════════════════════════════════
  // SECTION 1: useState
  // ══════════════════════════════════════
  const [open, setOpen] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Context and custom hooks
  // ══════════════════════════════════════
  const {
    activeRole,
    availableRoles,
    isSoloMode,
    setActiveRole,
    roleChallengeCount,
  } = useCogniRoleContext();
  const ref = useRef<HTMLDivElement>(null);

  // ══════════════════════════════════════
  // SECTION 5: useEffect
  // ══════════════════════════════════════
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ══════════════════════════════════════
  // SECTION 6: Conditional returns
  // ══════════════════════════════════════
  if (!activeRole || availableRoles.length === 0) return null;

  const activeColor = ROLE_COLORS[activeRole];
  const activeLabel = ROLE_DISPLAY[activeRole] ?? activeRole;

  // Single role → static badge, no dropdown
  if (availableRoles.length === 1) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full font-semibold text-xs px-2.5 py-1"
        style={{
          backgroundColor: activeColor?.bg ?? 'hsl(var(--muted))',
          color: activeColor?.color ?? 'hsl(var(--muted-foreground))',
        }}
      >
        {activeColor?.label ?? activeRole}
        <span className="hidden lg:inline ml-0.5">{activeLabel}</span>
      </span>
    );
  }

  // ══════════════════════════════════════
  // SECTION 8: Render
  // ══════════════════════════════════════
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full font-semibold text-xs px-2.5 py-1 transition-colors hover:ring-2 hover:ring-primary/20"
        style={{
          backgroundColor: activeColor?.bg ?? 'hsl(var(--muted))',
          color: activeColor?.color ?? 'hsl(var(--muted-foreground))',
        }}
        aria-label="Switch workspace role"
      >
        {activeColor?.label ?? activeRole}
        <span className="hidden lg:inline">{activeLabel}</span>
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 bg-white border shadow-lg overflow-hidden z-50"
          style={{ width: 260, borderRadius: 12, borderColor: 'hsl(var(--border))' }}
        >
          {/* Solo Mode banner */}
          {isSoloMode && (
            <div
              className="px-3 py-2 flex items-center gap-2 border-b"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                Solo Mode
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {availableRoles.length} roles
              </span>
            </div>
          )}

          <div className="py-1">
            <div className="px-3 py-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Switch Workspace
              </span>
            </div>

            {availableRoles.map((code) => {
              const color = ROLE_COLORS[code];
              const label = ROLE_DISPLAY[code] ?? code;
              const isActive = code === activeRole;
              const count = roleChallengeCount[code] ?? 0;

              return (
                <button
                  key={code}
                  onClick={() => {
                    setActiveRole(code);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                  style={{
                    backgroundColor: isActive ? 'hsl(var(--accent))' : undefined,
                  }}
                >
                  {/* Role badge */}
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

                  {/* Role name */}
                  <span className="flex-1 text-left text-foreground font-medium truncate">
                    {label}
                  </span>

                  {/* Challenge count */}
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {count}
                    </span>
                  )}

                  {/* Checkmark */}
                  {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
