import { describe, expect, it, vi, afterEach } from 'vitest'
import { mapFullCsvContentToExportCsvs } from '@/features/entity-export/domain/entityExportMapper'
import type { CsvState, CsvAction } from '../state/csv.types'
import { initialCsvState } from '../state/csv.types'
import { TITLE_DIVIDER_MARKER } from '../domain/plateauTitleList'
import { csvService } from './csvService'
import { reorderPlateauTitlesService } from './reorderPlateauTitlesService'

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
                    { id: 'row-title-1', title: { id: 'title-1', title: 'FIRST TITLE' } },
                    { id: 'divider-row-1', titleDivider: { type: 'divider', id: 'divider-1' } },
                    { id: 'row-hot-1', hotTitle: { id: 'hot-1', title: 'HOT TITLE' } },
                    { id: 'row-title-2', title: { id: 'title-2', title: 'SECOND TITLE' } },
                    { id: 'divider-row-2', titleDivider: { type: 'divider', id: 'divider-2' } },
                    { id: 'row-title-3', title: { id: 'title-3', title: 'THIRD TITLE' } },
                ],
            }],
        },
    }
}

function getWrittenCsv(writeSpy: ReturnType<typeof vi.spyOn>) {
    return String(writeSpy.mock.calls.at(-1)?.[0] ?? '')
}

describe('reorderPlateauTitlesService', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('persists a valid reorder', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const dispatch = vi.fn()

        const result = await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch,
        })

        expect(result).toEqual({ ok: true })
        expect(dispatch).toHaveBeenCalledTimes(1)
        expect(writeSpy).toHaveBeenCalledTimes(1)
    })

    it('recalculates title numbers', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch: vi.fn(),
        })

        const writtenCsv = getWrittenCsv(writeSpy)
        expect(writtenCsv).toContain('1;FIRST TITLE')
        expect(writtenCsv).toContain('2;THIRD TITLE')
        expect(writtenCsv).toContain('3;SECOND TITLE')
    })

    it('keeps dividers in the full CSV', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch: vi.fn(),
        })

        expect(getWrittenCsv(writeSpy)).toContain(TITLE_DIVIDER_MARKER)
    })

    it('excludes dividers from the separate exports', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch: vi.fn(),
        })

        const exports = mapFullCsvContentToExportCsvs(getWrittenCsv(writeSpy))
        expect(exports.titlesCsv).not.toContain(TITLE_DIVIDER_MARKER)
        expect(exports.titlesCsv).not.toContain('Ultima Ora')
    })

    it('rolls back when the full CSV write fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'CSV_WRITE_FAILED' })
        const dispatch = vi.fn()

        const result = await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch,
        })

        expect(result).toEqual({ ok: false, error: 'CSV_WRITE_FAILED' })
        expect(dispatch).toHaveBeenCalledTimes(2)
        expect((dispatch.mock.calls[1][0] as CsvAction).type).toBe('TITLE_LIST_REORDER')
        expect((dispatch.mock.calls[1][0] as Extract<CsvAction, { type: 'TITLE_LIST_REORDER' }>).payload.items).toEqual([
            { type: 'title', rowId: 'row-title-1' },
            { type: 'divider', id: 'divider-1' },
            { type: 'title', rowId: 'row-title-2' },
            { type: 'divider', id: 'divider-2' },
            { type: 'title', rowId: 'row-title-3' },
        ])
    })

    it('rolls back when PA_titles.csv export fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        const dispatch = vi.fn()

        const result = await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'row-title-3',
            overId: 'row-title-2',
            dispatch,
        })

        expect(result).toEqual({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        expect(dispatch).toHaveBeenCalledTimes(2)
    })

    it('does not write anything for an invalid reorder', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const dispatch = vi.fn()

        const result = await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'missing',
            overId: 'row-title-2',
            dispatch,
        })

        expect(result).toEqual({ ok: false, error: 'TITLE_REORDER_FAILED' })
        expect(dispatch).not.toHaveBeenCalled()
        expect(writeSpy).not.toHaveBeenCalled()
    })

    it('does not start persistence when a reorder would create consecutive dividers', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const dispatch = vi.fn()

        const result = await reorderPlateauTitlesService.reorder({
            state: makeState(),
            sectionId: 'invited-1',
            activeId: 'divider-2',
            overId: 'divider-1',
            dispatch,
        })

        expect(result).toEqual({ ok: false, error: 'Nu pot exista două separatoare consecutive.' })
        expect(dispatch).not.toHaveBeenCalled()
        expect(writeSpy).not.toHaveBeenCalled()
    })
})
