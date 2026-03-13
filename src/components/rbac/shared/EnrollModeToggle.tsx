/**
 * EnrollModeToggle — Reusable Direct/Invite assignment mode toggle.
 * Shared between AssignRoleSheet and MsmeQuickAssignModal.
 */

import { Send, Zap } from "lucide-react";

export type EnrollMode = "invite" | "direct";

interface EnrollModeToggleProps {
  mode: EnrollMode;
  onModeChange: (mode: EnrollMode) => void;
  /** Which button appears first. Default: "invite" */
  primaryOption?: EnrollMode;
}

export function EnrollModeToggle({
  mode,
  onModeChange,
  primaryOption = "invite",
}: EnrollModeToggleProps) {
  const options: { value: EnrollMode; label: string; icon: typeof Send }[] =
    primaryOption === "direct"
      ? [
          { value: "direct", label: "Direct", icon: Zap },
          { value: "invite", label: "Invite", icon: Send },
        ]
      : [
          { value: "invite", label: "Invite", icon: Send },
          { value: "direct", label: "Direct", icon: Zap },
        ];

  const description =
    mode === "invite"
      ? "User receives an invitation and must accept before the role becomes active."
      : "Role is activated immediately. User receives a confirmation email.";

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <label className="text-xs font-semibold text-foreground mb-2 block">
        Assignment Mode
      </label>
      <div className="grid grid-cols-2 gap-1 bg-muted rounded-lg p-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onModeChange(opt.value)}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">{description}</p>
    </div>
  );
}
