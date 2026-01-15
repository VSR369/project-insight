import * as React from "react";
import { format } from "date-fns";
import { Eye, Pencil } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ViewField {
  label: string;
  value: unknown;
  type?: "text" | "boolean" | "date" | "number" | "badge" | "textarea";
}

interface MasterDataViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: ViewField[];
  onEdit?: () => void;
}

function formatValue(value: unknown, type: ViewField["type"] = "text"): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Not set</span>;
  }

  switch (type) {
    case "boolean":
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      );

    case "date":
      try {
        const date = new Date(value as string);
        return format(date, "PPpp");
      } catch {
        return String(value);
      }

    case "number":
      return <span className="font-mono">{String(value)}</span>;

    case "badge":
      return <Badge variant="outline">{String(value)}</Badge>;

    case "textarea":
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {String(value)}
        </p>
      );

    case "text":
    default:
      return <span>{String(value)}</span>;
  }
}

export function MasterDataViewDialog({
  open,
  onOpenChange,
  title,
  fields,
  onEdit,
}: MasterDataViewDialogProps) {
  // Separate regular fields from metadata fields (created_at, updated_at)
  const metadataLabels = ["Created At", "Updated At", "Created By", "Updated By"];
  const regularFields = fields.filter((f) => !metadataLabels.includes(f.label));
  const metadataFields = fields.filter((f) => metadataLabels.includes(f.label));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            View complete details for this record
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {regularFields.map((field, index) => (
              <div key={index} className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </label>
                <div className="text-sm">
                  {formatValue(field.value, field.type)}
                </div>
              </div>
            ))}

            {metadataFields.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">
                  Metadata
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {metadataFields.map((field, index) => (
                    <div key={index} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </label>
                      <div className="text-xs">
                        {formatValue(field.value, field.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
