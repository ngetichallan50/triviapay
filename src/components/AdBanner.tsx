"use client";

import { adsterra, type BannerUnit } from "@/lib/ads";
import { useAuth } from "@/providers/AuthProvider";

type UnitName = "medium" | "mobile" | "leaderboard";

type Props = {
  unit: UnitName;
  className?: string;
};

/**
 * A single Adsterra banner, rendered inside its own isolated iframe so the
 * per-unit `atOptions` global can't clash with other banners on the page.
 *
 * Returns nothing when ads are disabled, the unit has no key, or the player is
 * on Premium (ad-free is a paid benefit).
 */
export function AdBanner({ unit, className }: Props) {
  const { isPremium } = useAuth();
  const cfg: BannerUnit = adsterra.banners[unit];

  if (!adsterra.enabled || isPremium || !cfg.key) return null;

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body><script type="text/javascript">atOptions = { 'key' : '${cfg.key}', 'format' : 'iframe', 'height' : ${cfg.height}, 'width' : ${cfg.width}, 'params' : {} };</script><script type="text/javascript" src="${adsterra.invokeHost}/${cfg.key}/invoke.js"></script></body></html>`;

  return (
    <div className={className} data-ad-unit={unit}>
      <iframe
        title="Advertisement"
        width={cfg.width}
        height={cfg.height}
        scrolling="no"
        style={{
          border: 0,
          display: "block",
          margin: "0 auto",
          maxWidth: "100%",
        }}
        srcDoc={srcDoc}
      />
    </div>
  );
}
