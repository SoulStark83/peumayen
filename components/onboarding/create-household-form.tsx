"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type CreateHouseholdArgs = Database["public"]["Functions"]["create_household"]["Args"];

export function CreateHouseholdForm() {
  const router = useRouter();
  const [hhName, setHhName] = useState("Peumayen");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const args: CreateHouseholdArgs = {
      hh_name: hhName.trim(),
      admin_display_name: displayName.trim(),
    };
    // La inferencia del generic de `rpc` falla con el schema placeholder de
    // types/database.ts. Se resolverá al regenerar tipos reales tras aplicar
    // la migración (npm run db:types:remote). Ver TODO en types/database.ts.
    const { error: rpcError } = await (
      supabase.rpc as unknown as (
        fn: "create_household",
        args: CreateHouseholdArgs,
      ) => Promise<{ error: { message: string } | null; data: string | null }>
    )("create_household", args);

    if (rpcError) {
      setSubmitting(false);
      setError(rpcError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Crear hogar</h1>
        <p className="text-muted-foreground text-sm">
          Aún no estás en ningún hogar. Crea uno y serás su administrador.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="hh" className="text-sm font-medium">
          Nombre del hogar
        </label>
        <input
          id="hh"
          required
          maxLength={60}
          value={hhName}
          onChange={(e) => setHhName(e.target.value)}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="display" className="text-sm font-medium">
          Tu nombre
        </label>
        <input
          id="display"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Cómo te verán los demás"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {submitting ? "Creando…" : "Crear hogar"}
      </button>
    </form>
  );
}
