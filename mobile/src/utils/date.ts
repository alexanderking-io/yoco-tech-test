/**
 * Formats an ISO date string as dd-mm-yyyy in the device's local timezone.
 *
 * @example formatDate("2026-04-07T14:30:00Z") → "07-04-2026" (in SAST, UTC+2)
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Formats an ISO date string as a local time (HH:MM).
 *
 * @example formatTime("2026-04-07T14:30:00Z") → "14:30"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
