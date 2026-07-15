"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { Input } from "@/components/SearchBox";

/**
 * LoginForm — 幹部登入表單（唯一互動處，故 client）。
 * POST /api/auth/login → 成功後前往 next（伺服端已白名單化，僅接受站內相對路徑）。
 * next 由 server 頁面讀 searchParams 後傳入，避免 useSearchParams 的 Suspense 需求。
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || copy.login.form.errorInvalid);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError(copy.login.form.errorNetwork);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="login-email" className="font-sans text-caption font-medium text-ink">
          {copy.login.form.emailLabel}
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.login.form.emailPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="font-sans text-caption font-medium text-ink">
          {copy.login.form.passwordLabel}
        </label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={copy.login.form.passwordPlaceholder}
        />
      </div>

      {error ? (
        <p role="alert" className="font-sans text-caption text-warn-ink">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 border border-ink bg-ink px-4 py-2.5 font-ui text-caption font-medium leading-none tracking-snug text-white transition-colors hover:border-accent hover:bg-accent disabled:opacity-60"
      >
        {loading ? copy.login.form.submitting : copy.login.form.submit}
      </button>

      <p className="font-sans text-caption text-meta">{copy.login.form.noAccount}</p>
    </form>
  );
}
