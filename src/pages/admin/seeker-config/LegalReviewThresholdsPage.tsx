/**
 * LegalReviewThresholdsPage — Admin CRUD for md_legal_review_thresholds.
 */

import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLegalReviewThresholds, useCreateThreshold, useDeleteThreshold } from '@/hooks/queries/useLegalReviewThresholds';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

interface CountryOption { id: string; code: string; name: string; }

function useCountries() {
  return useQuery<CountryOption[]>({
    queryKey: ['countries-active'],
    queryFn: async () => {
      const { data } = await supabase.from('countries').select('id, code, name').eq('is_active', true).order('name');
      return (data ?? []) as CountryOption[];
    },
    staleTime: 15 * 60_000,
  });
}

export default function LegalReviewThresholdsPage() {
  const { data: thresholds, isLoading } = useLegalReviewThresholds();
  const { data: countries = [] } = useCountries();
  const createMut = useCreateThreshold();
  const deleteMut = useDeleteThreshold();

  const [countryId, setCountryId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('50000');
  const [mode, setMode] = useState('STRUCTURED');

  const handleAdd = () => {
    if (!countryId || !amount) return;
    createMut.mutate({ country_id: countryId, currency_code: currency, threshold_amount: Number(amount), governance_mode: mode });
    setCountryId(''); setAmount('50000');
  };

  const getCountryName = (cId: string) => countries.find((c) => c.id === cId)?.name ?? cId;

  return (
    <FeatureErrorBoundary featureName="Legal Review Thresholds">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" /> Legal Review Thresholds
          </h1>
          <p className="text-muted-foreground mt-1">Configure prize thresholds per country that trigger mandatory legal review.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Threshold</CardTitle>
            <CardDescription>Set the prize amount above which a separate Legal Coordinator review is required.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-3">
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
              </Select>
              <Input className="w-full lg:w-28" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              <Input className="w-full lg:w-36" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRUCTURED">STRUCTURED</SelectItem>
                  <SelectItem value="CONTROLLED">CONTROLLED</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={createMut.isPending}>Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !thresholds?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No thresholds configured yet.</p>
            ) : (
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{getCountryName(t.country_id)}</TableCell>
                        <TableCell>{t.currency_code}</TableCell>
                        <TableCell className="text-right font-mono">{Number(t.threshold_amount).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline">{t.governance_mode}</Badge></TableCell>
                        <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell>
                          {t.is_active && (
                            <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(t.id)} disabled={deleteMut.isPending}>
                              Deactivate
                            </Button>
                          )}
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
    </FeatureErrorBoundary>
  );
}
