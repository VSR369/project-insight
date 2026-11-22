import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { PackageVersion } from '@/hooks/cogniblend/useManageChallenge';

interface ChallengePackageCardProps {
  versions: PackageVersion[];
}

export function ChallengePackageCard({ versions }: ChallengePackageCardProps) {
  const [activeSnapshot, setActiveSnapshot] = useState<PackageVersion | null>(null);
  const latest = versions.length > 0 ? versions[versions.length - 1] : undefined;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Package className="h-5 w-5 text-primary" /> Published Version
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latest ? (
            <p className="text-xs italic text-muted-foreground">No package versions found.</p>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                <span className="text-sm font-semibold text-foreground">Version {latest.versionNumber}.0</span>
                <span className="text-xs text-muted-foreground">
                  Published {format(new Date(latest.createdAt), 'dd MMM yyyy, HH:mm')}
                </span>
                <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={() => setActiveSnapshot(latest)}>
                  <Eye className="h-3.5 w-3.5" /> View Package
                </Button>
              </div>
              {versions.length > 1 && (
                <>
                  <Separator />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version History</h3>
                  <div className="relative w-full overflow-auto">
                    <table className="w-full text-left text-xs lg:text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Version</th>
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Date</th>
                          <th className="pb-2 pr-4 font-semibold text-muted-foreground">Changes</th>
                          <th className="pb-2 font-semibold text-muted-foreground" />
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((version) => (
                          <tr key={version.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-foreground">v{version.versionNumber}.0</td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {format(new Date(version.createdAt), 'dd MMM yyyy')}
                            </td>
                            <td className="max-w-[200px] truncate py-2 pr-4 text-muted-foreground">
                              {version.changeSummary ?? '—'}
                            </td>
                            <td className="py-2">
                              <Button variant="ghost" size="sm" className="h-11 gap-1" onClick={() => setActiveSnapshot(version)}>
                                <FileText className="h-3 w-3" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={activeSnapshot !== null} onOpenChange={(open) => !open && setActiveSnapshot(null)}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base font-bold">
              Challenge Package — v{activeSnapshot?.versionNumber ?? 1}.0
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              {activeSnapshot?.snapshot ? (
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                  {JSON.stringify(activeSnapshot.snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-sm italic text-muted-foreground">No snapshot data available.</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0">
            <Button variant="outline" size="sm" onClick={() => setActiveSnapshot(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
