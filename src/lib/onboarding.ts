/// Tracks whether a visitor has already been through the welcome/registration
/// step, so first-time visitors get sent to `/register` automatically.

const KEY = "tpweb_onboarded";

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true; // no redirect during SSR
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // Storage unavailable — the visitor may see the welcome step again.
  }
}
