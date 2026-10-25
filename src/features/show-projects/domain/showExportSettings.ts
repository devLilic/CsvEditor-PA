import type { EntitiesState } from '../../csv-editor/domain/entities'
import type { ShowProject } from './showProject'
import { DEFAULT_LOWER_THIRD_TYPE_ID } from '../../lower-thirds/domain/lowerThirdTypes'

type ShowExportSettings = Pick<ShowProject, 'document' | 'lowerThirdTypesEnabled'>

/** Build an export view without removing disabled data from the saved edition. */
export function applyShowExportSettings(entities: EntitiesState, show?: ShowExportSettings): EntitiesState {
    if (!show) return entities
    const disabled = new Set(show.document.disabledEntityTypes ?? [])
    return {
        ...entities,
        sections: entities.sections.map((section) => ({
            ...section,
            rows: section.rows.map((row) => {
                const next = { ...row }
                if (disabled.has('titles')) {
                    delete next.title
                    delete next.hotTitle
                }
                if (disabled.has('locations')) delete next.location
                if (disabled.has('waitTitles')) delete next.waitTitle
                if (disabled.has('waitLocations')) delete next.waitLocation
                if (next.person) {
                    const isPhone = Boolean(next.person.image?.trim())
                    if (disabled.has(isPhone ? 'phoneCalls' : 'persons')) delete next.person
                }
                if (show.lowerThirdTypesEnabled === false) {
                    const assignment = { lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID, lowerThirdTemplateOverride: '' }
                    if (next.title) next.title = { ...next.title, ...assignment }
                    if (next.hotTitle) next.hotTitle = { ...next.hotTitle, ...assignment }
                    if (next.person) next.person = { ...next.person, ...assignment }
                }
                return next
            }),
        })),
    }
}
