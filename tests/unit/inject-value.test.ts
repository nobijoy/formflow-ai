import { describe, expect, it } from 'vitest';
import { injectValue } from '@/content/inject-value';
import { extractFieldContext, isFillableInput } from '@/content/field-context';
import { generateHappyPathValue } from '@/data-generators/happy-path';

describe('injectValue (FR-1.1 + FR-1.2)', () => {
  it('sets input value via native setter path', () => {
    document.body.innerHTML = '<input id="email" type="email" />';
    const input = document.getElementById('email') as HTMLInputElement;
    injectValue(input, 'qa.tester@example.com');
    expect(input.value).toBe('qa.tester@example.com');
  });

  it('dispatches input and change events', () => {
    document.body.innerHTML = '<input id="name" type="text" />';
    const input = document.getElementById('name') as HTMLInputElement;
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));
    injectValue(input, 'Ada Lovelace');
    expect(events).toContain('input');
    expect(events).toContain('change');
  });
});

describe('extractFieldContext', () => {
  it('reads associated label text', () => {
    document.body.innerHTML =
      '<label for="email">Email Address</label><input id="email" name="email" type="email" />';
    const input = document.getElementById('email')!;
    expect(extractFieldContext(input).label).toBe('Email Address');
    expect(generateHappyPathValue(extractFieldContext(input))).toBe('qa.tester@example.com');
  });

  it('skips hidden and submit inputs', () => {
    document.body.innerHTML =
      '<input type="hidden" name="token" value="x" /><input type="submit" value="Go" />';
    const hidden = document.querySelector('input[type="hidden"]')!;
    const submit = document.querySelector('input[type="submit"]')!;
    expect(isFillableInput(hidden)).toBe(false);
    expect(isFillableInput(submit)).toBe(false);
  });
});
