import { Spinner } from "@/components/ui/spinner";

export function LoadingState({ label = "Memuat data..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-ink-muted">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
