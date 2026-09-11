import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded border border-dashed border-border px-4 py-8">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="text-sm text-ink-muted">{description}</p>
      )}
      {action}
    </div>
  );
}
