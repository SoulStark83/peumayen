"use client";

import { createContext, useContext, useState } from "react";

type AlertsCtx = { count: number; setCount: (n: number) => void };

const AlertsContext = createContext<AlertsCtx>({ count: 0, setCount: () => {} });

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <AlertsContext.Provider value={{ count, setCount }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertsContext);
}
