import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Gagal memuat data",
  message = "Terjadi kesalahan saat mengambil data. Coba lagi.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded border border-danger/30 bg-danger-bg px-4 py-4">
      <p className="text-sm font-medium text-danger">{title}</p>
      <p className="text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
