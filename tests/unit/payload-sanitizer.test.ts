import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '@/background/ai-router/payload-sanitizer';

describe('sanitizePayload (FR-3.2)', () => {
  it('strips email-shaped PII from labels', () => {
    const result = sanitizePayload({
      tagName: 'input',
      type: 'text',
      parentLabelText: 'Contact real.user@company.com for help',
    });
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('real.user@company.com');
  });

  it('strips SSN-shaped patterns', () => {
    const result = sanitizePayload({
      tagName: 'input',
      placeholder: 'SSN 123-45-6789',
    });
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('123-45-6789');
  });

  it('passes through safe placeholder text', () => {
    const result = sanitizePayload({
      tagName: 'input',
      type: 'text',
      placeholder: 'Enter your favorite color',
      ariaLabel: 'Favorite color',
    });
    expect(result).toContain('placeholder="Enter your favorite color"');
    expect(result).toContain('aria-label="Favorite color"');
    expect(result).not.toContain('[REDACTED]');
  });
});
