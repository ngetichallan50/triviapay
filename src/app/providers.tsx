"use client";

import { AdScripts } from "@/components/AdScripts";
import { AuthProvider } from "@/providers/AuthProvider";
import { MaterialProvider } from "@/providers/MaterialProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MaterialProvider>{children}</MaterialProvider>
      <AdScripts />
    </AuthProvider>
  );
}
