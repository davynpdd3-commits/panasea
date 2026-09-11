"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiBody } from "@/types/api";

interface LoginResponseData {
  user: { id: string; name: string; email: string; role: string };
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as ApiBody<LoginResponseData>;

      if (body.success) {
        router.push("/");
        router.refresh();
        return;
      }

      if (body.error.code === "VALIDATION_ERROR") {
        const details = body.error.details as
          | { fieldErrors?: Record<string, string[]> }
          | undefined;
        const emailError = details?.fieldErrors?.email?.[0];
        const passwordError = details?.fieldErrors?.password?.[0];
        setFieldErrors({ email: emailError, password: passwordError });
        if (!emailError && !passwordError) {
          setFormError(body.error.message);
        }
        return;
      }

      // INVALID_CREDENTIALS, ACCOUNT_INACTIVE, and anything unexpected all
      // just need their message shown — the API already keeps these
      // messages safe (see src/lib/errors.ts).
      setFormError(body.error.message);
    } catch {
      setFormError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl text-ink">PANASEA</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Masuk untuk melanjutkan ke sistem kasir.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-md border border-border bg-surface p-6 shadow-subtle"
        >
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                disabled={submitting}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[38px] text-ink-subtle hover:text-ink-muted"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={submitting}>
            {submitting ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
