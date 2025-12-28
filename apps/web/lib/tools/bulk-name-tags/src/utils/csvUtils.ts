import Papa from 'papaparse';
import type { NameRecord, CSVMapping } from '../types';

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(file: File): Promise<ParsedCSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        resolve({ headers, rows });
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}

export function mapCSVToNames(
  rows: Record<string, string>[],
  mapping: CSVMapping
): NameRecord[] {
  return rows
    .filter(row => row[mapping.nameColumn] && row[mapping.nameColumn].trim() !== '')
    .map(row => ({
      line1: row[mapping.nameColumn].trim(),
      line2: mapping.line2Column ? row[mapping.line2Column]?.trim() : undefined
    }));
}
