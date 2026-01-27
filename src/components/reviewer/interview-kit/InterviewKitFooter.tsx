import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewKitFooterProps {
  allRated: boolean;
  onExport: () => void;
}

export function InterviewKitFooter({ allRated, onExport }: InterviewKitFooterProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        Complete all ratings to export the final scorecard
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={!allRated}
        onClick={onExport}
        className="gap-2"
      >
        <FileDown className="h-4 w-4" />
        Export Scorecard PDF
      </Button>
    </div>
  );
}
