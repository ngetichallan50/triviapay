"use client";

import Script from "next/script";
import { adsterra } from "@/lib/ads";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Site-wide Adsterra scripts (Social Bar + Popunder). Loaded once per session
 * on every page. Skipped entirely for Premium players.
 */
export function AdScripts() {
  const { isPremium } = useAuth();

  if (!adsterra.enabled || isPremium) return null;

  return (
    <>
      {adsterra.socialBarSrc ? (
        <Script src={adsterra.socialBarSrc} strategy="afterInteractive" />
      ) : null}
      {adsterra.popunderSrc ? (
        <Script src={adsterra.popunderSrc} strategy="afterInteractive" />
      ) : null}
    </>
  );
}
