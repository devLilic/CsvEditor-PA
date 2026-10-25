import { describe, expect, it } from 'vitest'
import { applyShowExportSettings } from './showExportSettings'
import type { TemplateDocument } from '../../template-editor/domain/templateDocument'
import type { EntitiesState } from '../../csv-editor/domain/entities'
import { mapEntitiesStateToExportCsvs } from '../../entity-export/domain/entityExportMapper'

const entities: EntitiesState = {
    sections: [{ id: 'studio', kind: 'invited', rows: [
        { id: 'r1', title: { id: 't', title: 'Titlu păstrat', lowerThirdTypeId: 'breaking-news', lowerThirdTemplateOverride: 'ALT_TEMPLATE' }, person: { id: 'p', name: 'INVITAT', occupation: 'Funcție', lowerThirdTypeId: 'urgent' } },
        { id: 'r2', person: { id: 'phone', name: 'TELEFON', occupation: 'Corespondent', image: 'apel.jpg' }, location: { id: 'l', location: 'Locație ascunsă' } },
    ] }],
}

describe('show export configuration', () => {
    it('filters disabled channels while preserving their data in the original edition', () => {
        const view = applyShowExportSettings(entities, {
            lowerThirdTypesEnabled: true,
            document: { disabledEntityTypes: ['locations', 'phoneCalls'] } as TemplateDocument,
        })
        const csvs = mapEntitiesStateToExportCsvs(view)
        expect(csvs.locationsCsv).not.toContain('Locație ascunsă')
        expect(csvs.phonesCsv).not.toContain('TELEFON')
        expect(csvs.personsCsv).toContain('INVITAT')
        expect(entities.sections[0].rows[1].person?.image).toBe('apel.jpg')
        expect(entities.sections[0].rows[1].location?.location).toBe('Locație ascunsă')
    })

    it('uses the ordinary template consistently when variants are disabled, retaining the stored assignments', () => {
        const view = applyShowExportSettings(entities, { lowerThirdTypesEnabled: false, document: {} as TemplateDocument })
        expect(view.sections[0].rows[0].title).toMatchObject({ lowerThirdTypeId: 'ordinary', lowerThirdTemplateOverride: '' })
        expect(view.sections[0].rows[0].person?.lowerThirdTypeId).toBe('ordinary')
        expect(entities.sections[0].rows[0].title?.lowerThirdTypeId).toBe('breaking-news')
        expect(entities.sections[0].rows[0].title?.lowerThirdTemplateOverride).toBe('ALT_TEMPLATE')
    })
})
