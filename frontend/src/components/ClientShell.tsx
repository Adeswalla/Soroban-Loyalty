"use client";

import { WalletProvider } from "@/context/WalletContext";
import { I18nProvider } from "@/context/I18nContext";
import { ToastProvider } from "@/context/ToastContext";
import { WalletConnector } from "@/components/WalletConnector";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useBalance } from "@/hooks/useBalance";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>
        <I18nProvider>
          <ShellContent>{children}</ShellContent>
        </I18nProvider>
      </ToastProvider>
    </WalletProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const { health } = useNetworkStatus();
  const { balance, loading } = useBalance();

  return (
    <>
      <header className="site-header">
        <a href="/" className="logo">SorobanLoyalty</a>
        <nav>
          <a href="/dashboard">Dashboard</a>
          <a href="/merchant">Merchant</a>
          <a href="/analytics">Analytics</a>
          <a href="/profile">Profile</a>
        </nav>
        <div className="header-balance">
          {loading ? (
            <span className="balance-loading">Loading...</span>
          ) : balance !== null ? (
            <span className="balance-amount">{balance.toLocaleString()} LYT</span>
          ) : null}
        </div>
        <NetworkStatusIndicator health={health} />
        <WalletConnector />
      </header>
      <main className="site-main">{children}</main>
    </>
  );
}
