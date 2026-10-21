import { describe, expect, it } from 'vitest'
import { DEFAULT_LOWER_THIRD_TYPES } from './lowerThirdTypes'
import { migrateHotTitlesToUrgent, restoreLowerThirdAssignments } from './lowerThirdAssignments'
import type { EntitiesState } from '@/features/csv-editor/domain/entities'

const baseEntities: EntitiesState = {
    sections: [{
        id: 'invited',
        kind: 'invited',
        rows: [
            { id: 't1', title: { id: 'title1', title: 'Duplicate' }, person: { id: 'p1', name: 'Ana', occupation: 'Reporter' } },
            { id: 't2', title: { id: 'title2', title: 'Duplicate' }, person: { id: 'p2', name: 'Ana', occupation: 'Reporter' } },
            { id: 't3', title: { id: 'title3', title: 'Unmatched' } },
        ],
    }],
}

describe('lower-third assignment restoration', () => {
    it('matches by section and content, consuming duplicate matches in export order', () => {
        const result = restoreLowerThirdAssignments({
            entities: baseEntities,
            types: DEFAULT_LOWER_THIRD_TYPES,
            titlesExport: [
                'Nr;Titlu;Supratitlu;Template',
                '--- INVITATI ---;;;',
                '1;Duplicate;;03_Titlu_Breaking_News',
                '2;Duplicate;;05_Titlu_Ultima_Ora',
                '99;Stale;;05_Titlu_Ultima_Ora',
            ].join('\n'),
            personsExport: [
                'Sectiune;Nume;Functie;Template',
                '--- INVITATI ---;;;',
                ';Ana;Reporter;04_Nume_Breaking_News',
                ';Ana;Reporter;06_Nume_Ultima_Ora',
            ].join('\n'),
        })

        const rows = result.sections[0].rows
        expect(rows[0].title?.lowerThirdTypeId).toBe('breaking-news')
        expect(rows[1].title?.lowerThirdTypeId).toBe('urgent')
        expect(rows[2].title?.lowerThirdTypeId).toBeUndefined()
        expect(rows[0].person?.lowerThirdTypeId).toBe('breaking-news')
        expect(rows[1].person?.lowerThirdTypeId).toBe('urgent')
    })

    it('falls back to ordinary for unknown templates and keeps the raw override with a warning', () => {
        const warnings: string[] = []
        const result = restoreLowerThirdAssignments({
            entities: { sections: [{ id: 'invited', kind: 'invited', rows: [{ id: 't', title: { id: 't', title: 'Title' } }] }] },
            types: DEFAULT_LOWER_THIRD_TYPES,
            titlesExport: 'Nr;Titlu;Supratitlu;Template\n--- INVITATI ---;;;\n1;Title;;legacy-template',
            onWarning: (warning) => warnings.push(warning),
        })

        expect(result.sections[0].rows[0].title).toMatchObject({
            lowerThirdTypeId: 'ordinary',
            lowerThirdTemplateOverride: 'legacy-template',
        })
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain('legacy-template')
    })

    it('moves legacy hot headlines into regular title rows and keeps urgent export metadata', () => {
        const result = migrateHotTitlesToUrgent({
            sections: [{
                id: 'invited',
                kind: 'invited',
                rows: [
                    { id: 'both', title: { id: 't', title: 'Regular' }, hotTitle: { id: 'h', title: 'Urgent' }, person: { id: 'p', name: 'Ana', occupation: 'Reporter' } },
                    { id: 'hot-only', hotTitle: { id: 'h2', title: 'Urgent only' } },
                ],
            }],
        })

        const rows = result.sections[0].rows
        expect(rows).toHaveLength(3)
        expect(rows[0]).toMatchObject({ id: 'both', title: { title: 'Regular' }, person: { id: 'p' }, hotTitle: undefined })
        expect(rows[1]).toMatchObject({ id: 'h', title: { title: 'Urgent', lowerThirdTypeId: 'urgent' } })
        expect(rows[1].person).toBeUndefined()
        expect(rows[2]).toMatchObject({ id: 'hot-only', title: { title: 'Urgent only', lowerThirdTypeId: 'urgent' }, hotTitle: undefined })
    })
})
