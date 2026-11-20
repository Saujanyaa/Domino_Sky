/**
 * Time utility functions for DOMINO SKY simulation engine.
 * All schedule times are local IST (24-hour HH:MM format).
 * Operating day is simulated as a single day with numerical minute arithmetic.
 */

/**
 * Converts HH:MM string to total minutes from midnight (0 to 1439+).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Converts total minutes from midnight into 24-hour HH:MM format.
 * If minutes exceed 1440, it handles day overflow cleanly (e.g., 24:15 or wraps if needed).
 */
export function minutesToTime(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Adds minutes to an HH:MM string and returns the resulting HH:MM string.
 */
export function addMinutes(timeStr: string, mins: number): string {
  const currentMinutes = timeToMinutes(timeStr);
  return minutesToTime(currentMinutes + mins);
}

/**
 * Computes difference in minutes: end - start.
 */
export function timeDifference(startStr: string, endStr: string): number {
  return timeToMinutes(endStr) - timeToMinutes(startStr);
}

/**
 * Validates whether string is in valid 24-hour HH:MM format (00:00 to 23:59).
 */
export function isValidTimeString(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeStr.trim());
}

/**
 * Validates if start and end form a valid positive interval.
 */
export function isValidInterval(startStr: string, endStr: string): boolean {
  if (!isValidTimeString(startStr) || !isValidTimeString(endStr)) return false;
  return timeToMinutes(endStr) > timeToMinutes(startStr);
}

/**
 * Formats a duration in minutes into a friendly string (e.g. "+1h 30m" or "+45m").
 */
export function formatDelay(mins: number): string {
  if (mins <= 0) return 'On Time';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `+${h}h ${m}m`;
  if (h > 0) return `+${h}h`;
  return `+${m}m`;
}

/**
 * Formats duration in minutes into standard display (e.g. "10h 00m").
 */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
