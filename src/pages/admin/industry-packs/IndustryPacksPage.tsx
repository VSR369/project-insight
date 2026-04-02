/**
 * IndustryPacksPage — Lists all industry knowledge packs for admin management.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Pencil, Factory } from 'lucide-react';
import { IndustryPackEditor } from '@/components/admin/industry-packs/IndustryPackEditor';
import { format } from 'date-fns';

export default function IndustryPacksPage() {
  const [editingPack, setEditingPack] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: packs, isLoading, refetch } = useQuery({
    queryKey: ['industryKnowledgePacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_knowledge_packs' as any)
        .select('*')
        .order('industry_name');
      if (error) throw new Error(error.message);
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleEdit = (pack: any) => {
    setEditingPack(pack);
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setEditingPack(null);
  };

  const handleSave = () => {
    refetch();
    handleClose();
  };

  const countHints = (hints: any) => {
    if (!hints || typeof hints !== 'object') return 0;
    return Object.keys(hints).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry Knowledge Packs"
        description="Manage industry-specific intelligence injected into AI review prompts"
        icon={Factory}
      />

      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Industry Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center"># Section Hints</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                  </TableRow>
                ) : !packs?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No industry packs found</TableCell>
                  </TableRow>
                ) : (
                  packs.map((pack) => (
                    <TableRow key={pack.id}>
                      <TableCell className="font-medium">{pack.industry_name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{pack.industry_code}</code></TableCell>
                      <TableCell className="text-center">{countHints(pack.section_hints)}</TableCell>
                      <TableCell>
                        <Badge variant={pack.is_active ? 'default' : 'secondary'}>
                          {pack.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pack.updated_at ? format(new Date(pack.updated_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pack)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Edit Industry Pack</SheetTitle>
          </SheetHeader>
          {editingPack && (
            <IndustryPackEditor pack={editingPack} onSave={handleSave} onClose={handleClose} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
