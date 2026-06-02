// src/features/csv-editor/utils/csvParser.ts
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import type { EntitiesState, CsvSection, SectionRow, SimpleTitle, Person, Location } from '../domain/entities'
import { createBetaSection, createInvitedSection } from '../domain/entities'
import { isInvitedMarker, parseBetaMarker } from '../domain/csv.schema'

export const CSV_COLUMNS = {
    TITLE_NR: 'Nr',
    TITLE: 'Titlu',

    PERSON_NAME: 'Nume',
    PERSON_OCCUPATION: 'Functie',
    PERSON_IMAGE: 'Image',

    LOCATION: 'Locatie',
    HOT_TITLE: 'Ultima Ora',
    WAIT_TITLE: 'Titlu Asteptare',
    WAIT_LOCATION: 'Locatie Asteptare',
} as const

type CsvRowRaw = Record<string, string | undefined>

function cell(row: CsvRowRaw, key: string): string {
    return (row[key] ?? '').trim()
}

function isCompletelyEmptyRow(row: CsvRowRaw): boolean {
    const values = Object.values(row ?? {})
    if (values.length === 0) return true
    return values.every((v) => {
        if (Array.isArray(v)) {
            return v.every((item) => String(item ?? '').trim() === '')
        }

        return String(v ?? '').trim() === ''
    })
}

function buildRowFromCsv(row: CsvRowRaw, sectionKind: CsvSection['kind']): Omit<SectionRow, 'id'> | null {
    const nr = cell(row, CSV_COLUMNS.TITLE_NR)
    const titleText = cell(row, CSV_COLUMNS.TITLE)
    const name = cell(row, CSV_COLUMNS.PERSON_NAME)
    const occupation = cell(row, CSV_COLUMNS.PERSON_OCCUPATION)
    const image = cell(row, CSV_COLUMNS.PERSON_IMAGE)
    const loc = cell(row, CSV_COLUMNS.LOCATION)
    const hotTitle = cell(row, CSV_COLUMNS.HOT_TITLE)
    const waitTitle = cell(row, CSV_COLUMNS.WAIT_TITLE)
    const waitLocation = cell(row, CSV_COLUMNS.WAIT_LOCATION)

    // empty row inside a section -> ignore (no delimiter concept anymore)
    if (
        titleText === '' &&
        name === '' &&
        occupation === '' &&
        image === '' &&
        loc === '' &&
        hotTitle === '' &&
        waitTitle === '' &&
        waitLocation === ''
    ) {
        return null
    }

    const out: Omit<SectionRow, 'id'> = {}

    if (titleText !== '') {
        const t: SimpleTitle = { id: uuidv4(), nr, title: titleText }
        out.title = t
    }

    if (name !== '' || occupation !== '' || image !== '') {
        const p: Person = { id: uuidv4(), name, occupation }
        if (sectionKind === 'invited' && image !== '') {
            p.image = image
        }
        out.person = p
    }

    if (sectionKind === 'invited' && loc !== '') {
        const l: Location = { id: uuidv4(), location: loc }
        out.location = l
    }

    if (sectionKind === 'invited' && hotTitle !== '') {
        out.hotTitle = { id: uuidv4(), title: hotTitle }
    }

    if (sectionKind === 'invited' && waitTitle !== '') {
        out.waitTitle = { id: uuidv4(), title: waitTitle }
    }

    if (sectionKind === 'invited' && waitLocation !== '') {
        out.waitLocation = { id: uuidv4(), location: waitLocation }
    }

    return out
}

/**
 * CSV string ➜ EntitiesState (sections-based)
 *
 * Rules:
 * - Marker row is detected by Nr column first, then legacy Titlu column:
 *   --- beta N - <title> ---
 *   --- INVITATI ---
 * - Marker rows do not create content rows; they only switch current section.
 * - Rows are stored canonically as section.rows[] (packing model).
 * - If no markers exist → fallback to single INVITATI section with all rows.
 * - PA hot/wait columns are parsed only for INVITATI.
 */
export function parseCsv(content: string): EntitiesState {
    const parsed = Papa.parse<CsvRowRaw>(content, {
        header: true,
        delimiter: ';',
        skipEmptyLines: false,
    })

    const sections: CsvSection[] = []

    let sawAnyMarker = false

    // fallback default: we still build invited, but we won't push until we confirm no markers
    const fallbackInvitedId = uuidv4()
    let current: CsvSection | null = null

    const ensureInvitedLast = () => {
        const invited = sections.find((s) => s.kind === 'invited')
        if (!invited) {
            sections.push(createInvitedSection(uuidv4(), []))
        } else {
            // move to end
            const rest = sections.filter((s) => s.id !== invited.id)
            sections.length = 0
            sections.push(...rest, invited)
        }
    }

    const startSection = (next: CsvSection) => {
        // push previous
        if (current) sections.push(current)
        current = next
    }

    parsed.data.forEach((row) => {
        if (isCompletelyEmptyRow(row)) {
            // no delimiter concept -> ignore empty rows
            return
        }

        const nrCell = cell(row, CSV_COLUMNS.TITLE_NR)
        const titleCell = cell(row, CSV_COLUMNS.TITLE)
        const markerCell = nrCell || titleCell

        // Marker: INVITATI
        if (markerCell && isInvitedMarker(markerCell)) {
            sawAnyMarker = true
            startSection(createInvitedSection(uuidv4(), []))
            return
        }

        // Marker: beta
        if (markerCell) {
            const beta = parseBetaMarker(markerCell)
            if (beta) {
                sawAnyMarker = true
                startSection(createBetaSection(uuidv4(), beta.betaIndex, beta.betaTitle, []))
                return
            }
        }

        // content row
        const rowData = buildRowFromCsv(row, current?.kind ?? 'invited')
        if (!rowData) return

        if (!current) {
            // if content appears before any markers, we still keep it.
            // we will decide fallback after parsing.
            current = createInvitedSection(fallbackInvitedId, [])
        }

        current.rows.push({
            id: uuidv4(),
            ...rowData,
        })
    })

    if (current) sections.push(current)

    // Fallback: no markers -> single invited section with everything
    if (!sawAnyMarker) {
        // merge all rows into one invited
        const allRows: SectionRow[] = []
        for (const s of sections) {
            allRows.push(...s.rows)
        }
        return {
            sections: [createInvitedSection(fallbackInvitedId, allRows)],
        }
    }

    // Normalize: beta indices should follow parsed marker numbers; UI will reindex on delete/add operations
    // Ensure invited exists and is last
    ensureInvitedLast()

    return { sections }
}
