"use client";

import { Footprints } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCurrentMember,
  useHousehold,
} from "@/components/providers/household-provider";
import { createClient } from "@/lib/supabase/client";

export function QuickWalkButton({
  onLogged,
}: {
  onLogged?: () => void;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [saving, setSaving] = useState(false);

  async function log() {
    if (saving) return;
    setSaving(true);
    const now = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase.from("items").insert({
      household_id: household.id,
      type: "walk",
      scope: "family",
      title: "Paseo",
      due_at: now,
      completed_at: now,
      created_by: currentMember.id,
      data: {
        by: currentMember.display_name,
      },
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success("Paseo registrado");
    onLogged?.();
  }

  return (
    <Button
      type="button"
      onClick={log}
      disabled={saving}
      size="lg"
      className="w-full gap-2"
    >
      <Footprints className="h-5 w-5" />
      {saving ? "Guardando…" : "Paseo completado"}
    </Button>
  );
}
