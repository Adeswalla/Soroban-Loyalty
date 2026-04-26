"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { getTokenBalance } from "@/lib/soroban";

export function useBalance() {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bal = await getTokenBalance(publicKey);
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll every 30 seconds when page is visible
  useEffect(() => {
    if (!publicKey) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBalance();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBalance();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [publicKey, fetchBalance]);

  // Listen for balance update events
  useEffect(() => {
    const handleBalanceUpdate = () => {
      fetchBalance();
    };

    window.addEventListener("balanceUpdate", handleBalanceUpdate);

    return () => {
      window.removeEventListener("balanceUpdate", handleBalanceUpdate);
    };
  }, [fetchBalance]);

  return { balance, loading, error, refetch: fetchBalance };
}