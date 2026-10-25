import type { EntitiesState } from '../../csv-editor/domain/entities'
import { parseCsv } from '../../csv-editor/utils/csvParser'

export type ShowEditionFile = {
    version: 2
    showProjectId: string
    entities: EntitiesState
}

export function isEditionEntities(value: unknown): value is EntitiesState {
    if (!value || typeof value !== 'object' || !Array.isArray((value as EntitiesState).sections)) return false
    return (value as EntitiesState).sections.every((section) => (
        section && typeof section.id === 'string'
        && (section.kind === 'invited' || section.kind === 'beta')
        && Array.isArray(section.rows)
        && section.rows.every((row) => row && typeof row.id === 'string')
    ))
}

/** Legacy CSV and v1 snapshots remain readable; identified editions must match their show. */
export function parseShowEdition(content: string, expectedShowProjectId?: string): EntitiesState {
    if (!content.trim().startsWith('{')) return parseCsv(content)
    const value = JSON.parse(content) as Partial<ShowEditionFile>
    if (!isEditionEntities(value.entities)) throw new Error('INVALID_EDITION_FILE')
    if (value.showProjectId !== undefined && typeof value.showProjectId !== 'string') {
        throw new Error('INVALID_EDITION_SHOW_ID')
    }
    if (expectedShowProjectId && value.showProjectId && value.showProjectId !== expectedShowProjectId) {
        throw new Error('EDITION_BELONGS_TO_ANOTHER_SHOW')
    }
    return value.entities
}

export function serializeShowEdition(entities: EntitiesState, showProjectId?: string): string {
    if (!isEditionEntities(entities)) throw new Error('INVALID_EDITION_ENTITIES')
    return JSON.stringify(showProjectId
        ? { version: 2, showProjectId, entities } satisfies ShowEditionFile
        : { version: 1, entities }, null, 2)
}
