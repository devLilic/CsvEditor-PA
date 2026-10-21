import { act, cleanup, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TITLE_DIVIDER_MARKER } from '@/features/csv-editor'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { EditModeProvider, useEditMode } from '@/ui/context/EditModeContext'
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'
import { EntityList } from '@/ui/components/EntityList'
import { QuickTitlesBar } from '@/ui/components/QuickTitlesBar'
import { PlateauTitleDivider } from '@/ui/components/titles/PlateauTitleDivider'

vi.mock('@/features/csv-editor/services/settingsService', () => ({
    settingsService: {
        getConfig: vi.fn().mockResolvedValue({}),
        getPlateauTitleDragDropEnabled: vi.fn(),
    },
}))

const csvHooks = vi.hoisted(() => ({
    activeSectionId: 'invited-1',
    activeSection: { id: 'invited-1', kind: 'invited', rows: [] as unknown[] } as any,
    activeEntityType: 'titles' as
        | 'titles'
        | 'persons'
        | 'locations'
        | 'phoneCalls'
        | 'hotTitles'
        | 'waitTitles'
        | 'waitLocations',
    getBlockItems: vi.fn(),
    deleteEntity: vi.fn(),
    deletePlateauTitleDivider: vi.fn(),
    reorderPlateauTitleItems: vi.fn(),
    select: vi.fn(),
    isSelected: vi.fn(() => false),
    quickTitles: ['Breaking', 'Foarte lung prefix de test pentru truncation'],
    addQuickTitle: vi.fn(),
    removeQuickTitle: vi.fn(),
    setAllQuickTitles: vi.fn(),
}))

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        useEntities: () => ({
            activeSectionId: csvHooks.activeSectionId,
            activeSection: csvHooks.activeSection,
            getBlockItems: csvHooks.getBlockItems,
            deleteEntity: csvHooks.deleteEntity,
            deletePlateauTitleDivider: csvHooks.deletePlateauTitleDivider,
            reorderPlateauTitleItems: csvHooks.reorderPlateauTitleItems,
        }),
        useActiveEntityType: () => ({
            activeViewType: csvHooks.activeEntityType,
            activeEntityType: csvHooks.activeEntityType,
        }),
        useSelectedEntity: () => ({
            select: csvHooks.select,
            isSelected: csvHooks.isSelected,
        }),
        useQuickTitles: () => ({
            quickTitles: csvHooks.quickTitles,
            addQuickTitle: csvHooks.addQuickTitle,
            removeQuickTitle: csvHooks.removeQuickTitle,
            setAllQuickTitles: csvHooks.setAllQuickTitles,
        }),
    }
})

function EditModeOn() {
    const { toggleEditMode } = useEditMode()

    return <button onClick={toggleEditMode}>toggle edit mode</button>
}

function title(id: string, value: string) {
    return {
        type: 'title',
        entityType: 'titles',
        id,
        rowId: `row-${id}`,
        data: { title: value },
    }
}

function renderEntityList({ editMode = false } = {}) {
    render(
        <EditModeProvider>
            <TitleFilterProvider>
                {editMode && <EditModeOn />}
                <EntityList />
            </TitleFilterProvider>
        </EditModeProvider>,
    )

    if (editMode) {
        act(() => {
            screen.getByRole('button', { name: 'toggle edit mode' }).click()
        })
    }
}

beforeEach(() => {
    vi.mocked(settingsService.getConfig).mockReset()
    vi.mocked(settingsService.getConfig).mockResolvedValue({} as Awaited<ReturnType<typeof settingsService.getConfig>>)
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.activeSection = { id: 'invited-1', kind: 'invited', rows: [] }
    csvHooks.activeEntityType = 'titles'
    csvHooks.getBlockItems.mockReset()
    csvHooks.getBlockItems.mockReturnValue([
        title('title-1', 'ECONOMIE'),
        { type: 'divider', id: 'divider-1' },
        title('title-2', 'ECONOMIE'),
    ])
    csvHooks.deleteEntity.mockClear()
    csvHooks.deletePlateauTitleDivider.mockReset()
    csvHooks.deletePlateauTitleDivider.mockResolvedValue({ ok: true })
    csvHooks.reorderPlateauTitleItems.mockReset()
    csvHooks.reorderPlateauTitleItems.mockResolvedValue({ ok: true })
    csvHooks.select.mockClear()
    csvHooks.isSelected.mockClear()
    csvHooks.isSelected.mockReturnValue(false)
    csvHooks.addQuickTitle.mockClear()
    csvHooks.removeQuickTitle.mockClear()
    vi.mocked(settingsService.getPlateauTitleDragDropEnabled).mockReset()
    vi.mocked(settingsService.getPlateauTitleDragDropEnabled).mockResolvedValue(true)
})

afterEach(() => {
    cleanup()
})

describe('classic studio workspace theme', () => {
    it('dividerul nu afiseaza markerul', () => {
        render(
            <PlateauTitleDivider
                dividerId="divider-1"
                canDelete
                onDelete={vi.fn()}
            />,
        )

        expect(screen.getByTestId('plateau-title-divider')).toBeInTheDocument()
        expect(screen.queryByText(TITLE_DIVIDER_MARKER)).not.toBeInTheDocument()
    })

    it('duplicatele folosesc tokenul dedicat', () => {
        renderEntityList()

        screen.getAllByText('ECONOMIE').forEach((node) => {
            const row = node.closest('.app-list-row')
            expect(row).toHaveClass('bg-[var(--duplicate-title-bg)]')
            expect(row).toHaveClass('border-l-[var(--duplicate-title-border)]')
            expect(row).toHaveClass('text-[var(--duplicate-title-text)]')
        })
    })

    it('butonul principal are semantica distincta', () => {
        const source = readFileSync(join(process.cwd(), 'src/ui/components/EntityEditor.tsx'), 'utf8')

        expect(source).toContain('app-work-primary-button')
    })

    it('butonul Import este separat de Adauga', () => {
        const source = readFileSync(join(process.cwd(), 'src/ui/components/EntityEditor.tsx'), 'utf8')

        expect(source).toContain('app-import-backup-button')
        expect(source).toContain('ml-6')
    })

    it('QuickTitles folosesc clase tematice', () => {
        render(
            <EditModeProvider>
                <QuickTitlesBar
                    onApplyPrefix={vi.fn()}
                    focusEditor={vi.fn()}
                    activeQuickTitle="Breaking"
                />
            </EditModeProvider>,
        )

        expect(screen.getByText('BREAKING')).toHaveClass('truncate')
        expect(screen.getByText('BREAKING').closest('.app-quick-title')).toHaveClass('app-quick-title-active')
        expect(document.querySelector('.app-quick-titles input')).toHaveClass('app-input')
    })

    it('drag handle este vizibil doar in conditiile functionale existente', async () => {
        renderEntityList({ editMode: false })

        expect(screen.queryByRole('button', { name: 'Muta elementul' })).not.toBeInTheDocument()
        cleanup()

        renderEntityList({ editMode: true })

        expect(await screen.findAllByRole('button', { name: 'Muta elementul' })).toHaveLength(3)
    })
})
