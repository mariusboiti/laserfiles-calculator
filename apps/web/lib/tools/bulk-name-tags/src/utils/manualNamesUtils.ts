import type { NameRecord } from '../types';

export function parseManualNames(value: string): NameRecord[] {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const sepIndex = line.indexOf('|');
      if (sepIndex === -1) {
        return { line1: line };
      }

      const line1 = line.slice(0, sepIndex).trim();
      const line2 = line.slice(sepIndex + 1).trim();

      return {
        line1,
        line2: line2.length > 0 ? line2 : undefined
      };
    })
    .filter(item => item.line1.length > 0);
}
