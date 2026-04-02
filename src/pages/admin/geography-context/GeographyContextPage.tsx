/**
 * GeographyContextPage — Lists all geography context regions for admin management.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pencil, Globe2 } from 'lucide-react';
import { GeographyContextEditor } from '@/components/admin/geography-context/GeographyContextEditor';

export default function GeographyContextPage() {
  const [editingCtx, setEditingCtx] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: regions, isLoading, refetch } = useQuery({
    queryKey: ['geographyContext'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geography_context' as any)
        .select('*')
        .order('region_name');
      if (error) throw new Error(error.message);
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleEdit = (ctx: any) => {
    setEditingCtx(ctx);
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setEditingCtx(null);
  };

  const handleSave = () => {
    refetch();
    handleClose();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geography Context"
        description="Manage region-specific context injected into AI review prompts"
        icon={Globe2}
      />

      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center"># Countries</TableHead>
                  <TableHead className="text-center"># Privacy Laws</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                  </TableRow>
                ) : !regions?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No regions found</TableCell>
                  </TableRow>
                ) : (
                  regions.map((ctx) => (
                    <TableRow key={ctx.region_code}>
                      <TableCell className="font-medium">{ctx.region_name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{ctx.region_code}</code></TableCell>
                      <TableCell className="text-center">{ctx.country_codes?.length || 0}</TableCell>
                      <TableCell className="text-center">{ctx.data_privacy_laws?.length || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ctx)}>
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
        <SheetContent className="w-full max-w-xl overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Edit Geography Context</SheetTitle>
          </SheetHeader>
          {editingCtx && (
            <GeographyContextEditor context={editingCtx} onSave={handleSave} onClose={handleClose} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
