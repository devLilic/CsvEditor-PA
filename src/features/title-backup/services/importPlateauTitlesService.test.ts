import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CsvState } from '@/features/csv-editor/state/csv.types'
import { initialCsvState } from '@/features/csv-editor/state/csv.types'
import type { TitleBackupListItem } from '../domain/titleBackupCsv'
import {
    appendSelectedPlateauTitles,
    importPlateauTitles,
    type ImportPlateauTitlesDeps,
} from './importPlateauTitlesService'

function makeState(): CsvState {
    return {
        ...initialCsvState,
        isLoaded: true,
        activeSectionId: 'invited-1',
        activeViewType: 'titles',
        activeEntityType: 'titles',
        entities: {
            sections: [{
                id: 'invited-1',
                kind: 'invited',
                rows: [
                    { id: 'row-existing-1', title: { id: 'title-existing-1', nr: '1', title: 'EXISTING 1' } },
                    { id: 'row-hot-1', hotTitle: { id: 'hot-1', title: 'HOT TITLE' } },
                    { id: 'row-existing-2', title: { id: 'title-existing-2', nr: '2', title: 'EXISTING 2' } },
                ],
            }],
        },
    }
}

function plateauTitles(state: CsvState): string[] {
    return state.entities.sections[0].rows.flatMap((row) => row.title ? [row.title.title] : [])
}

function plateauTitleNumbers(state: CsvState): string[] {
    return state.entities.sections[0].rows.flatMap((row) => row.title ? [row.title.nr ?? ''] : [])
}

describe('importPlateauTitlesService', () => {
    let ids: string[]
    let calls: string[]
    let deps: ImportPlateauTitlesDeps

    const selectedItems: TitleBackupListItem[] = [
        { type: 'title', title: 'IMPORTED 1' },
        { type: 'divider' },
        { type: 'title', title: 'IMPORTED 2' },
    ]

    beforeEach(() => {
        ids = ['row-import-1', 'title-import-1', 'row-import-2', 'title-import-2', 'row-import-3', 'title-import-3']
        calls = []
        deps = {
            createId: () => ids.shift() ?? 'fallback-id',
            writeFullCsv: vi.fn(async () => {
                calls.push('full-csv')
                return { ok: true }
            }),
            writePaTitlesCsv: vi.fn(async () => {
                calls.push('pa-titles')
                return { ok: true }
            }),
            getActiveTitleBackupFile: vi.fn(async () => '03_07_2026_titluri.csv'),
            writeTitleBackup: vi.fn(async () => {
                calls.push('title-backup')
                return { ok: true }
            }),
        }
    })

    it('imports only selected titles', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems,
            createId: deps.createId,
        })

        expect(plateauTitles(nextState)).toEqual([
            'EXISTING 1',
            'EXISTING 2',
            'IMPORTED 1',
            'IMPORTED 2',
        ])
    })

    it('ignores dividers', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems,
            createId: deps.createId,
        })

        expect(nextState.entities.sections[0].rows.some((row) => row.titleDivider)).toBe(false)
    })

    it('ignores hotTitles', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems: [
                { type: 'title', title: 'IMPORTED' },
            ],
            createId: deps.createId,
        })

        expect(nextState.entities.sections[0].rows.at(-1)?.hotTitle).toBeUndefined()
    })

    it('adds titles at the end', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems,
            createId: deps.createId,
        })

        expect(nextState.entities.sections[0].rows.slice(-2).map((row) => row.title?.title)).toEqual([
            'IMPORTED 1',
            'IMPORTED 2',
        ])
    })

    it('keeps the selected order', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems: [
                { type: 'title', title: 'SECOND SELECTED' },
                { type: 'title', title: 'FIRST SELECTED' },
            ],
            createId: deps.createId,
        })

        expect(plateauTitles(nextState).slice(-2)).toEqual([
            'SECOND SELECTED',
            'FIRST SELECTED',
        ])
    })

    it('allows duplicates', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems: [
                { type: 'title', title: 'EXISTING 1' },
            ],
            createId: deps.createId,
        })

        expect(plateauTitles(nextState).filter((title) => title === 'EXISTING 1')).toHaveLength(2)
    })

    it('renumbers titles', () => {
        const nextState = appendSelectedPlateauTitles({
            state: makeState(),
            selectedItems,
            createId: deps.createId,
        })

        expect(plateauTitleNumbers(nextState)).toEqual(['1', '2', '3', '4'])
    })

    it('persists the working edition and active title backup', async () => {
        const dispatch = vi.fn()

        await importPlateauTitles({
            state: makeState(),
            selectedItems,
            dispatch,
            deps,
        })

        expect(deps.writeFullCsv).toHaveBeenCalledOnce()
        expect(deps.writeTitleBackup).toHaveBeenCalledOnce()
        expect(deps.getActiveTitleBackupFile).toHaveBeenCalledOnce()
    })

    it('writes the active title backup after the full working edition', async () => {
        await importPlateauTitles({
            state: makeState(),
            selectedItems,
            dispatch: vi.fn(),
            deps,
        })

        expect(calls).toEqual([
            'full-csv',
            'title-backup',
        ])
    })

    it('rolls back when persisting the full working edition fails', async () => {
        deps.writeFullCsv = vi.fn(async () => {
            calls.push('full-csv')
            return { ok: false, error: 'FULL_CSV_WRITE_FAILED' }
        })
        const dispatch = vi.fn()
        const state = makeState()

        const result = await importPlateauTitles({
            state,
            selectedItems,
            dispatch,
            deps,
        })

        expect(result).toEqual({
            ok: false,
            error: 'FULL_CSV_WRITE_FAILED',
            state,
        })
        expect(dispatch).toHaveBeenCalledTimes(2)
        expect(dispatch.mock.calls[1][0]).toEqual({
            type: 'ENTITY_CLEAR_ALL',
            payload: state.entities,
        })
        expect(deps.writeTitleBackup).not.toHaveBeenCalled()
    })
})
