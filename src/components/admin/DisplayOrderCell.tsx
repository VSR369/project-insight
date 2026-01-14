import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DisplayOrderCellProps {
  order: number | null;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  disabled?: boolean;
}

export function DisplayOrderCell({
  order,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  disabled = false,
}: DisplayOrderCellProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 text-center text-muted-foreground">
        {order ?? "—"}
      </span>
      {(onMoveUp || onMoveDown) && (
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveUp}
            disabled={disabled || isFirst || !onMoveUp}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveDown}
            disabled={disabled || isLast || !onMoveDown}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
