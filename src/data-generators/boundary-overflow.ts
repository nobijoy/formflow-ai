/**
 * Module 2 — FR-2.2 Boundary & Overflow preset. Pro.
 *
 * Fills at exactly N, N+1, and N+100 characters based on `maxlength`, plus
 * 4-byte UTF-8 emoji and RTL Unicode to catch layout/encoding bugs that
 * ASCII-only test data never surfaces.
 */

export type BoundaryVariant = 'AT_MAX' | 'OVER_MAX_BY_ONE' | 'OVER_MAX_BY_HUNDRED' | 'UNICODE_STRESS';

const EMOJI = '\u{1F600}'; // 4-byte UTF-8 grinning face — catches surrogate-pair truncation bugs.
const RTL_STRING = '\u{0645}\u{0631}\u{062D}\u{0628}\u{0627}'; // Arabic "welcome"

function repeatToLength(unit: string, length: number): string {
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

export function generateBoundaryValue(
  maxLength: number | null,
  variant: BoundaryVariant,
): string {
  const base = maxLength && maxLength > 0 ? maxLength : 100;

  switch (variant) {
    case 'AT_MAX':
      return repeatToLength('a', base);
    case 'OVER_MAX_BY_ONE':
      return repeatToLength('a', base + 1);
    case 'OVER_MAX_BY_HUNDRED':
      return repeatToLength('a', base + 100);
    case 'UNICODE_STRESS':
      return `${EMOJI}${RTL_STRING}${EMOJI}`;
  }
}
