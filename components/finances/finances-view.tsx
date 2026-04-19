"use client";

import { PieChart, Repeat, Wallet } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Item } from "@/lib/types";
import { SubscriptionsList } from "./subscriptions-list";
import { SummaryTab } from "./summary-tab";
import { TransactionsList } from "./transactions-list";

type TabKey = "transactions" | "summary" | "subscriptions";

export function FinancesView({
  initialTransactions,
  initialSubscriptions,
  initialLoadedMonths,
}: {
  initialTransactions: Item[];
  initialSubscriptions: Item[];
  initialLoadedMonths: string[];
}) {
  const [tab, setTab] = useState<TabKey>("transactions");
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as TabKey)}
      className="h-full"
    >
      <div className="flex items-center justify-center border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="transactions" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-1.5">
            <PieChart className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <Repeat className="h-4 w-4" />
            Suscripciones
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="transactions" className="mt-0 h-full overflow-hidden">
        <TransactionsList
          initial={initialTransactions}
          initialLoadedMonths={initialLoadedMonths}
        />
      </TabsContent>
      <TabsContent value="summary" className="mt-0 h-full overflow-hidden">
        <SummaryTab
          initial={initialTransactions}
          initialLoadedMonths={initialLoadedMonths}
        />
      </TabsContent>
      <TabsContent value="subscriptions" className="mt-0 h-full overflow-hidden">
        <SubscriptionsList initial={initialSubscriptions} />
      </TabsContent>
    </Tabs>
  );
}
