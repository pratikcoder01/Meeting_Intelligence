import { v4 as uuidv4 } from 'uuid';

// ─── ID generation ────────────────────────────────────────────────────────────

/** Generate a new UUID v4. */
export const generateId = (): string => uuidv4();

/** Generate a short random uppercase alphanumeric token (NOT crypto-safe). */
export const generateShortId = (length = 8): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();

// ─── Object utilities ─────────────────────────────────────────────────────────

/** Return a new object with the specified keys removed. */
export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
};

/** Return a new object with only the specified keys. */
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
};

// ─── Number utilities ─────────────────────────────────────────────────────────

/** Clamp a number between min and max (inclusive). */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Safely parse an integer from an unknown string. Returns defaultValue on failure. */
export const parseIntSafe = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/** Convert bytes to megabytes. */
export const bytesToMb = (bytes: number): number => bytes / (1024 * 1024);

// ─── String utilities ─────────────────────────────────────────────────────────

/** Truncate a string to maxLength, appending suffix if truncated. */
export const truncate = (str: string, maxLength: number, suffix = '...'): string =>
  str.length <= maxLength ? str : `${str.slice(0, maxLength - suffix.length)}${suffix}`;

// ─── Async utilities ──────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ─── Duration formatting ──────────────────────────────────────────────────────

/** Format a duration in milliseconds to a human-readable string like "2m 5s". */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};
