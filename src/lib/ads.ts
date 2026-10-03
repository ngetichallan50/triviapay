/// Adsterra ad configuration for TriviaPay Web.
///
/// Values come from the Adsterra publisher dashboard:
///   Websites → triviapay.online → AD UNIT → GET CODE
///
/// Banners are rendered inside an isolated `<iframe srcdoc>` (one per unit) so
/// each Adsterra `atOptions` block can't collide with the others on a page.
/// Social Bar and Popunder are site-wide scripts injected once.
///
/// Premium users never see ads (enforced in the components), and the
/// login / register / premium pages don't render any ad slots at all.

export type BannerUnit = {
  /** Adsterra unit key — the token in `<invokeHost>/<key>/invoke.js`. */
  key: string;
  width: number;
  height: number;
};

export type NativeUnit = {
  /** The `invoke.js` URL from the Native Banner snippet. */
  scriptSrc: string;
  /** The container div id the snippet expects. */
  containerId: string;
};

type AdsterraConfig = {
  enabled: boolean;
  /** CDN host used by banner units (from the GET CODE snippet). */
  invokeHost: string;
  /** Site-wide Social Bar script URL, or "" to disable. */
  socialBarSrc: string;
  /** Site-wide Popunder script URL, or "" to disable. */
  popunderSrc: string;
  banners: {
    medium: BannerUnit; // 300x250 — in-content, works on all screens
    mobile: BannerUnit; // 320x50  — mobile strip
    leaderboard: BannerUnit; // 728x90 — desktop strip
  };
  nativeBanner: NativeUnit;
};

export const adsterra: AdsterraConfig = {
  enabled: true,

  invokeHost: "https://www.highrevenueformat.com",

  // Site-wide scripts. Popunder is intentionally OFF (no pop-up ads).
  popunderSrc: "",
  socialBarSrc:
    "https://pl31644019.profitableratecpmnetwork.com/c0/23/53/c0235378d276f175c787c930dbc3549c.js",

  banners: {
    medium: { key: "dba202286f7fea2d6586827a8c54e5e0", width: 300, height: 250 },
    mobile: { key: "9cf3953bb1dca800daa34f8064383d6e", width: 320, height: 50 },
    leaderboard: {
      key: "7ee5d4c700b7f1dd6ae1c2dc2fd69795",
      width: 728,
      height: 90,
    },
  },

  nativeBanner: {
    scriptSrc:
      "https://pl31644018.profitableratecpmnetwork.com/acc67a21ef2da7ba1c662b1dd0264149/invoke.js",
    containerId: "container-acc67a21ef2da7ba1c662b1dd0264149",
  },
};

/** True when at least one ad unit is configured. */
export const adsConfigured = (): boolean =>
  adsterra.socialBarSrc !== "" ||
  adsterra.popunderSrc !== "" ||
  Object.values(adsterra.banners).some((b) => b.key !== "") ||
  adsterra.nativeBanner.scriptSrc !== "";
