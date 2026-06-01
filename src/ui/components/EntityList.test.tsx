import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityList } from './EntityList'
import { EditModeProvider, useEditMode } from '@/ui/context/EditModeContext'
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'

const csvHooks = vi.hoisted(() => ({
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
            activeSectionId: 'invited-1',
            activeSection: { id: 'invited-1', kind: 'invited', rows: [] },
            getBlockItems: csvHooks.getBlockItems,
            deleteEntity: csvHooks.deleteEntity,
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
    csvHooks.activeEntityType = 'titles'
    csvHooks.getBlockItems.mockReset()
    csvHooks.deleteEntity.mockClear()
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

function renderEntityList() {
    return render(
        <EditModeProvider>
            <TitleFilterProvider>
                <EntityList />
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

describe('EntityList', () => {
    it('renders titles', () => {
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'titles', id: 'title-1', data: { title: 'BREAKING NEWS' } },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'titles')
        expect(screen.getByText('BREAKING NEWS')).toBeInTheDocument()
        expect(screen.getByText('1.')).toBeInTheDocument()
    })

    it('persons view renders persons without image', () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'persons')
        expect(screen.getByText('ANA POPESCU')).toBeInTheDocument()
        expect(screen.getByText('Reporter')).toBeInTheDocument()
    })

    it('persons view does not render persons with image', () => {
        csvHooks.activeEntityType = 'persons'
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())

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
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())

        renderEntityList()

        expect(csvHooks.getBlockItems).toHaveBeenCalledWith('invited-1', 'persons')
        expect(screen.getByText('ION POPESCU')).toBeInTheDocument()
        expect(screen.getByText('Expert')).toBeInTheDocument()
    })

    it('phoneCalls view does not render persons without image', () => {
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())

        renderEntityList()

        expect(screen.queryByText('ANA POPESCU')).not.toBeInTheDocument()
        expect(screen.queryByText('Reporter')).not.toBeInTheDocument()
    })

    it('phoneCalls item uses the real person id', async () => {
        const user = userEvent.setup()
        csvHooks.activeEntityType = 'phoneCalls'
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())

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
        csvHooks.getBlockItems.mockReturnValue(personsAndPhoneCallsItems())
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

    it('does not request or render hot or wait entity lists', () => {
        csvHooks.activeEntityType = 'hotTitles'
        csvHooks.getBlockItems.mockReturnValue([
            { entityType: 'hotTitles', id: 'hot-1', data: { title: 'HOT' } },
        ])

        renderEntityList()

        expect(csvHooks.getBlockItems).not.toHaveBeenCalled()
        expect(screen.queryByText('HOT')).not.toBeInTheDocument()
        expect(screen.getByText('Nu exista elemente in aceasta sectiune.')).toBeInTheDocument()
    })
})
