// src/types/csv.ts

/**
 * Reprezintă o linie brută din CSV
 * EXACT așa cum vine din PapaParse (header: true)
 */
export type CsvRawRow = Record<string, string | undefined>

/**
 * Opțiuni standard CSV folosite în aplicație
 * (centralizate, ca să nu fie hardcodate)
 */
export const CSV_OPTIONS = {
    delimiter: ';',
    skipEmptyLines: true,
    header: true,
} as const
