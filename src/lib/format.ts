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
  return null;
}

export const isValidUsername = (value: string): boolean =>
  /^[A-Za-z][A-Za-z0-9_]{2,14}$/.test(value);

export const isValidPassword = (value: string): boolean => value.length >= 6;
