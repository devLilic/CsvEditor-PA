import React, { type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mapFullCsvContentToExportCsvs } from '@/features/entity-export/domain/entityExportMapper'
import { CsvProvider, useEntities } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { TITLE_DIVIDER_MARKER } from '../domain/plateauTitleList'
import { csvService } from './csvService'

function wrapper({ children }: { children: ReactNode }) {
    return React.createElement(CsvProvider, null, children)
}

function useHarness() {
    const { dispatch, state } = useCsvContext()
    const entities = useEntities()
    const rows = state.entities.sections.find((section) => section.id === state.activeSectionId)?.rows ?? []
    const titleListItems = rows.flatMap((row) => {
        if (row.title) return [`title:${row.id}:${row.title.nr ?? ''}:${row.title.title}`]
        if (row.titleDivider) return [`divider:${row.titleDivider.id}`]
        return []
    })

    return {
        ...entities,
        titleListItems,
        seedInvitedWithoutDivider() {
            dispatch({
                type: 'CSV_LOADED',
                payload: {
                    sections: [{
                        id: 'invited-1',
                        kind: 'invited',
                        rows: [
                            { id: 'row-title-1', title: { id: 'title-1', title: 'FIRST TITLE' } },
                            { id: 'row-hot-1', hotTitle: { id: 'hot-1', title: 'HOT TITLE' } },
                            { id: 'row-title-2', title: { id: 'title-2', title: 'SECOND TITLE' } },
                        ],
                    }],
                },
            })
        },
        seedInvitedWithDivider() {
            dispatch({
                type: 'CSV_LOADED',
                payload: {
                    sections: [{
                        id: 'invited-1',
                        kind: 'invited',
                        rows: [
                            { id: 'row-title-1', title: { id: 'title-1', title: 'FIRST TITLE' } },
                            { id: 'divider-row-1', titleDivider: { type: 'divider', id: 'divider-1' } },
                            { id: 'row-hot-1', hotTitle: { id: 'hot-1', title: 'HOT TITLE' } },
                            { id: 'row-title-2', title: { id: 'title-2', title: 'SECOND TITLE' } },
                        ],
                    }],
                },
            })
        },
    }
}

function getWrittenCsv(writeSpy: ReturnType<typeof vi.spyOn>) {
    return String(writeSpy.mock.calls.at(-1)?.[0] ?? '')
}

describe('plateau title divider persistence orchestration', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('add divider updates the proposed list after persistence succeeds', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        await act(async () => {
            await result.current.addPlateauTitleDivider({ afterItemId: 'row-title-1' })
        })

        expect(result.current.titleListItems.join('|')).toMatch(/^title:row-title-1:1:FIRST TITLE\|divider:[^|]+\|title:row-title-2:2:SECOND TITLE$/)
    })

    it('writes the full CSV with the divider marker', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        await act(async () => {
            await result.current.addPlateauTitleDivider({ afterItemId: 'row-title-1' })
        })

        expect(getWrittenCsv(writeSpy)).toContain(TITLE_DIVIDER_MARKER)
    })

    it('derives PA_titles.csv without the divider marker from the persisted CSV', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        await act(async () => {
            await result.current.addPlateauTitleDivider({ afterItemId: 'row-title-1' })
        })

        const exports = mapFullCsvContentToExportCsvs(getWrittenCsv(writeSpy))
        expect(exports.titlesCsv).toContain('Nr;Titlu;Supratitlu')
        expect(exports.titlesCsv).not.toContain(TITLE_DIVIDER_MARKER)
    })

    it('exports titles without a separate Ultima Ora column or divider markers', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        await act(async () => {
            await result.current.addPlateauTitleDivider({ afterItemId: 'row-title-1' })
        })

        const exports = mapFullCsvContentToExportCsvs(getWrittenCsv(writeSpy))
        expect(exports.titlesCsv).toContain('Nr;Titlu;Supratitlu;Template')
        expect(exports.titlesCsv).not.toContain('Ultima Ora')
        expect(exports.titlesCsv).not.toContain(TITLE_DIVIDER_MARKER)
    })

    it('keeps the divider in state after successful persistence', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        await act(async () => {
            await result.current.addPlateauTitleDivider()
        })

        expect(result.current.titleListItems.some((item) => item.startsWith('divider:'))).toBe(true)
    })

    it('rolls back when the full CSV write fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'CSV_WRITE_FAILED' })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        const addResult = await act(async () => result.current.addPlateauTitleDivider())

        expect(addResult).toEqual({ ok: false, error: 'CSV_WRITE_FAILED' })
        expect(result.current.titleListItems).toEqual([
            'title:row-title-1::FIRST TITLE',
            'title:row-title-2::SECOND TITLE',
        ])
    })

    it('rolls back when PA_titles.csv export fails through the existing write flow', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithoutDivider())
        const addResult = await act(async () => result.current.addPlateauTitleDivider())

        expect(addResult).toEqual({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        expect(result.current.titleListItems.some((item) => item.startsWith('divider:'))).toBe(false)
    })

    it('delete divider uses the same persistence flow', async () => {
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithDivider())
        await act(async () => {
            await result.current.deletePlateauTitleDivider('divider-1')
        })

        const writtenCsv = getWrittenCsv(writeSpy)
        const exports = mapFullCsvContentToExportCsvs(writtenCsv)
        expect(writeSpy).toHaveBeenCalledTimes(1)
        expect(writtenCsv).not.toContain(TITLE_DIVIDER_MARKER)
        expect(exports.titlesCsv).not.toContain(TITLE_DIVIDER_MARKER)
        expect(exports.titlesCsv).not.toContain('Ultima Ora')
        expect(result.current.titleListItems).toEqual([
            'title:row-title-1:1:FIRST TITLE',
            'title:row-title-2:2:SECOND TITLE',
        ])
    })

    it('keeps the divider when delete persistence fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedInvitedWithDivider())
        const deleteResult = await act(async () => result.current.deletePlateauTitleDivider('divider-1'))

        expect(deleteResult).toEqual({ ok: false, error: 'ENTITY_EXPORT_FAILED: PA_titles.csv' })
        expect(result.current.titleListItems).toEqual([
            'title:row-title-1::FIRST TITLE',
            'divider:divider-1',
            'title:row-title-2::SECOND TITLE',
        ])
    })
})
