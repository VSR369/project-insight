import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skeleton loading placeholder component
 * PERFORMANCE: Uses forwardRef to prevent React ref warnings
 */
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
