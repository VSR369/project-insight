import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuorumMatrixCellProps {
  value: number;
  originalValue: number;
  minValue: number;
  maxValue: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

export function QuorumMatrixCell({
  value,
  originalValue,
  minValue,
  maxValue,
  onIncrement,
  onDecrement,
  disabled = false,
}: QuorumMatrixCellProps) {
  const hasChanged = value !== originalValue;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 p-1 rounded-md transition-all",
        hasChanged && "ring-2 ring-primary ring-offset-1 bg-primary/5"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-sm"
        onClick={onDecrement}
        disabled={disabled || value <= minValue}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span
        className={cn(
          "w-6 text-center font-semibold text-sm",
          hasChanged && "text-primary"
        )}
      >
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-sm"
        onClick={onIncrement}
        disabled={disabled || value >= maxValue}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
