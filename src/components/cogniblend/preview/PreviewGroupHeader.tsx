/**
 * PreviewGroupHeader — Group divider with icon and title.
 */

interface PreviewGroupHeaderProps {
  id: string;
  icon: string;
  label: string;
}

export function PreviewGroupHeader({ id, icon, label }: PreviewGroupHeaderProps) {
  return (
    <div id={`preview-group-${id}`} className="mt-12 mb-6 pt-6 border-t-2 border-foreground/10 first:mt-0 first:pt-0 first:border-t-0">
      <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
      </h2>
    </div>
  );
}
