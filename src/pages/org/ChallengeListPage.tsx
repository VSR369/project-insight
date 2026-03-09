/**
 * ChallengeListPage — DataTable listing all challenges for the org.
 * Filters: status, complexity. Empty state with CTA.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useOrgContext } from '@/contexts/OrgContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { PlusCircle, Briefcase, Search } from 'lucide-react';
import { format } from 'date-fns';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  active: 'default',
  closed: 'secondary',
  cancelled: 'destructive',
};

export default function ChallengeListPage() {
  const { organizationId } = useOrgContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['org_challenges', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, status, created_at, solutions_awarded, is_active')
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });

  const filtered = challenges?.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's challenges</p>
      </div>
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-base"
            />
          </div>
          <Button onClick={() => navigate('/org/challenges/create')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !filtered?.length ? (
              <div className="text-center py-16 space-y-4">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
                <div>
                  <p className="font-medium text-foreground">No challenges yet</p>
                  <p className="text-sm text-muted-foreground">Create your first challenge to get started.</p>
                </div>
                <Button onClick={() => navigate('/org/challenges/create')}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Challenge
                </Button>
              </div>
            ) : (
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solutions</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[c.status] ?? 'outline'}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>{c.solutions_awarded}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
