import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityList } from './EntityList'
import { EditModeProvider, useEditMode } from '@/ui/context/EditModeContext'
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import { DEFAULT_LOWER_THIRD_TYPE_ID, DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'

const csvHooks = vi.hoisted(() => ({
    activeSectionId: 'invited-1',
    activeSectionKind: 'invited' as 'invited' | 'beta',
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
            activeSection: { id: csvHooks.activeSectionId, kind: csvHooks.activeSectionKind, rows: [] },
            getBlockItems: csvHooks.getBlockItems,
            deleteEntity: csvHooks.deleteEntity,
            deletePlateauTitleDivider: csvHooks.deletePlateauTitleDivider,
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

beforeEach(() => {
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.activeSectionKind = 'invited'
    csvHooks.activeEntityType = 'titles'
    csvHooks.getBlockItems.mockReset()
    csvHooks.deleteEntity.mockClear()
    csvHooks.deletePlateauTitleDivider.mockReset()
    csvHooks.deletePlateauTitleDivider.mockResolvedValue({ ok: true })
    csvHooks.select.mockClear()
    csvHooks.isSelected.mockClear()
    csvHooks.isSelected.mockReturnValue(false)
    csvHooks.isOnAir.mockClear()
    csvHooks.isOnAir.mockReturnValue(false)
    csvHooks.setOnAir.mockClear()
    csvHooks.clearOnAir.mockClear()
})

afterEach(() => {
    cleanup()
})

function renderEntityList(props: ComponentProps<typeof EntityList> = {}) {
    return render(
        <EditModeProvider>
            <TitleFilterProvider>
                <EntityList {...props} />
            </TitleFilterProvider>
        </EditModeProvider>
    )
}

function EditModeToggle() {
    const { toggleEditMode } = useEditMode()

    return <button onClick={toggleEditMode}>toggle edit mode</button>
}

function renderEntityListWithEditModeToggle() {
    return render(
        <EditModeProvider>
            <TitleFilterProvider>
                <EditModeToggle />
                <EntityList />
            </TitleFilterProvider>
        </EditModeProvider>
    )
}

function personsAndPhoneCallsItems() {
    return [
        {
            entityType: 'persons',
            id: 'person-without-image',
            data: { name: 'ANA POPESCU', occupation: 'Reporter' },
        },
        {
            entityType: 'persons',
            id: 'person-with-image',
            data: {
                name: 'ION POPESCU',
                occupation: 'Expert',
                image: 'WORK_PATH/ion_popescu.jpg',
            },
        },
    ]
}

function personsItems() {
    return personsAndPhoneCallsItems().slice(0, 1)
}

function phoneCallsItems() {
    return personsAndPhoneCallsItems().slice(1)
}

describe('EntityList', () => {
    it('repeats a saved title supratitle without selecting or mutating its source row', async () => {
        const onRepeatSupratitle = vi.fn()
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: {
                title: 'QUOTE', supratitle: 'ANA POPESCU', lowerThirdTypeId: 'breaking-news',
            } },
        ])
        renderEntityList({ onRepeatSupratitle })

        await userEvent.click(await screen.findByRole('button', { name: 'Repetă supratitlu: ANA POPESCU' }))

        expect(onRepeatSupratitle).toHaveBeenCalledWith(expect.objectContaining({
            supratitle: 'ANA POPESCU',
            lowerThirdTypeId: 'breaking-news',
            requestId: expect.any(Number),
        }))
        expect(csvHooks.select).not.toHaveBeenCalled()
        expect(csvHooks.deleteEntity).not.toHaveBeenCalled()
        expect(screen.getByText('QUOTE')).toBeInTheDocument()
    })

    it('uses the ordinary type when the source title has an unknown graphic type', async () => {
        const onRepeatSupratitle = vi.fn()
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: {
                title: 'QUOTE', supratitle: 'ANA POPESCU', lowerThirdTypeId: 'removed-type',
            } },
        ])
        renderEntityList({ onRepeatSupratitle })

        await userEvent.click(await screen.findByRole('button', { name: 'Repetă supratitlu: ANA POPESCU' }))

        expect(onRepeatSupratitle).toHaveBeenCalledWith(expect.objectContaining({
            supratitle: 'ANA POPESCU',
            lowerThirdTypeId: DEFAULT_LOWER_THIRD_TYPE_ID,
        }))
    })

    it('offers the same repeat-supertitle action for titles in Beta', async () => {
        const onRepeatSupratitle = vi.fn()
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.activeSectionKind = 'beta'
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'beta-title-1', rowId: 'beta-row-1', data: {
                title: 'CITAT', supratitle: 'INVITAT BETA', lowerThirdTypeId: 'urgent',
            } },
        ])
        renderEntityList({ onRepeatSupratitle })

        await userEvent.click(await screen.findByRole('button', { name: 'Repetă supratitlu: INVITAT BETA' }))

        expect(onRepeatSupratitle).toHaveBeenCalledWith(expect.objectContaining({
            supratitle: 'INVITAT BETA',
            lowerThirdTypeId: 'urgent',
        }))
        expect(csvHooks.select).not.toHaveBeenCalled()
    })

    it('shows the assigned type color between title number and text and before a person name', async () => {
        const getTypesSpy = vi.spyOn(lowerThirdTypesService, 'get').mockResolvedValue(DEFAULT_LOWER_THIRD_TYPES)
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'URGENT', lowerThirdTypeId: 'urgent' } },
        ])

        const titleView = renderEntityList()
        const titleDot = await screen.findByLabelText('Ultima oră')
        expect(titleDot).toHaveStyle({ backgroundColor: '#F44336' })
        expect(titleDot.parentElement?.children[0]).toHaveTextContent('1.')
        expect(titleDot.closest('.app-list-row')).toHaveTextContent('URGENT')
        titleView.unmount()

        csvHooks.activeEntityType = 'persons'
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'person', entityType: 'persons', id: 'person-1', data: { name: 'ANA POPESCU', occupation: 'Reporter', lowerThirdTypeId: 'breaking-news' } },
        ])
        renderEntityList()
        const personDot = await screen.findByLabelText('Breaking News')
        expect(personDot).toHaveStyle({ backgroundColor: '#000000' })
        expect(personDot.parentElement).toHaveTextContent('ANA POPESCU')
        getTypesSpy.mockRestore()
    })

    it('renders titles', () => {
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'BREAKING NEWS' } },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'titles')
        expect(screen.getByText('BREAKING NEWS')).toBeInTheDocument()
        expect(screen.getByText('1.')).toBeInTheDocument()
    })

    it('renders a title supratitle above its title, with the number and type marker for the combined item', async () => {
        csvHooks.getBlockItems.mockReturnValue([
            {
                type: 'title',
                entityType: 'titles',
                id: 'title-1',
                rowId: 'row-title-1',
                data: { supratitle: 'ULTIMA ORĂ', title: 'TITLUL PRINCIPAL', lowerThirdTypeId: 'urgent' },
            },
        ])

        renderEntityList()

        const supratitle = await screen.findByText('ULTIMA ORĂ')
        const title = screen.getByText('TITLUL PRINCIPAL')
        const row = supratitle.closest('.app-list-row')
        const marker = await screen.findByLabelText('Ultima oră')

        expect(row).toContainElement(supratitle)
        expect(row).toContainElement(title)
        expect(row).toContainElement(marker)
        expect(supratitle.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(supratitle).toHaveClass('font-bold')
        expect(supratitle.parentElement).toHaveClass('flex-col')
        expect(marker.parentElement).toHaveClass('items-center')
        expect(marker.parentElement?.querySelector('.app-title-number')).toHaveTextContent('1.')
    })

    it('scrolls to the end when a new title is appended', async () => {
        const requestAnimationFrameSpy = vi
            .spyOn(window, 'requestAnimationFrame')
            .mockImplementation((callback) => {
                callback(0)
                return 0
            })
        let items = [
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
        ]
        csvHooks.getBlockItems.mockImplementation(() => items)

        const view = renderEntityList()
        const list = view.container.querySelector('.app-list') as HTMLDivElement
        Object.defineProperty(list, 'scrollHeight', {
            configurable: true,
            value: 640,
        })

        items = [
            ...items,
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'NEW TITLE' } },
        ]
        csvHooks.getBlockItems = vi.fn(() => items)

        view.rerender(
            <EditModeProvider>
                <TitleFilterProvider>
                    <EntityList />
                </TitleFilterProvider>
            </EditModeProvider>
        )

        await waitFor(() => {
            expect(list.scrollTop).toBe(640)
        })
        requestAnimationFrameSpy.mockRestore()
    })

    it('briefly marks a newly appended title row', async () => {
        vi.useFakeTimers()
        let items = [
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
        ]
        csvHooks.getBlockItems.mockImplementation(() => items)

        const view = renderEntityList()
        items = [
            ...items,
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'NEW TITLE' } },
        ]
        csvHooks.getBlockItems = vi.fn(() => items)

        view.rerender(
            <EditModeProvider>
                <TitleFilterProvider>
                    <EntityList />
                </TitleFilterProvider>
            </EditModeProvider>
        )

        const newTitleRow = screen.getByText('NEW TITLE').closest('.app-list-row')
        expect(newTitleRow).toHaveClass('app-list-row-blink')

        act(() => {
            vi.advanceTimersByTime(900)
        })
        expect(newTitleRow).not.toHaveClass('app-list-row-blink')
        vi.useRealTimers()
    })

    it('briefly marks an updated duplicate title without removing duplicate styling', () => {
        let items = [
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'DUPLICATE' } },
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'UNIQUE' } },
        ]
        csvHooks.getBlockItems.mockImplementation(() => items)

        const view = renderEntityList()
        items = [
            items[0],
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'DUPLICATE' } },
        ]
        csvHooks.getBlockItems = vi.fn(() => items)

        view.rerender(
            <EditModeProvider>
                <TitleFilterProvider>
                    <EntityList />
                </TitleFilterProvider>
            </EditModeProvider>
        )

        const updatedTitleRow = screen.getAllByText('DUPLICATE')[1].closest('.app-list-row')
        expect(updatedTitleRow).toHaveClass('app-list-row-blink')
        expect(updatedTitleRow?.className).toContain('bg-[var(--duplicate-title-bg)]')
    })

    it('renders title dividers in the exact mixed title-list position without numbering or title selection', async () => {
        const user = userEvent.setup()
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
            { type: 'divider', id: 'divider-1' },
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'SECOND TITLE' } },
        ])

        renderEntityList()

        const renderedItems = screen.getByText('FIRST TITLE').closest('.rounded')?.children
        expect(renderedItems?.[0]).toHaveTextContent('FIRST TITLE')
        expect(renderedItems?.[1]).toHaveAttribute('data-testid', 'plateau-title-divider')
        expect(renderedItems?.[2]).toHaveTextContent('SECOND TITLE')
        expect(screen.getByText('1.')).toBeInTheDocument()
        expect(screen.getByText('2.')).toBeInTheDocument()
        expect(screen.queryByText('3.')).not.toBeInTheDocument()

        await user.click(screen.getByTestId('plateau-title-divider'))

        expect(csvHooks.select).not.toHaveBeenCalled()
        expect(screen.queryByText('[ DIVIDER ]')).not.toBeInTheDocument()
    })

    it('deletes a title divider through the divider hook', async () => {
        const user = userEvent.setup()
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
            { type: 'divider', id: 'divider-1' },
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'SECOND TITLE' } },
        ])

        renderEntityList()
        await user.click(screen.getByRole('button', { name: 'Sterge separatorul' }))

        expect(csvHooks.deletePlateauTitleDivider).toHaveBeenCalledWith('divider-1')
        expect(csvHooks.deleteEntity).not.toHaveBeenCalled()
        expect(csvHooks.select).not.toHaveBeenCalled()
    })

    it('keeps a divider visible and shows an alert when divider deletion fails', async () => {
        const user = userEvent.setup()
        csvHooks.deletePlateauTitleDivider.mockResolvedValueOnce({ ok: false, error: 'WRITE_FAILED' })
        csvHooks.getBlockItems.mockReturnValue([
            { type: 'title', entityType: 'titles', id: 'title-1', rowId: 'row-title-1', data: { title: 'FIRST TITLE' } },
            { type: 'divider', id: 'divider-1' },
            { type: 'title', entityType: 'titles', id: 'title-2', rowId: 'row-title-2', data: { title: 'SECOND TITLE' } },
        ])

        renderEntityList()
        await user.click(screen.getByRole('button', { name: 'Sterge separatorul' }))

        expect(screen.getByTestId('plateau-title-divider')).toBeInTheDocument()
        expect(await screen.findByRole('alert')).toHaveTextContent('WRITE_FAILED')
    })

    it('persons view renders persons without image', () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.getBlockItems.mockReturnValue(personsItems())

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'persons')
        expect(screen.getByText('ANA POPESCU')).toBeInTheDocument()
        expect(screen.getByText('Reporter')).toBeInTheDocument()
    })

    it('persons view does not render persons with image', () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.getBlockItems.mockReturnValue(personsItems())

        renderEntityList()

        expect(screen.queryByText('ION POPESCU')).not.toBeInTheDocument()
        expect(screen.queryByText('Expert')).not.toBeInTheDocument()
    })

    it('renders locations', () => {
        csvHooks.activeEntityType = 'locations'
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'locations', id: 'location-1', data: { location: 'CHISINAU' } },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'locations')
        expect(screen.getByText('CHISINAU')).toBeInTheDocument()
    })

    it('phoneCalls view renders persons with image', () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(phoneCallsItems())

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'phoneCalls')
        expect(screen.getByText('ION POPESCU')).toBeInTheDocument()
        expect(screen.getByText('Expert')).toBeInTheDocument()
    })

    it('phoneCalls view does not render persons without image', () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(phoneCallsItems())

        renderEntityList()

        expect(screen.queryByText('ANA POPESCU')).not.toBeInTheDocument()
        expect(screen.queryByText('Reporter')).not.toBeInTheDocument()
    })

    it('phoneCalls item uses the real person id', async () => {
        const user = userEvent.setup()
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(phoneCallsItems())

        renderEntityList()
        await user.click(screen.getByText('ION POPESCU'))

        expect(csvHooks.select).toHaveBeenCalledWith({
            sectionId: 'invited-1',
            entityType: 'persons',
            id: 'person-with-image',
            viewType: 'phoneCalls',
        })
    })

    it('phoneCalls item is visually selected using the real person entity', () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(phoneCallsItems())
        csvHooks.isSelected.mockImplementation(
            (sectionId, entityType, id) =>
                sectionId === 'invited-1' &&
                entityType === 'persons' &&
                id === 'person-with-image'
        )

        renderEntityList()

        const selectedRow = screen.getByText('ION POPESCU').closest('.group')

        expect(csvHooks.isSelected).toHaveBeenCalledWith('invited-1', 'persons', 'person-with-image')
        expect(selectedRow).toHaveClass('bg-blue-100')
        expect(selectedRow).toHaveClass('border-l-blue-600')
    })

    it('deletes the real persons entity from phone calls view', async () => {
        const user = userEvent.setup()
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue([
            {
                entityType: 'persons',
                id: 'person-2',
                data: {
                    name: 'ION POPESCU',
                    occupation: 'Expert',
                    image: 'WORK_PATH/ion_popescu.jpg',
                },
            },
        ])

        renderEntityListWithEditModeToggle()
        await user.click(screen.getByRole('button', { name: 'toggle edit mode' }))
        await user.click(screen.getByRole('button', { name: 'Sterge' }))

        expect(csvHooks.deleteEntity).toHaveBeenCalledWith('invited-1', 'persons', 'person-2')
    })

    it('renders hot title lists provided by the PA hooks', () => {
        csvHooks.activeEntityType = 'hotTitles'
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'hotTitles', id: 'hot-1', data: { title: 'HOT' } },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'hotTitles')
        expect(screen.getByText('HOT')).toBeInTheDocument()
    })

    it.each([
        ['waitTitles', 'waitTitles', { title: 'TITLU ASTEPTARE' }],
        ['waitLocations', 'waitLocations', { location: 'LOCATIE ASTEPTARE' }],
    ] as const)('renders %s lists', (activeEntityType, entityType, data) => {
        csvHooks.activeEntityType = activeEntityType
        csvHooks.getBlockItems.mockReturnValue([
            { entityType, id: `${entityType}-1`, data },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', entityType)
        expect(screen.getByText(Object.values(data)[0])).toBeInTheDocument()
    })

    it('requests items only for the active section', () => {
        csvHooks.activeSectionId = 'beta-1'
        csvHooks.getBlockItems.mockReturnValue([])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('beta-1', 'titles')
        expect(csvHooks.getBlockItems).not.toHaveBeenCalledWith('invited-1', 'titles')
    })

    it('renders an empty state when the active list has no items', () => {
        csvHooks.getBlockItems.mockReturnValue([])

        renderEntityList()

        expect(screen.getByText('Nu exista elemente in aceasta sectiune.')).toBeInTheDocument()
    })

    it('deletes a PA entity using its active section and entity type', async () => {
        const user = userEvent.setup()
        csvHooks.activeSectionId = 'section-pa'
        csvHooks.activeEntityType = 'waitTitles'
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'waitTitles', id: 'wait-title-1', data: { title: 'ASTEPTARE' } },
        ])

        renderEntityListWithEditModeToggle()
        await user.click(screen.getByRole('button', { name: 'toggle edit mode' }))
        await user.click(screen.getByRole('button', { name: 'Sterge' }))

        expect(csvHooks.deleteEntity).toHaveBeenCalledWith('section-pa', 'waitTitles', 'wait-title-1')
    })

    it('hides ON AIR actions for PA entity items', () => {
        csvHooks.activeEntityType = 'hotTitles'
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'hotTitles', id: 'hot-1', data: { title: 'HOT' } },
        ])

        renderEntityList()

        expect(screen.queryByRole('button', { name: 'ON AIR' })).not.toBeInTheDocument()
        expect(csvHooks.setOnAir).not.toHaveBeenCalled()
    })
})
