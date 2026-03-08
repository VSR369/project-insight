/**
 * EligibleAdminsTable — Ranked admins table for MOD-M-04
 */
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EligibleAdmin } from '@/hooks/queries/useEligibleAdmins';

interface Props {
  admins: EligibleAdmin[];
  selectedAdminId: string | null;
  onSelect: (adminId: string) => void;
}

export function EligibleAdminsTable({ admins, selectedAdminId, onSelect }: Props) {
  return (
    <div className="relative w-full overflow-auto border rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left w-8" />
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-center">Availability</th>
            <th className="p-2 text-center">Score</th>
            <th className="p-2 text-center">L1/L2/L3</th>
            <th className="p-2 text-center">Workload</th>
            <th className="p-2 text-center">Priority</th>
          </tr>
        </thead>
        <tbody>
          {admins.map(admin => (
            <tr
              key={admin.admin_id}
              className={`border-b last:border-0 cursor-pointer transition-colors ${
                selectedAdminId === admin.admin_id ? 'bg-primary/5' : 'hover:bg-muted/30'
              } ${admin.is_fully_loaded ? 'opacity-60' : ''}`}
              onClick={() => !admin.is_fully_loaded && onSelect(admin.admin_id)}
            >
              <td className="p-2 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <input
                      type="radio"
                      name="eligible-admin"
                      checked={selectedAdminId === admin.admin_id}
                      disabled={admin.is_fully_loaded}
                      onChange={() => onSelect(admin.admin_id)}
                      className="accent-primary"
                    />
                  </TooltipTrigger>
                  {admin.is_fully_loaded && (
                    <TooltipContent>Fully loaded — cannot accept more verifications</TooltipContent>
                  )}
                </Tooltip>
              </td>
              <td className="p-2 font-medium">
                {admin.full_name}
                {admin.is_fully_loaded && (
                  <Badge variant="destructive" className="ml-2 text-xs">Full</Badge>
                )}
              </td>
              <td className="p-2 text-center">
                <Badge variant="outline" className="text-xs">{admin.availability_status}</Badge>
              </td>
              <td className="p-2 text-center font-mono text-xs">{admin.total_score}</td>
              <td className="p-2 text-center font-mono text-xs">
                {admin.l1_score}/{admin.l2_score}/{admin.l3_score}
              </td>
              <td className="p-2">
                <div className="flex items-center gap-1.5">
                  <Progress
                    value={(admin.current_active / Math.max(admin.max_concurrent, 1)) * 100}
                    className="h-2 w-16"
                  />
                  <span className="text-xs text-muted-foreground">
                    {admin.current_active}/{admin.max_concurrent}
                  </span>
                </div>
              </td>
              <td className="p-2 text-center text-xs">{admin.assignment_priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
