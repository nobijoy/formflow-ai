/**
 * Escapes user/generated values embedded in single-quoted test source strings.
 */

export function escapeTestString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export function escapeTestName(value: string): string {
  return value.replace(/'/g, "\\'");
}
