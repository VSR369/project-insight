/**
 * Org picker — lightweight typeahead over seeker_organizations
 * to pick a target org for creating an Enterprise agreement.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  onSelect: (orgId: string, orgName: string) => void;
}

export function OrgPicker({ onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Light debounce
  useDebounce(search, setDebounced, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['enterprise', 'org-picker', debounced],
    queryFn: async () => {
      if (!debounced || debounced.length < 2) return [];
      const { data, error } = await supabase
        .from('seeker_organizations')
        .select('id, legal_entity_name')
        .ilike('legal_entity_name', `%${debounced}%`)
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: debounced.length >= 2,
    staleTime: 30 * 1000,
  });

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search organizations by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading && <Skeleton className="h-10 w-full" />}
      {data && data.length > 0 && (
        <div className="rounded-md border border-border divide-y divide-border max-h-64 overflow-auto">
          {data.map((org) => (
            <div
              key={org.id}
              className="flex items-center justify-between gap-2 p-2 text-sm"
            >
              <span className="truncate">{org.legal_entity_name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelect(org.id, org.legal_entity_name ?? '')}
              >
                Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny debounce helper local to this picker.
import { useEffect } from 'react';
function useDebounce(value: string, set: (v: string) => void, delay: number) {
  useEffect(() => {
    const t = setTimeout(() => set(value), delay);
    return () => clearTimeout(t);
  }, [value, set, delay]);
}
