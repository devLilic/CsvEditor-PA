import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityEditor } from './EntityEditor'
import { EditModeProvider } from '@/ui/context/EditModeContext'

const csvHooks = vi.hoisted(() => ({
    activeEntityType: 'titles' as
        | 'titles'
        | 'persons'
        | 'locations'
        | 'phoneCalls'
        | 'hotTitles'
        | 'waitTitles'
        | 'waitLocations',
    activeSectionId: 'invited-1' as string | null,
    activeSection: { id: 'invited-1', kind: 'invited', rows: [] } as any,
    selected: null as null | { sectionId: string; entityType: 'titles'; id: string },
    quickTitles: ['INVITAT: ', 'MODERATOR: '] as string[],
    templateDocument: {
        templates: {
            titles: {
                layers: [
                    { type: 'text', fieldId: 'supratitle', inputLabel: 'Supratitlu' },
                ],
            },
            persons: {},
            locations: {},
            phoneCalls: {},
            hotTitles: {},
            waitTitles: {},
            waitLocations: {},
        },
    },
    getBlockItems: vi.fn(() => []),
    addEntity: vi.fn(),
    updateEntity: vi.fn(),
    savePersonEntity: vi.fn(),
    clearSelection: vi.fn(),
    setActiveEntityType: vi.fn((type) => {
        csvHooks.activeEntityType = type
    }),
    setAllQuickTitles: vi.fn(),
}))

const phoneImageSettingsServiceMock = vi.hoisted(() => ({
    getPhoneImageSettings: vi.fn(),
}))

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        useEntities: () => ({
            activeSectionId: csvHooks.activeSectionId,
            activeSection: csvHooks.activeSection,
            getBlockItems: csvHooks.getBlockItems,
            addEntity: csvHooks.addEntity,
            updateEntity: csvHooks.updateEntity,
            savePersonEntity: csvHooks.savePersonEntity,
            addPlateauTitleDivider: vi.fn(),
            importPlateauTitlesFromBackup: vi.fn(),
        }),
        useSelectedEntity: () => ({
            selected: csvHooks.selected,
            clearSelection: csvHooks.clearSelection,
        }),
        useActiveEntityType: () => ({
            activeViewType: csvHooks.activeEntityType,
            setActiveViewType: csvHooks.setActiveEntityType,
            activeEntityType: csvHooks.activeEntityType,
            setActiveEntityType: csvHooks.setActiveEntityType,
        }),
        useQuickTitles: () => ({
            quickTitles: csvHooks.quickTitles,
            addQuickTitle: vi.fn(),
            removeQuickTitle: vi.fn(),
            setAllQuickTitles: csvHooks.setAllQuickTitles,
        }),
    }
})

vi.mock('@/features/csv-editor/services/phoneImageSettingsService', () => ({
    phoneImageSettingsService: {
        getPhoneImageSettings: phoneImageSettingsServiceMock.getPhoneImageSettings,
    },
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    TemplateDocumentProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useTemplateDocument: () => ({
        document: csvHooks.templateDocument,
    }),
}))

vi.mock('./Preview16x9', () => ({
    Preview16x9: () => <div data-testid="preview16x9-root" />,
}))

beforeEach(() => {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        configurable: true,
        value: ResizeObserverMock,
    })
})

beforeEach(() => {
    csvHooks.activeEntityType = 'titles'
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.activeSection = { id: 'invited-1', kind: 'invited', rows: [] }
    csvHooks.selected = null
    csvHooks.quickTitles = ['INVITAT: ', 'MODERATOR: ']
    csvHooks.getBlockItems.mockReset()
    csvHooks.getBlockItems.mockReturnValue([])
    csvHooks.addEntity.mockClear()
    csvHooks.updateEntity.mockClear()
    csvHooks.savePersonEntity.mockReset()
    csvHooks.savePersonEntity.mockResolvedValue({ ok: true })
    csvHooks.clearSelection.mockClear()
    csvHooks.setActiveEntityType.mockClear()
    csvHooks.setAllQuickTitles.mockReset()
    phoneImageSettingsServiceMock.getPhoneImageSettings.mockReset()
    phoneImageSettingsServiceMock.getPhoneImageSettings.mockResolvedValue({})
})

afterEach(() => {
    cleanup()
})

function TestProviders({ children }: { children: ReactNode }) {
    return (
        <EditModeProvider>
            {children}
        </EditModeProvider>
    )
}

function renderEntityEditor() {
    return render(
        <TestProviders>
            <EntityEditor />
        </TestProviders>
    )
}

function titleInput() {
    return screen.getByLabelText('Titlu') as HTMLInputElement
}

async function seedRepeatedQuickTitle(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
    await user.type(titleInput(), 'Ion Popescu')
}

describe('EntityEditor QuickTitle toggle', () => {
    it('uses a guest full-name QuickTitle to start a quote and fills Supratitlu', async () => {
        csvHooks.quickTitles = ['ANA BUJOR: ']
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'persons', id: 'person-1', rowId: 'row-1', data: { name: 'ANA BUJOR' } },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'ANA BUJOR:' }))

        const title = titleInput()
        expect(title).toHaveValue('""')
        expect(title).toHaveFocus()
        expect(title.selectionStart).toBe(1)
        expect(title.selectionEnd).toBe(1)
        expect(screen.getByLabelText('Supratitlu')).toHaveValue('ANA BUJOR:')
        expect(screen.getByRole('button', { name: 'ANA BUJOR:' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('keeps a matching Beta quick title as a normal prefix', async () => {
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', rows: [] }
        csvHooks.quickTitles = ['ANA BUJOR: ']
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'persons', id: 'person-1', rowId: 'row-1', data: { name: 'ANA BUJOR' } },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'ANA BUJOR:' }))

        expect(titleInput()).toHaveValue('ANA BUJOR: ')
        expect(screen.getByLabelText('Supratitlu')).toHaveValue('')
    })

    it('clears Supratitlu and only removes quote marks when a guest QuickTitle is toggled off', async () => {
        csvHooks.quickTitles = ['ANA BUJOR: ']
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'persons', id: 'person-1', rowId: 'row-1', data: { name: 'ANA BUJOR' } },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'ANA BUJOR:' }))
        await user.keyboard('Text citat')
        expect(titleInput()).toHaveValue('"Text citat"')

        await user.click(screen.getByRole('button', { name: 'ANA BUJOR:' }))

        expect(titleInput()).toHaveValue('Text citat')
        expect(screen.getByLabelText('Supratitlu')).toHaveValue('')
        expect(screen.getByLabelText('Supratitlu')).toHaveFocus()
        expect(screen.getByRole('button', { name: 'ANA BUJOR:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('saves the guest name as Supratitlu and restores an empty quote for the next title', async () => {
        csvHooks.quickTitles = ['ANA BUJOR: ']
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'persons', id: 'person-1', rowId: 'row-1', data: { name: 'ANA BUJOR' } },
        ])
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'ANA BUJOR:' }))
        await user.keyboard('Text citat')
        await user.keyboard('{Enter}')

        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'titles', {
            supratitle: 'ANA BUJOR:',
            title: '"Text citat"',
        })
        expect(screen.getByLabelText('Supratitlu')).toHaveValue('ANA BUJOR:')
        expect(titleInput()).toHaveValue('""')
        expect(titleInput().selectionStart).toBe(1)
    })

    it('inserts the QuickTitle on first click', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('INVITAT: ')
        expect(titleInput()).toHaveFocus()
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: 'MODERATOR:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('keeps operator text typed after the QuickTitle', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.type(titleInput(), 'Ion Popescu')

        expect(titleInput()).toHaveValue('INVITAT: Ion Popescu')
    })

    it('toggles the active QuickTitle off and preserves the title body', async () => {
        const user = userEvent.setup()
        renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('Ion Popescu')
        expect(screen.getByLabelText('Supratitlu')).toHaveFocus()
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('toggles off to an empty editor when only the prefix is present', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('normalizes a lowercase QuickTitle when toggling it on and off', async () => {
        const user = userEvent.setup()
        csvHooks.quickTitles = ['breaking: ']
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'BREAKING:' }))
        await user.type(titleInput(), 'Text curent')

        expect(titleInput()).toHaveValue('BREAKING: Text curent')
        expect(screen.getByRole('button', { name: 'BREAKING:' })).toHaveAttribute('aria-pressed', 'true')

        await user.click(screen.getByRole('button', { name: 'BREAKING:' }))

        expect(titleInput()).toHaveValue('Text curent')
        expect(screen.getByRole('button', { name: 'BREAKING:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('turns the QuickTitle off when its prefix is removed manually', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'true')

        await user.clear(titleInput())
        await user.type(titleInput(), 'Titlu fara declarant')

        expect(titleInput()).toHaveValue('Titlu fara declarant')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('activates only the newly selected QuickTitle and preserves the title body', async () => {
        const user = userEvent.setup()
        renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        await user.click(screen.getByRole('button', { name: 'MODERATOR:' }))

        expect(titleInput()).toHaveValue('MODERATOR: Ion Popescu')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'false')
        expect(screen.getByRole('button', { name: 'MODERATOR:' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not save a title containing only the active QuickTitle', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
        await user.keyboard('{Enter}')
        expect(csvHooks.addEntity).not.toHaveBeenCalled()
    })

    it('restores the active QuickTitle after adding a title with Enter', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.type(titleInput(), 'Ion Popescu')
        await user.keyboard('{Enter}')

        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'titles', {
            title: 'INVITAT: Ion Popescu',
        })
        expect(titleInput()).toHaveValue('INVITAT: ')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: /Adaug/i })).toBeDisabled()
    })

    it('clears the editor after adding a title while QuickTitles are off', async () => {
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.type(titleInput(), 'Ion Popescu')
        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.click(screen.getByRole('button', { name: /Adaug/i }))

        expect(csvHooks.addEntity).toHaveBeenCalledWith('invited-1', 'titles', {
            title: 'Ion Popescu',
        })
        expect(titleInput()).toHaveValue('')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('restores the active QuickTitle after updating an existing title', async () => {
        csvHooks.selected = { sectionId: 'invited-1', entityType: 'titles', id: 'title-1' }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'titles',
                id: 'title-1',
                data: { title: 'INVITAT: Ion Popescu' },
            },
        ])
        csvHooks.clearSelection.mockImplementationOnce(() => {
            csvHooks.selected = null
        })
        const user = userEvent.setup()
        renderEntityEditor()

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))
        await user.click(screen.getByRole('button', { name: /Update/ }))

        expect(csvHooks.updateEntity).toHaveBeenCalledWith(
            'invited-1',
            'titles',
            'title-1',
            { supratitle: '', title: 'INVITAT: Ion Popescu' },
        )
        expect(titleInput()).toHaveValue('INVITAT: ')
        expect(screen.getByRole('button', { name: 'INVITAT:' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('resets memory when another title is selected', async () => {
        const user = userEvent.setup()
        const view = renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        csvHooks.selected = { sectionId: 'invited-1', entityType: 'titles', id: 'title-2' }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'titles',
                id: 'title-2',
                data: { title: 'INVITAT: Maria Ionescu' },
            },
        ])
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('INVITAT: Maria Ionescu')
    })

    it('resets memory when a new title create flow starts', async () => {
        const user = userEvent.setup()
        const view = renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        csvHooks.selected = { sectionId: 'invited-1', entityType: 'titles', id: 'title-2' }
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'titles',
                id: 'title-2',
                data: { title: 'MODERATOR: Maria Ionescu' },
            },
        ])
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)

        csvHooks.selected = null
        csvHooks.getBlockItems.mockReturnValue([])
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)

        await user.type(titleInput(), 'Maria Ionescu')
        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('INVITAT: Maria Ionescu')
    })

    it('resets memory when the section changes', async () => {
        const user = userEvent.setup()
        const view = renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        csvHooks.activeSectionId = 'invited-2'
        csvHooks.activeSection = { id: 'invited-2', kind: 'invited', rows: [] }
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('INVITAT: Ion Popescu')
    })

    it('resets memory when the entity type changes', async () => {
        const user = userEvent.setup()
        const view = renderEntityEditor()
        await seedRepeatedQuickTitle(user)

        csvHooks.activeEntityType = 'persons'
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)
        expect(screen.getByLabelText('Nume')).toBeInTheDocument()

        csvHooks.activeEntityType = 'titles'
        view.rerender(<TestProviders><EntityEditor /></TestProviders>)

        await user.click(screen.getByRole('button', { name: 'INVITAT:' }))

        expect(titleInput()).toHaveValue('INVITAT: Ion Popescu')
    })
})
