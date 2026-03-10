/**
 * PoolFilterBar — 4-dropdown filter bar for Resource Pool list (BR-POOL-003)
 * All options fetched from master data tables — no hardcoded values.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useProficiencyAreasLookup } from "@/hooks/queries/useProficiencyAreasLookup";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import type { PoolMemberFilters } from "@/hooks/queries/usePoolMembers";

interface PoolFilterBarProps {
  filters: PoolMemberFilters;
  onChange: (filters: PoolMemberFilters) => void;
}

export function PoolFilterBar({ filters, onChange }: PoolFilterBarProps) {
  const { data: industries } = useIndustrySegments();
  const { data: proficiencies } = useProficiencyLevels();
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: availabilityStatuses } = useAvailabilityStatuses();

  const setFilter = (key: keyof PoolMemberFilters, value: string) => {
    onChange({ ...filters, [key]: value === "all" ? undefined : value });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <Select value={filters.role ?? "all"} onValueChange={(v) => setFilter("role", v)}>
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {roleCodes?.map((r) => (
            <SelectItem key={r.code} value={r.code}>{r.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.industry ?? "all"} onValueChange={(v) => setFilter("industry", v)}>
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="All Industries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Industries</SelectItem>
          {industries?.map((ind) => (
            <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.proficiency ?? "all"} onValueChange={(v) => setFilter("proficiency", v)}>
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="All Proficiency Levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Proficiency Levels</SelectItem>
          {proficiencies?.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.availability ?? "all"} onValueChange={(v) => setFilter("availability", v)}>
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="All Availability" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Availability</SelectItem>
          {availabilityStatuses?.map((s) => (
            <SelectItem key={s.code} value={s.code}>{s.display_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
