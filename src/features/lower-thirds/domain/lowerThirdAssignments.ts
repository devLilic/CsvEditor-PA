import Papa from 'papaparse'
import type { EntitiesState, CsvSection, SectionRow, SimpleTitle, Person } from '../../csv-editor/domain/entities'
import { buildBetaMarker, CSV_SECTION_MARKERS } from '../../csv-editor/domain/csv.schema'
import { DEFAULT_LOWER_THIRD_TYPE_ID, type LowerThirdEntityKind, type LowerThirdTypeDefinition } from './lowerThirdTypes'

type ExportRow = Record<string, string | undefined>
type Assignment = { lowerThirdTypeId: string; lowerThirdTemplateOverride?: string }

function marker(section: CsvSection): string {
    return section.kind === 'beta'
        ? buildBetaMarker(section.betaIndex ?? 0, section.betaTitle ?? '')
        : CSV_SECTION_MARKERS.INVITED
}

function normalized(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function rowKey(section: string, fields: string[]): string {
    return JSON.stringify([section, ...fields])
}

function buildQueues(content: string | undefined, kind: LowerThirdEntityKind): Map<string, ExportRow[]> {
    const queues = new Map<string, ExportRow[]>()
    if (!content) return queues
    const parsed = Papa.parse<ExportRow>(content, { header: true, delimiter: ';', skipEmptyLines: true })
    let currentSection = ''
    let titleNumber = 0

    for (const row of parsed.data) {
        const sectionMarker = kind === 'titles' ? normalized(row.Nr) : normalized(row.Sectiune)
        if (sectionMarker.startsWith('---')) {
            currentSection = sectionMarker
            titleNumber = 0
            continue
        }

        const fields = kind === 'titles'
            ? [normalized(row.Nr), normalized(row.Titlu), normalized(row.Supratitlu)]
            : [normalized(row.Nume), normalized(row.Functie)]
        if (kind === 'titles' && fields[1] !== '') titleNumber += 1
        // Exports have section-local sequential Nr values. Keep the original nr in the key,
        // matching the same value emitted by the export mapper.
        const keyFields = kind === 'titles'
            ? [fields[0] || String(titleNumber), fields[1], fields[2]]
            : fields
        if (keyFields.slice(kind === 'titles' ? 1 : 0).every((field) => field === '')) continue
        const key = rowKey(currentSection, keyFields)
        const queue = queues.get(key) ?? []
        queue.push(row)
        queues.set(key, queue)
    }

    return queues
}

function templatesByName(types: LowerThirdTypeDefinition[], kind: LowerThirdEntityKind): Map<string, string> {
    return new Map(types.map((type) => [type.templates[kind].name, type.id]))
}

function takeAssignment(
    queues: Map<string, ExportRow[]>,
    typeByName: Map<string, string>,
    key: string,
    onWarning?: (message: string) => void,
): Assignment | undefined {
    const row = queues.get(key)?.shift()
    if (!row) return undefined
    const templateName = normalized(row.Template)
    if (!templateName) return { lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID }
    const knownId = typeByName.get(templateName)
    if (knownId) return { lowerThirdTypeId: knownId }
    onWarning?.(`Unknown lower-third template "${templateName}"; using ordinary and preserving the template override.`)
    return { lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID, lowerThirdTemplateOverride: templateName }
}

/** Reattaches template selections from the last PA exports to parsed working CSV entities. */
export function restoreLowerThirdAssignments(input: {
    entities: EntitiesState
    titlesExport?: string
    personsExport?: string
    types: LowerThirdTypeDefinition[]
    onWarning?: (message: string) => void
}): EntitiesState {
    const titleQueues = buildQueues(input.titlesExport, 'titles')
    const personQueues = buildQueues(input.personsExport, 'persons')
    const titleTypes = templatesByName(input.types, 'titles')
    const personTypes = templatesByName(input.types, 'persons')

    const sections = input.entities.sections.map((section) => {
        const sectionMarker = marker(section)
        let titleNumber = 0
        const rows = section.rows.map((row) => {
            let title: SimpleTitle | undefined = row.title
            let person: Person | undefined = row.person

            if (title) {
                titleNumber += 1
                const key = rowKey(sectionMarker, [String(titleNumber), title.title, title.supratitle ?? ''])
                const assignment = takeAssignment(titleQueues, titleTypes, key, input.onWarning)
                if (assignment) title = { ...title, ...assignment }
            }

            if (person && !person.image?.trim()) {
                const key = rowKey(sectionMarker, [person.name, person.occupation])
                const assignment = takeAssignment(personQueues, personTypes, key, input.onWarning)
                if (assignment) person = { ...person, ...assignment }
            }

            return title === row.title && person === row.person ? row : { ...row, title, person }
        })
        return { ...section, rows }
    })

    return { ...input.entities, sections }
}

/** Convert legacy hot-title values into regular urgent title entities without losing their text. */
export function migrateHotTitlesToUrgent(entities: EntitiesState): EntitiesState {
    let changed = false
    const sections = entities.sections.map((section) => {
        const rows = section.rows.flatMap<SectionRow>((row) => {
            if (!row.hotTitle?.title.trim()) return [row]
            changed = true
            const title: SimpleTitle = {
                ...row.hotTitle,
                lowerThirdTypeId: 'urgent',
            }
            if (!row.title) return [{ ...row, title, hotTitle: undefined }]
            // Keep both headlines as independent title rows while leaving any attached
            // person/location data on the original row only.
            return [
                { ...row, hotTitle: undefined },
                { id: row.hotTitle.id, title },
            ]
        })
        return rows.some((row, index) => row !== section.rows[index]) || rows.length !== section.rows.length
            ? { ...section, rows }
            : section
    })
    return changed ? { ...entities, sections } : entities
}

export function getLowerThirdTemplateName(
    entity: { lowerThirdTypeId?: string; lowerThirdTemplateOverride?: string },
    types: LowerThirdTypeDefinition[],
    kind: LowerThirdEntityKind,
): string {
    if (typeof entity.lowerThirdTemplateOverride === 'string' && entity.lowerThirdTemplateOverride.trim()) {
        return entity.lowerThirdTemplateOverride
    }
    const type = types.find((candidate) => candidate.id === entity.lowerThirdTypeId)
        ?? types.find((candidate) => candidate.id === DEFAULT_LOWER_THIRD_TYPE_ID)
    return type?.templates[kind].name ?? ''
}
