/**
 * Active Challenges Blocker (ORG-001)
 * 
 * Shows a list of active challenges that block engagement model switching.
 * Used inline in EngagementModelTab when switching is not possible.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BlockingChallenge {
  id: string;
  title: string;
  status: string;
}

interface ActiveChallengesBlockerProps {
  challenges: BlockingChallenge[];
  actionLabel?: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'active': return <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>;
    case 'in_progress': return <Badge className="bg-primary/10 text-primary border-primary/20">In Progress</Badge>;
    case 'awarded': return <Badge variant="secondary">Awarded</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export function ActiveChallengesBlocker({
  challenges,
  actionLabel = 'Complete or close these challenges to proceed.',
}: ActiveChallengesBlockerProps) {
  const navigate = useNavigate();

  if (challenges.length === 0) return null;

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {challenges.length} Active Challenge{challenges.length > 1 ? 's' : ''} Blocking This Action
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{actionLabel}</p>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell className="font-medium text-sm">{challenge.title}</TableCell>
                  <TableCell>{statusBadge(challenge.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/org/challenges/${challenge.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
