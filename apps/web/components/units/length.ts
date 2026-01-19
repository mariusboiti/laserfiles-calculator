import type { UnitSystem } from './UnitSystemProvider';

export const MM_PER_INCH = 25.4;

export function mmToIn(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function toDisplayLength(mm: number, unitSystem: UnitSystem): number {
  return unitSystem === 'in' ? mmToIn(mm) : mm;
}

export function fromDisplayLength(value: number, unitSystem: UnitSystem): number {
  return unitSystem === 'in' ? inToMm(value) : value;
}

export function formatLength(valueMm: number, unitSystem: UnitSystem, digits?: number): string {
  const d = typeof digits === 'number' ? digits : unitSystem === 'in' ? 3 : 1;
  return String(Number(toDisplayLength(valueMm, unitSystem).toFixed(d)));
}
