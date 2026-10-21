import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityList } from './EntityList'
import { EditModeProvider, useEditMode } from '@/ui/context/EditModeContext'
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'
import { TITLE_DIVIDER_MARKER } from '@/features/csv-editor'
import { reorderPlateauTitleItems } from '@/features/csv-editor/domain/reorderPlateauTitleItems'
import { settingsService } from '@/features/csv-editor/services/settingsService'

const dndHooks = vi.hoisted(() => ({
    onDragEnd: null as null | ((event: any) => void),
    sortableTransform: null as null | { x: number; y: number; scaleX: number; scaleY: number },
}))

vi.mock('@dnd-kit/core', async () => {
    const React = await import('react')

    return {
        DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: any) => void }) => {
            dndHooks.onDragEnd = onDragEnd
            return <div data-testid="dnd-context">{children}</div>
        },
        closestCenter: vi.fn(),
        KeyboardSensor: vi.fn(),
        PointerSensor: vi.fn(),
        useSensor: vi.fn((sensor) => sensor),
        useSensors: vi.fn((...sensors) => sensors),
    }
})

vi.mock('@dnd-kit/sortable', async () => {
    const React = await import('react')

    return {
        SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
        verticalListSortingStrategy: {},
        sortableKeyboardCoordinates: vi.fn(),
        useSortable: ({ id }: { id: string }) => ({
            attributes: { 'data-sortable-id': id },
            listeners: { onPointerDown: vi.fn() },
            setNodeRef: vi.fn(),
            transform: dndHooks.sortableTransform,
            transition: undefined,
            isDragging: false,
        }),
    }
})

vi.mock('@dnd-kit/utilities', () => ({
    CSS: {
        Transform: {
            toString: vi.fn((transform) => transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ''),
        },
    },
}))

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
    isOnAir: vi.fn(() => false),
    setOnAir: vi.fn(),
    clearOnAir: vi.fn(),
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
        useOnAir: () => ({
            isOnAir: csvHooks.isOnAir,
            setOnAir: csvHooks.setOnAir,
            clearOnAir: csvHooks.clearOnAir,
        }),
    }
})

function EditModeOn() {
    const { toggleEditMode } = useEditMode()

    return <button onClick={toggleEditMode}>toggle edit mode</button>
}

async function renderEntityList({ editMode = true } = {}) {
    const view = render(
        <EditModeProvider>
            <TitleFilterProvider>
                {editMode && <EditModeOn />}
                <EntityList />
            </TitleFilterProvider>
        </EditModeProvider>
    )

    if (editMode) {
        act(() => {
            screen.getByRole('button', { name: 'toggle edit mode' }).click()
        })
    }

    // The async settings lookup runs from EntityList's mount effect. Flush it
    // inside act so it cannot update React after an individual test finishes.
    await act(async () => {
        await Promise.resolve()
    })

    return view
}

function mixedPlateauItems() {
    return [
        { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
        { type: 'divider', id: 'divider-1' },
        { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'SECOND TITLE' } },
        { type: 'divider', id: 'divider-2' },
    ]
}

function compactPlateauItems() {
    return [
        { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'T1' } },
        { type: 'divider', id: 'divider-1' },
        { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'T2' } },
        { type: 'divider', id: 'divider-2' },
    ]
}

function getMockPlateauItemId(item: any): string {
    return item.type === 'divider' ? item.id : item.rowId
}

function toPlateauTitleListItem(item: any) {
    return item.type === 'divider'
        ? { type: 'divider' as const, id: item.id }
        : { type: 'title' as const, rowId: item.rowId }
}

beforeEach(() => {
    vi.mocked(settingsService.getConfig).mockReset()
    vi.mocked(settingsService.getConfig).mockResolvedValue({} as Awaited<ReturnType<typeof settingsService.getConfig>>)
    dndHooks.onDragEnd = null
    dndHooks.sortableTransform = null
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.activeSection = { id: 'invited-1', kind: 'invited', rows: [] }
    csvHooks.activeEntityType = 'titles'
    csvHooks.getBlockItems.mockReset()
    csvHooks.getBlockItems.mockReturnValue(mixedPlateauItems())
    csvHooks.deleteEntity.mockClear()
    csvHooks.deletePlateauTitleDivider.mockReset()
    csvHooks.deletePlateauTitleDivider.mockResolvedValue({ ok: true })
    csvHooks.reorderPlateauTitleItems.mockReset()
    csvHooks.reorderPlateauTitleItems.mockResolvedValue({ ok: true })
    csvHooks.select.mockClear()
    csvHooks.isSelected.mockClear()
    csvHooks.isSelected.mockReturnValue(false)
    csvHooks.isOnAir.mockClear()
    csvHooks.isOnAir.mockReturnValue(false)
    csvHooks.setOnAir.mockClear()
    csvHooks.clearOnAir.mockClear()
    vi.mocked(settingsService.getPlateauTitleDragDropEnabled).mockReset()
    vi.mocked(settingsService.getPlateauTitleDragDropEnabled).mockResolvedValue(true)
})

afterEach(() => {
    cleanup()
    document.getElementById('app-error-toast')?.remove()
})

describe('EntityList title drag-and-drop', () => {
    it('shows handles in PLATOU Titles with Edit Mode and setting enabled', async () => {
        await renderEntityList()

        expect(await screen.findAllByRole('button', { name: 'Muta elementul' })).toHaveLength(4)
    })

    it('keeps sortable movement on the vertical axis', async () => {
        dndHooks.sortableTransform = { x: 240, y: 18, scaleX: 1, scaleY: 1 }

        await renderEntityList()

        const handle = (await screen.findAllByRole('button', { name: 'Muta elementul' }))[0]
        const sortableRow = handle.closest('[style]')

        expect(sortableRow?.getAttribute('style')).toContain('translate3d(0px, 18px, 0)')
    })

    it('renders the title drag handle before the title number', async () => {
        await renderEntityList()

        const handle = (await screen.findAllByRole('button', { name: 'Muta elementul' }))[0]
        const number = screen.getByText('1.')

        expect(Boolean(handle.compareDocumentPosition(number) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    })

    it('renders the divider drag handle before the divider line', async () => {
        await renderEntityList()
        await screen.findAllByRole('button', { name: 'Muta elementul' })

        const divider = (await screen.findAllByTestId('plateau-title-divider'))[0]
        const handle = divider.querySelector('button[aria-label="Muta elementul"]')
        const line = divider.querySelector('[role="separator"]')

        expect(handle).not.toBeNull()
        expect(line).not.toBeNull()
        expect(Boolean(handle!.compareDocumentPosition(line!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    })

    it('hides handles in normal mode', async () => {
        await renderEntityList({ editMode: false })

        expect(screen.queryByRole('button', { name: 'Muta elementul' })).not.toBeInTheDocument()
    })

    it('hides handles when the setting is false', async () => {
        vi.mocked(settingsService.getPlateauTitleDragDropEnabled).mockResolvedValue(false)

        await renderEntityList()

        expect(screen.queryByRole('button', { name: 'Muta elementul' })).not.toBeInTheDocument()
    })

    it('hides handles in BETA', async () => {
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', rows: [] }
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'BETA TITLE' } },
        ])

        await renderEntityList()

        expect(screen.queryByRole('button', { name: 'Muta elementul' })).not.toBeInTheDocument()
    })

    it('renders the divider as a visual line', async () => {
        await renderEntityList()

        expect(screen.getAllByRole('separator')).toHaveLength(2)
    })

    it('does not render the CSV divider marker', async () => {
        await renderEntityList()

        expect(screen.queryByText(TITLE_DIVIDER_MARKER)).not.toBeInTheDocument()
    })

    it('shows an error for an invalid drop', async () => {
        await renderEntityList()
        await screen.findByTestId('dnd-context')

        await act(async () => {
            await dndHooks.onDragEnd?.({
                active: { id: 'divider-2' },
                over: { id: 'divider-1' },
            })
        })

        expect(await screen.findByRole('alert')).toHaveTextContent('Nu pot exista două separatoare consecutive.')
    })

    it('does not start persistence for an invalid drop', async () => {
        await renderEntityList()
        await screen.findByTestId('dnd-context')

        await act(async () => {
            await dndHooks.onDragEnd?.({
                active: { id: 'divider-2' },
                over: { id: 'divider-1' },
            })
        })

        expect(csvHooks.reorderPlateauTitleItems).not.toHaveBeenCalled()
    })

    it('combines the two dividers left after moving T2 before D1', async () => {
        let currentItems = compactPlateauItems()
        csvHooks.getBlockItems.mockImplementation(() => currentItems)
        csvHooks.reorderPlateauTitleItems.mockImplementation(async (activeId, overId) => {
            const result = reorderPlateauTitleItems(
                currentItems.map(toPlateauTitleListItem),
                activeId,
                overId
            )

            if (!result.ok) {
                return { ok: false, error: result.reason }
            }

            const currentItemsById = new Map(
                currentItems.map((item) => [getMockPlateauItemId(item), item])
            )
            currentItems = result.items.flatMap((item) => {
                const itemId = item.type === 'title' ? item.rowId : item.id
                const existingItem = currentItemsById.get(itemId)
                return existingItem ? [existingItem] : []
            })

            return { ok: true }
        })

        const view = await renderEntityList()
        expect(await screen.findAllByRole('separator')).toHaveLength(2)

        await act(async () => {
            await dndHooks.onDragEnd?.({
                active: { id: 'row-title-2' },
                over: { id: 'divider-1' },
            })
        })

        expect(csvHooks.reorderPlateauTitleItems).toHaveBeenCalledWith('row-title-2', 'divider-1')

        view.unmount()
        await renderEntityList({ editMode: false })

        expect(screen.getAllByRole('separator')).toHaveLength(1)
        expect(screen.getByText('T1')).toBeInTheDocument()
        expect(screen.getByText('T2')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
