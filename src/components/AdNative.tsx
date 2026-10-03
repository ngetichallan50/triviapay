"use client";

import { useEffect, useRef } from "react";
import { adsterra } from "@/lib/ads";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  className?: string;
};

/**
 * Adsterra Native Banner — mounts the unit's script plus the container div the
 * snippet expects. Skipped for Premium players.
 */
export function AdNative({ className }: Props) {
  const { isPremium } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  const { scriptSrc, containerId } = adsterra.nativeBanner;
  const active = adsterra.enabled && !isPremium && scriptSrc !== "";

  useEffect(() => {
    const host = ref.current;
    if (!host || !active) return;

    host.innerHTML = "";

    // Adsterra's snippet order: the script, then its container div.
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = scriptSrc;

    const container = document.createElement("div");
    container.id = containerId;

    host.appendChild(script);
    host.appendChild(container);

    return () => {
      host.innerHTML = "";
    };
  }, [active, scriptSrc, containerId]);

  if (!active) return null;

  return (
    <div className={className} data-ad-unit="native" ref={ref} />
  );
}
