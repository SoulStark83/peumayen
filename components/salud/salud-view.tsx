"use client";

import { AlignJustify, Sparkles } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Item } from "@/lib/types";
import { CicloTab } from "./ciclo-tab";
import { RetentoresTab } from "./retenedores-tab";

export function SaludView({
  memberId,
  householdId,
  initialPeriod,
  initialRetainer,
  initialSettings,
  initialTab = "ciclo",
}: {
  memberId: string;
  householdId: string;
  initialPeriod: Item[];
  initialRetainer: Item[];
  initialSettings: Item | null;
  initialTab?: "ciclo" | "retenedores";
}) {
  const [tab, setTab] = useState<"ciclo" | "retenedores">(initialTab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-xl font-semibold">Salud</h2>
        <p className="text-muted-foreground text-xs">Ciclo y retenedores.</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "ciclo" | "retenedores")}
        className="flex h-full flex-col overflow-hidden"
      >
        <div className="flex items-center justify-center border-b px-3 py-2">
          <TabsList>
            <TabsTrigger value="ciclo" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Ciclo
            </TabsTrigger>
            <TabsTrigger value="retenedores" className="gap-1.5">
              <AlignJustify className="h-4 w-4" />
              Retenedores
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl p-4 pb-6">
            <TabsContent value="ciclo" className="mt-0">
              <CicloTab
                memberId={memberId}
                householdId={householdId}
                initialPeriod={initialPeriod}
                initialSettings={initialSettings}
              />
            </TabsContent>
            <TabsContent value="retenedores" className="mt-0">
              <RetentoresTab
                memberId={memberId}
                householdId={householdId}
                initialRetainer={initialRetainer}
                initialSettings={initialSettings}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
