import { Flag, FileEdit, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReviewActionsCardProps {
  onFlagForClarification?: () => void;
  onAddNote?: () => void;
  isFlagged?: boolean;
}

export function ReviewActionsCard({ 
  onFlagForClarification, 
  onAddNote,
  isFlagged = false 
}: ReviewActionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          📋 Review Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button 
            variant={isFlagged ? "destructive" : "outline"}
            className="gap-2"
            onClick={onFlagForClarification}
          >
            <Flag className="h-4 w-4" />
            {isFlagged ? "Flagged for Clarification" : "Flag for Clarification"}
          </Button>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={onAddNote}
          >
            <FileEdit className="h-4 w-4" />
            Add Reviewer Note
          </Button>
        </div>

        <Alert className="bg-muted/50 border-muted-foreground/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Flagging creates an internal note and does not notify the provider yet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
