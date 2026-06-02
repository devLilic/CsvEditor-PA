// src/features/csv-editor/utils/csvSerializer.ts
import Papa from 'papaparse'
import type { EntitiesState, CsvSection, SectionRow } from '../domain/entities'
import { CSV_COLUMNS } from './csvParser'
import { buildBetaMarker } from '../domain/csv.schema'
import { resolveWorkPathImageCsvValue } from '../domain/phoneImagePath'

export type SerializeCsvOptions = {
    phoneImageWorkPath?: string
}

function emptyCsvRow(): Record<string, string> {
    return {
        [CSV_COLUMNS.TITLE_NR]: '',
        [CSV_COLUMNS.TITLE]: '',
        [CSV_COLUMNS.PERSON_NAME]: '',
        [CSV_COLUMNS.PERSON_OCCUPATION]: '',
        [CSV_COLUMNS.PERSON_IMAGE]: '',
        [CSV_COLUMNS.LOCATION]: '',
        [CSV_COLUMNS.HOT_TITLE]: '',
        [CSV_COLUMNS.WAIT_TITLE]: '',
        [CSV_COLUMNS.WAIT_LOCATION]: '',
    }
}

function packSectionRows(section: CsvSection, options: SerializeCsvOptions): Record<string, string>[] {
    const out: Record<string, string>[] = []

    // 1) marker row
    const marker = section.kind === 'invited'
        ? '--- INVITATI ---'
        : buildBetaMarker(section.betaIndex ?? 0, section.betaTitle ?? '')

    out.push({
        ...emptyCsvRow(),
        [CSV_COLUMNS.TITLE]: marker,
    })

    // 2) content rows packed
    let titleNr = 0

    for (let i = 0; i < section.rows.length; i++) {
        const r: SectionRow = section.rows[i]

        const titleText = r.title?.title ?? ''
        const isMarkerRow = false // marker row already emitted above

        if (!isMarkerRow && titleText.trim() !== '') {
            titleNr += 1
        }

        out.push({
            [CSV_COLUMNS.TITLE_NR]: titleText.trim() !== '' ? String(titleNr) : '',
            [CSV_COLUMNS.TITLE]: titleText,

            [CSV_COLUMNS.PERSON_NAME]: r.person?.name ?? '',
            [CSV_COLUMNS.PERSON_OCCUPATION]: r.person?.occupation ?? '',
            [CSV_COLUMNS.PERSON_IMAGE]: r.person?.image
                ? resolveWorkPathImageCsvValue(r.person.image, options.phoneImageWorkPath ?? '')
                : '',

            [CSV_COLUMNS.LOCATION]: r.location?.location ?? '',
            [CSV_COLUMNS.HOT_TITLE]:
                section.kind === 'invited' ? (r.hotTitle?.title ?? '') : '',
            [CSV_COLUMNS.WAIT_TITLE]:
                section.kind === 'invited' ? (r.waitTitle?.title ?? '') : '',
            [CSV_COLUMNS.WAIT_LOCATION]:
                section.kind === 'invited' ? (r.waitLocation?.location ?? '') : '',
        })
    }

    return out
}

/**
 * EntitiesState ➜ CSV string (sections-based)
 *
 * Rules:
 * - each section starts with marker row in Titlu column
 * - Nr resets per section
 * - Nr filled only for non-empty Titlu rows (not markers)
 * - packing is based on section.rows order
 */
export function serializeCsv(state: EntitiesState, options: SerializeCsvOptions = {}): string {
    const rows: Record<string, string>[] = []

    // Ensure INVITATI last (defensive)
    const invited = state.sections.find((s) => s.kind === 'invited')
    const betas = state.sections.filter((s) => s.kind === 'beta')

    const ordered = invited ? [...betas, invited] : [...betas]

    for (const s of ordered) {
        rows.push(...packSectionRows(s, options))
    }

    return Papa.unparse(rows, { delimiter: ';' })
}
