import { describe, expect, it } from 'vitest'
import type { EntitiesState } from '../../csv-editor/domain/entities'
import { createTitleDivider, TITLE_DIVIDER_MARKER } from '../../csv-editor/domain/plateauTitleList'
import {
    mapPaTitlesExport,
    mapPaTitlesWithHotExport,
} from './paEntityExportMapper'

function stateWithDividers(): EntitiesState {
    return {
        sections: [
            {
                id: 'beta-1',
                kind: 'beta',
                betaIndex: 1,
                betaTitle: 'Externe',
                rows: [
                    { id: 'beta-divider', titleDivider: createTitleDivider('beta-divider') },
                    { id: 'beta-title-1', title: { id: 'bt1', title: 'Beta 1' } },
                    { id: 'beta-title-2', title: { id: 'bt2', title: 'Beta 2' } },
                ],
            },
            {
                id: 'invited',
                kind: 'invited',
                rows: [
                    { id: 'divider-before', titleDivider: createTitleDivider('divider-before') },
                    {
                        id: 'invited-title-1',
                        title: { id: 'it1', title: 'Platou 1', supratitle: 'Supra 1' },
                        hotTitle: { id: 'hot1', title: 'Hot 1' },
                    },
                    { id: 'divider-middle', titleDivider: createTitleDivider('divider-middle') },
                    {
                        id: 'hot-only',
                        hotTitle: { id: 'hot2', title: 'Hot 2' },
                    },
                    {
                        id: 'invited-title-2',
                        title: { id: 'it2', title: 'Platou 2' },
                    },
                    {
                        id: 'extra-hot',
                        hotTitle: { id: 'hot3', title: 'Hot 3' },
                    },
                ],
            },
        ],
    }
}

describe('PA title exports', () => {
    it('writes PA_titles.csv with the additive Supratitlu column, markers, ordered titles, and no hot titles or dividers', () => {
        const csv = mapPaTitlesExport(stateWithDividers())

        expect(csv).toBe([
            'Nr;Titlu;Supratitlu;Template',
            '--- beta 1 - Externe ---;;;',
            '1;Beta 1;;01_Titlu',
            '2;Beta 2;;01_Titlu',
            '--- INVITATI ---;;;',
            '1;Platou 1;Supra 1;01_Titlu',
            '2;Platou 2;;01_Titlu',
        ].join('\n'))
        expect(csv).not.toContain('Ultima Ora')
        expect(csv).not.toContain('Hot 1')
        expect(csv).not.toContain(TITLE_DIVIDER_MARKER)
    })

    it('writes PA_titles_with_hot.csv with Supratitlu, hot titles, ordered titles, and no dividers', () => {
        const csv = mapPaTitlesWithHotExport(stateWithDividers())

        expect(csv).toBe([
            'Nr;Titlu;Supratitlu;Ultima Ora',
            '--- beta 1 - Externe ---;;;',
            '1;Beta 1;;',
            '2;Beta 2;;',
            '--- INVITATI ---;;;',
            '1;Platou 1;Supra 1;Hot 1',
            '2;Platou 2;;Hot 2',
            ';;;Hot 3',
        ].join('\n'))
        expect(csv).toContain('Ultima Ora')
        expect(csv).toContain('Hot 1')
        expect(csv).toContain('Hot 2')
        expect(csv).toContain('Hot 3')
        expect(csv).not.toContain(TITLE_DIVIDER_MARKER)
    })
})
