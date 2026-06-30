import Papa from 'papaparse'
import { normalizeAndDeduplicateQuickTitles } from './quickTitle'

const QUICK_TITLES_CSV_DELIMITER = ';'

export function serializeQuickTitlesCsv(values: string[]): string {
    const normalized = normalizeAndDeduplicateQuickTitles(values)
    if (normalized.length === 0) {
        return ''
    }

    return Papa.unparse(
        normalized.map((title) => [title]),
        {
            delimiter: QUICK_TITLES_CSV_DELIMITER,
            newline: '\n',
        }
    )
}

export function parseQuickTitlesCsv(content: string): string[] {
    const parsed = Papa.parse<string[]>(content.replace(/^\uFEFF/, ''), {
        delimiter: QUICK_TITLES_CSV_DELIMITER,
        skipEmptyLines: true,
    })

    if (!Array.isArray(parsed.data)) {
        return []
    }

    const rows = parsed.data
    const rowsWithoutLegacyHeader = rows[0]?.[0]?.trim() === 'Titlu'
        ? rows.slice(1)
        : rows

    return normalizeAndDeduplicateQuickTitles(
        rowsWithoutLegacyHeader
            .map((row) => row?.[0])
            .filter((value): value is string => typeof value === 'string')
    )
}
