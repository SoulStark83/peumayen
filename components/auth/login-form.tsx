"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const email = usernameToEmail(username);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setSubmitting(false);
      setError("Hmm, ese usuario o contraseña no coinciden.");
      return;
    }

    const next = searchParams.get("next") ?? "/";
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      {/* Branding emocional */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/12 text-5xl shadow-sm">
          🏡
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Peumayen</h1>
          <p className="text-muted-foreground text-base">
            Tu familia te espera.
          </p>
        </div>
      </div>

      {/* Campos */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="username" className="text-sm font-semibold">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            pattern="^[a-zA-Z0-9_]{3,20}$"
            title="Entre 3 y 20 caracteres: letras, números o guión bajo."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tu_nombre"
            className="border-input bg-card focus-visible:ring-primary/30 h-12 w-full rounded-2xl border px-4 text-base outline-none transition focus-visible:ring-[3px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="border-input bg-card focus-visible:ring-primary/30 h-12 w-full rounded-2xl border px-4 text-base outline-none transition focus-visible:ring-[3px]"
          />
        </div>

        {/* Error — tono humano */}
        {error && (
          <div className="rounded-2xl bg-destructive/8 px-4 py-3">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Botón pill grande */}
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold shadow-md transition-all disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="animate-spin text-lg">⏳</span>
              Entrando…
            </>
          ) : (
            <>
              Entrar a casa
              <span className="text-lg">→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
