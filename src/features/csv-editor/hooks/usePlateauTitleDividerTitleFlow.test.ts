import React, { type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider, useEntities } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { csvService } from '../services/csvService'

function wrapper({ children }: { children: ReactNode }) {
    return React.createElement(CsvProvider, null, children)
}

function useHarness() {
    const { dispatch, state } = useCsvContext()
    const entities = useEntities()
    const section = state.entities.sections.find((candidate) => candidate.id === state.activeSectionId)
    const titleItems = section?.rows.flatMap((row) => {
        if (row.titleDivider) return [`divider:${row.titleDivider.id}`]
        if (row.title) return [`title:${row.title.title}`]
        return []
    }) ?? []

    return {
        ...entities,
        titleItems,
        seedEmptyInvited() {
            dispatch({
                type: 'CSV_LOADED',
                payload: {
                    sections: [{
                        id: 'invited-1',
                        kind: 'invited',
                        rows: [],
                    }],
                },
            })
        },
    }
}

describe('plateau title divider and title integration flow', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps a title after adding a divider, adding a title, then deleting the divider', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedEmptyInvited())
        let dividerId = ''
        await act(async () => {
            const addDividerResult = await result.current.addPlateauTitleDivider()
            dividerId = addDividerResult.dividerId ?? ''
        })
        await act(async () => {
            await result.current.addEntity('invited-1', 'titles', { title: 'TITLE AFTER DIVIDER' })
        })
        await act(async () => {
            await result.current.deletePlateauTitleDivider(dividerId)
        })

        expect(result.current.titleItems).toEqual(['title:TITLE AFTER DIVIDER'])
    })

    it('adds a newly written title after an existing divider and never above it', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedEmptyInvited())
        await act(async () => {
            await result.current.addPlateauTitleDivider()
        })
        await act(async () => {
            await result.current.addEntity('invited-1', 'titles', { title: 'WRITTEN TITLE' })
        })

        expect(result.current.titleItems).toEqual([
            expect.stringMatching(/^divider:/),
            'title:WRITTEN TITLE',
        ])
    })

    it('keeps the divider after adding a title and deleting that title', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedEmptyInvited())
        await act(async () => {
            await result.current.addPlateauTitleDivider()
        })
        await act(async () => {
            await result.current.addEntity('invited-1', 'titles', { title: 'TEMP TITLE' })
        })
        const titleItem = result.current.getBlockItems('invited-1', 'titles')
            .find((item: any) => item.type === 'title' && item.data?.title === 'TEMP TITLE') as any

        act(() => {
            result.current.deleteEntity('invited-1', 'titles', titleItem.id)
        })

        expect(result.current.titleItems).toEqual([
            expect.stringMatching(/^divider:/),
        ])
    })

    it('keeps only one divider after deleting a title between two dividers', async () => {
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const { result } = renderHook(() => useHarness(), { wrapper })

        act(() => result.current.seedEmptyInvited())
        await act(async () => {
            await result.current.addPlateauTitleDivider()
        })
        await act(async () => {
            await result.current.addEntity('invited-1', 'titles', { title: 'MIDDLE TITLE' })
        })
        const titleItem = result.current.getBlockItems('invited-1', 'titles')
            .find((item: any) => item.type === 'title' && item.data?.title === 'MIDDLE TITLE') as any
        await act(async () => {
            await result.current.addPlateauTitleDivider({ afterItemId: titleItem.rowId })
        })

        act(() => {
            result.current.deleteEntity('invited-1', 'titles', titleItem.id)
        })

        expect(result.current.titleItems).toEqual([
            expect.stringMatching(/^divider:/),
        ])
    })
})
