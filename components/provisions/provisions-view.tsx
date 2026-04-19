"use client";

import { Archive, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { PantryList } from "@/components/pantry/pantry-list";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Item } from "@/lib/types";

export function ProvisionsView({
  initialShopping,
  initialPantry,
}: {
  initialShopping: Item[];
  initialPantry: Item[];
}) {
  const [tab, setTab] = useState<"shopping" | "pantry">("shopping");

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "shopping" | "pantry")}
      className="h-full"
    >
      <div className="flex items-center justify-center border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="shopping" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="pantry" className="gap-1.5">
            <Archive className="h-4 w-4" />
            Despensa
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="shopping" className="mt-0 h-full overflow-hidden">
        <ShoppingList initial={initialShopping} />
      </TabsContent>
      <TabsContent value="pantry" className="mt-0 h-full overflow-hidden">
        <PantryList initial={initialPantry} />
      </TabsContent>
    </Tabs>
  );
}
