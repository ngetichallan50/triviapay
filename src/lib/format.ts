export const formatKsh = (value: number, decimals = 2): string =>
  `KSh ${value.toLocaleString("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const formatKsh0 = (value: number): string =>
  `KSh ${Math.round(value).toLocaleString("en-KE")}`;

/** Normalises a Kenyan phone number to the +2547XXXXXXXX form, or null. */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith("7") && digits.length === 9) {
    return `+254${digits}`;
  }
  if (digits.startsWith("1") && digits.length === 9) {
    return `+254${digits}`;
  }
  return null;
}

/** `+254712345678` -> `254712345678` (the form used for usernames + gateways). */
export const phoneDigits = (phone: string): string =>
  phone.replace(/[^\d]/g, "");

/** The 9-digit national part, e.g. `712345678`. */
export const phoneNational = (phone: string): string =>
  phoneDigits(phone).replace(/^254/, "");

export type KenyanNetwork = "Safaricom M-Pesa" | "Airtel Money";

const SAFARICOM_PREFIX =
  /^(?:7(?:0\d|1\d|2\d|4[0-5]|5[789]|6[89]|9\d)|11[0-5])\d{6}$/;
const AIRTEL_PREFIX = /^(?:7(?:3\d|8\d)|10[0-2])\d{6}$/;

/**
 * Identifies whether a number is a Safaricom (M-Pesa) or Airtel Money line.
 * Returns null for anything else — Telkom/Equitel lines can't be charged with
 * an M-Pesa STK push.
 */
export function kenyanNetwork(phone: string): KenyanNetwork | null {
  const national = phoneNational(phone);
  if (SAFARICOM_PREFIX.test(national)) return "Safaricom M-Pesa";
  if (AIRTEL_PREFIX.test(national)) return "Airtel Money";
  return null;
}

/**
 * Digs out a Kenyan number typed without the country code, e.g. `0712 345 678`
 * or `712345678`.
 */
export function formatPhonePretty(phone: string): string {
  const national = phoneNational(phone);
  if (!/^\d{9}$/.test(national)) return phone;
  return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/**
 * Supabase auth keys off an email, but players sign in with their phone number.
 * We derive a private, deterministic address the user never sees or types.
 */
export const phoneToAuthEmail = (phone: string): string =>
  `${phoneDigits(phone)}@players.triviapay.online`;

/**
 * A 4-digit PIN is padded into a deterministic password (Supabase requires 6+).
 * It is never shown to the player, who only ever uses the PIN.
 */
export const authPasswordFor = (phone: string, pin: string): string =>
  `tp-${phoneDigits(phone)}-${pin}-pay`;

export const isValidPin = (value: string): boolean => /^\d{4}$/.test(value);
