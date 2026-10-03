"use client";

import { AdScripts } from "@/components/AdScripts";
import { PremiumNudge } from "@/components/PremiumNudge";
import { AuthProvider } from "@/providers/AuthProvider";
import { MaterialProvider } from "@/providers/MaterialProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MaterialProvider>{children}</MaterialProvider>
      <AdScripts />
      <PremiumNudge />
    </AuthProvider>
  );
}
