import { describe, expect, it } from 'vitest';
import { notificationProviders } from '@/constants/notification-providers';

describe('notification provider definitions', () => {
  it('every field references a known section', () => {
    for (const provider of notificationProviders) {
      const sections = new Set(provider.sections.map((s) => s.key));
      for (const field of provider.fields) {
        expect(
          field.section === undefined || sections.has(field.section),
          `${provider.type}.${field.key} references unknown section ${String(field.section)}`,
        ).toBe(true);
      }
    }
  });

  it('every section has at least one field and keys are unique', () => {
    for (const provider of notificationProviders) {
      const sectionKeys = provider.sections.map((s) => s.key);
      expect(new Set(sectionKeys).size).toBe(sectionKeys.length);
      const fieldKeys = provider.fields.map((f) => f.key);
      expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
      for (const section of provider.sections) {
        expect(provider.fields.some((f) => f.section === section.key)).toBe(true);
      }
    }
  });
});
