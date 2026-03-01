/**
 * Shared read-only field component for review/detail cards.
 * Displays a label and formatted value in a consistent layout.
 * Use `Label` from `@/components/ui/label` only outside form contexts.
 */
interface ReviewFieldProps {
  /** Descriptive label shown above the value */
  label: string;
  /** Value to display — booleans render as Yes/No, nullish renders as em dash */
  value?: string | number | null | boolean;
}

/** Reusable read-only field for review cards in the Seeker Org Approvals module. */
export function ReviewField({ label, value }: ReviewFieldProps) {
  const display =
    typeof value === 'boolean'
      ? value
        ? 'Yes'
        : 'No'
      : (value ?? '—');

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{String(display)}</p>
    </div>
  );
}
