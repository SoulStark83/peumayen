"use client";

import { Footprints, Scale, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Item } from "@/lib/types";
import { VetLog } from "./vet-log";
import { WalksLog } from "./walks-log";
import { WeightLog } from "./weight-log";

export function RomaView({
  initialWalks,
  initialWeights,
  initialVet,
}: {
  initialWalks: Item[];
  initialWeights: Item[];
  initialVet: Item[];
}) {
  const [tab, setTab] = useState<"walks" | "weight" | "vet">("walks");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-xl font-semibold">Roma 🐾</h2>
        <p className="text-muted-foreground text-xs">
          Paseos, peso y salud de la perra.
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "walks" | "weight" | "vet")}
        className="flex h-full flex-col overflow-hidden"
      >
        <div className="flex items-center justify-center border-b px-3 py-2">
          <TabsList>
            <TabsTrigger value="walks" className="gap-1.5">
              <Footprints className="h-4 w-4" />
              Paseos
            </TabsTrigger>
            <TabsTrigger value="weight" className="gap-1.5">
              <Scale className="h-4 w-4" />
              Peso
            </TabsTrigger>
            <TabsTrigger value="vet" className="gap-1.5">
              <Stethoscope className="h-4 w-4" />
              Vet
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl p-4 pb-6">
            <TabsContent value="walks" className="mt-0">
              <WalksLog initial={initialWalks} />
            </TabsContent>
            <TabsContent value="weight" className="mt-0">
              <WeightLog initial={initialWeights} />
            </TabsContent>
            <TabsContent value="vet" className="mt-0">
              <VetLog initial={initialVet} />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
