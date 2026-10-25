import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider, useEntities } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { TITLE_DIVIDER_MARKER } from '../domain/plateauTitleList'
import { csvService } from '../services/csvService'

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({ activeProjectId: 'show-a', activeProject: { id: 'show-a', lowerThirdTypes: [] } }),
    useOptionalTemplateDocument: () => ({
        activeProjectId: 'show-a',
        activeProject: { id: 'show-a', lowerThirdTypes: [] },
        workspaces: {},
        isLoaded: true,
        saveProject: vi.fn(),
    }),
}))
function TitleDividerHarness() {
    const { dispatch, state } = useCsvContext()
    const {
        addPlateauTitleDivider,
        deletePlateauTitleDivider,
        setActiveSection,
    } = useEntities()

    const activeSection = state.entities.sections.find((section) => section.id === state.activeSectionId)
    const rows = activeSection?.rows ?? []
    const mixedItems = rows.flatMap((row) => {
        if (row.title) return [`title:${row.id}:${row.title.nr ?? ''}:${row.title.title}`]
        if (row.titleDivider) return [`divider:${row.titleDivider.id}`]
        return []
    })

    const seedInvited = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [{
                    id: 'invited-1',
                    kind: 'invited',
                    rows: [
                        { id: 'row-title-1', title: { id: 'title-1', title: 'Titlu 1' } },
                        { id: 'row-title-2', title: { id: 'title-2', title: 'Titlu 2' } },
                    ],
                }],
            },
        })
    }

    const seedBeta = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    {
                        id: 'beta-1',
                        kind: 'beta',
                        betaIndex: 1,
                        betaTitle: 'Beta',
                        rows: [{ id: 'beta-title-row', title: { id: 'beta-title', title: 'Titlu beta' } }],
                    },
                    {
                        id: 'invited-1',
                        kind: 'invited',
                        rows: [{ id: 'row-title-1', title: { id: 'title-1', title: 'Titlu 1' } }],
                    },
                ],
            },
        })
        dispatch({ type: 'SECTION_SET_ACTIVE', payload: { sectionId: 'beta-1' } })
    }

    const addAtEnd = async () => {
        const result = await addPlateauTitleDivider()
        window.dispatchEvent(new CustomEvent('divider-add-result', { detail: result }))
    }

    const addAfterFirstTitle = async () => {
        const result = await addPlateauTitleDivider({ afterItemId: 'row-title-1' })
        window.dispatchEvent(new CustomEvent('divider-add-result', { detail: result }))
    }

    const addAfterInvalidItem = async () => {
        const result = await addPlateauTitleDivider({ afterItemId: 'missing-item' })
        window.dispatchEvent(new CustomEvent('divider-add-result', { detail: result }))
    }

    const deleteFirstDivider = async () => {
        const dividerId = rows.find((row) => row.titleDivider)?.titleDivider?.id ?? ''
        const result = await deletePlateauTitleDivider(dividerId)
        window.dispatchEvent(new CustomEvent('divider-delete-result', { detail: result }))
    }

    return (
        <div>
            <button onClick={seedInvited}>seed invited</button>
            <button onClick={seedBeta}>seed beta</button>
            <button onClick={() => setActiveSection('invited-1')}>activate invited</button>
            <button onClick={addAtEnd}>add divider end</button>
            <button onClick={addAfterFirstTitle}>add divider after first title</button>
            <button onClick={addAfterInvalidItem}>add divider after invalid item</button>
            <button onClick={deleteFirstDivider}>delete first divider</button>
            <div data-testid="active-section">{state.activeSectionId ?? ''}</div>
            <div data-testid="items">{mixedItems.join('|')}</div>
        </div>
    )
}

describe('useEntities plateau title divider operations', () => {
    afterEach(() => {
        cleanup()
    })

    it('adds a divider at the end of the active PLATOU title list and writes the full CSV', async () => {
        const user = userEvent.setup()
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('divider-add-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <TitleDividerHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed invited' }))
        await user.click(screen.getByRole('button', { name: 'add divider end' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith(expect.objectContaining({ ok: true, dividerId: expect.any(String) }))
        })
        expect(screen.getByTestId('items').textContent).toMatch(/^title:row-title-1:1:Titlu 1\|title:row-title-2:2:Titlu 2\|divider:/)
        expect(writeSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy.mock.calls[0][0]).toContain(TITLE_DIVIDER_MARKER)
    })

    it('inserts a divider immediately after a valid mixed-list item', async () => {
        const user = userEvent.setup()
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        render(
            <CsvProvider>
                <TitleDividerHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed invited' }))
        await user.click(screen.getByRole('button', { name: 'add divider after first title' }))

        await waitFor(() => {
            expect(screen.getByTestId('items').textContent).toMatch(/^title:row-title-1:1:Titlu 1\|divider:/)
        })
        expect(screen.getByTestId('items').textContent).toMatch(/\|title:row-title-2:2:Titlu 2$/)
    })

    it('falls back to appending when afterItemId is invalid', async () => {
        const user = userEvent.setup()
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        render(
            <CsvProvider>
                <TitleDividerHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed invited' }))
        await user.click(screen.getByRole('button', { name: 'add divider after invalid item' }))

        await waitFor(() => {
            expect(screen.getByTestId('items').textContent).toMatch(/\|divider:[^|]+$/)
        })
    })

    it('deletes only the selected divider and keeps title order', async () => {
        const user = userEvent.setup()
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        render(
            <CsvProvider>
                <TitleDividerHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed invited' }))
        await user.click(screen.getByRole('button', { name: 'add divider after first title' }))
        await waitFor(() => {
            expect(screen.getByTestId('items').textContent).toContain('divider:')
        })

        await user.click(screen.getByRole('button', { name: 'delete first divider' }))

        await waitFor(() => {
            expect(screen.getByTestId('items')).toHaveTextContent('title:row-title-1:1:Titlu 1|title:row-title-2:2:Titlu 2')
        })
    })

    it('does not add or delete dividers while BETA is active', async () => {
        const user = userEvent.setup()
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('divider-add-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <TitleDividerHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed beta' }))
        await user.click(screen.getByRole('button', { name: 'add divider end' }))

        expect(screen.getByTestId('active-section')).toHaveTextContent('beta-1')
        expect(resultSpy).toHaveBeenCalledWith({ ok: false, error: 'TITLE_DIVIDER_NOT_ALLOWED' })
        expect(screen.getByTestId('items')).toHaveTextContent('title:beta-title-row::Titlu beta')
        expect(writeSpy).not.toHaveBeenCalled()
    })
})

