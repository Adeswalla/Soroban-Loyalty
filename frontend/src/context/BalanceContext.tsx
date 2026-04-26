"use client";

import { createContext, useContext, ReactNode } from "react";

interface BalanceContextType {
  refetchBalance: () => void;
}

const BalanceContext = createContext<BalanceContextType | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const refetchBalance = () => {
    // This will be set by the hook
  };

  return (
    <BalanceContext.Provider value={{ refetchBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalanceRefetch() {
  const context = useContext(BalanceContext);
  if (!context) throw new Error("useBalanceRefetch must be used within BalanceProvider");
  return context.refetchBalance;
}