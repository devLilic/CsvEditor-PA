import Papa from 'papaparse'

export type EntityCsvRow = Record<string, string>

export function serializeEntityCsv(headers: string[], rows: EntityCsvRow[]): string {
    const csv = Papa.unparse(
        {
            fields: headers,
            data: rows,
        },
        {
            delimiter: ';',
            newline: '\n',
        }
    )

    return rows.length === 0 ? csv.replace(/\n$/, '') : csv
}
