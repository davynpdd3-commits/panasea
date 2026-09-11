"use client";

import { useEffect, useState } from "react";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import type { ApiBody } from "@/types/api";

interface HealthData {
  status: string;
  database: string;
  latencyMs: number;
  timestamp: string;
}

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: HealthData }
  | { status: "error"; message: string };

function useHealthCheck() {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch("/api/health")
      .then((res) => res.json() as Promise<ApiBody<HealthData>>)
      .then((body) => {
        if (cancelled) return;
        if (body.success) {
          setState({ status: "success", data: body.data });
        } else {
          setState({ status: "error", message: body.error.message });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Tidak dapat menghubungi server.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { state, retry: () => setAttempt((a) => a + 1) };
}

export function SystemStatusPanel() {
  const { state, retry } = useHealthCheck();

  if (state.status === "loading") {
    return <LoadingState label="Memeriksa koneksi database..." />;
  }

  if (state.status === "error") {
    return (
      <div className="mt-3">
        <ErrorState
          title="Pemeriksaan sistem gagal"
          message={state.message}
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-ink-subtle">API</dt>
        <dd className="text-ink">{state.data.status}</dd>
      </div>
      <div>
        <dt className="text-ink-subtle">Database</dt>
        <dd className="text-ink">{state.data.database}</dd>
      </div>
      <div>
        <dt className="text-ink-subtle">Latensi</dt>
        <dd className="text-ink">{state.data.latencyMs} ms</dd>
      </div>
      <div>
        <dt className="text-ink-subtle">Diperiksa pukul</dt>
        <dd className="text-ink">
          {new Date(state.data.timestamp).toLocaleTimeString("id-ID")}
        </dd>
      </div>
    </dl>
  );
}
