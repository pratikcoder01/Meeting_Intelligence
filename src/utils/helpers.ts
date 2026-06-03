import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID v4.
 */
export const generateId = (): string => uuidv4();

/**
 * Generate a short random alphanumeric token (not cryptographically secure).
 * Suitable for readable IDs, not for auth tokens.
 */
export const generateShortId = (length = 8): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();

/**
 * Safely parse an integer from a string, returning a default if parsing fails.
 */
export const parseIntSafe = (value: string | undefined, defaultValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Sleep for a given number of milliseconds.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Omit keys from an object (useful for stripping passwords, etc.).
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
};

/**
 * Pick keys from an object.
 */
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Clamp a number between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Convert bytes to megabytes.
 */
export const bytesToMb = (bytes: number): number => bytes / (1024 * 1024);

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Truncate a string to a maximum length with an optional suffix.
 */
export const truncate = (str: string, maxLength: number, suffix = '...'): string =>
  str.length <= maxLength ? str : `${str.slice(0, maxLength - suffix.length)}${suffix}`;
