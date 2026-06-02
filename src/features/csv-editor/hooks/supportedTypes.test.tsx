import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CsvProvider, useActiveEntityType, useEntities, useSelectedEntity } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'

function ActiveEntityTypeHarness() {
    const { activeViewType, activeEntityType, setActiveViewType, setActiveEntityType } = useActiveEntityType()

    return (
        <div>
            <div data-testid="active-view">{activeViewType}</div>
            <div data-testid="active-type">{activeEntityType}</div>
            <button onClick={() => setActiveViewType('phoneCalls')}>phoneCalls</button>
            <button onClick={() => setActiveEntityType('persons')}>persons</button>
            <button onClick={() => setActiveEntityType('hotTitles' as any)}>hotTitles</button>
        </div>
    )
}

function SelectedEntityHarness() {
    const { selected, select, isSelected } = useSelectedEntity()
    const { activeViewType } = useActiveEntityType()

    return (
        <div>
            <div data-testid="selected-active-view">{activeViewType}</div>
            <div data-testid="selected-type">{selected?.entityType ?? 'none'}</div>
            <div data-testid="hot-selected">{String(isSelected('section-1', 'hotTitles', 'hot-1'))}</div>
            <button onClick={() => select('section-1', 'persons', 'person-1')}>select person</button>
            <button
                onClick={() =>
                    select({
                        sectionId: 'section-1',
                        entityType: 'persons',
                        id: 'phone-person-1',
                        viewType: 'phoneCalls',
                    })
                }
            >
                select phone call
            </button>
            <button onClick={() => select('section-1', 'hotTitles', 'hot-1')}>select hot</button>
        </div>
    )
}

function EntitiesHarness() {
    const { dispatch } = useCsvContext()
    const { getBlockItems, addEntity } = useEntities()

    const seed = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    {
                        id: 'section-1',
                        kind: 'invited',
                        rows: [
                            {
                                id: 'row-1',
                                title: { id: 'title-1', title: 'Title' },
                                person: { id: 'person-1', name: 'Name', occupation: 'Role' },
                                location: { id: 'location-1', location: 'Location' },
                                hotTitle: { id: 'hot-1', title: 'Hot' },
                                waitTitle: { id: 'wait-title-1', title: 'Wait' },
                                waitLocation: { id: 'wait-location-1', location: 'Wait location' },
                            },
                            {
                                id: 'row-2',
                                person: { id: 'phone-1', name: 'Phone', occupation: 'Guest', image: 'phone.jpg' },
                            },
                        ],
                    },
                    {
                        id: 'beta-1',
                        kind: 'beta',
                        betaIndex: 1,
                        betaTitle: 'Beta',
                        rows: [
                            {
                                id: 'beta-row-1',
                                title: { id: 'beta-title-1', title: 'Beta title' },
                                person: { id: 'beta-person-1', name: 'Beta person', occupation: 'Role' },
                                location: { id: 'beta-location-1', location: 'Hidden location' },
                                hotTitle: { id: 'beta-hot-1', title: 'Hidden hot' },
                                waitTitle: { id: 'beta-wait-title-1', title: 'Hidden wait' },
                                waitLocation: { id: 'beta-wait-location-1', location: 'Hidden wait location' },
                            },
                        ],
                    },
                ],
            },
        })
    }

    return (
        <div>
            <button onClick={seed}>seed</button>
            <button onClick={() => addEntity('section-1', 'hotTitles', { title: 'Hot add' })}>
                add hot
            </button>
            <div data-testid="titles-count">{getBlockItems('section-1', 'titles').length}</div>
            <div data-testid="persons-count">{getBlockItems('section-1', 'persons').length}</div>
            <div data-testid="phones-count">{getBlockItems('section-1', 'phoneCalls').length}</div>
            <div data-testid="locations-count">{getBlockItems('section-1', 'locations').length}</div>
            <div data-testid="hot-count">{getBlockItems('section-1', 'hotTitles').length}</div>
            <div data-testid="wait-titles-count">{getBlockItems('section-1', 'waitTitles').length}</div>
            <div data-testid="wait-locations-count">{getBlockItems('section-1', 'waitLocations').length}</div>
            <div data-testid="beta-locations-count">{getBlockItems('beta-1', 'locations').length}</div>
            <div data-testid="beta-hot-count">{getBlockItems('beta-1', 'hotTitles').length}</div>
            <div data-testid="beta-wait-titles-count">{getBlockItems('beta-1', 'waitTitles').length}</div>
            <div data-testid="beta-wait-locations-count">{getBlockItems('beta-1', 'waitLocations').length}</div>
        </div>
    )
}

function renderWithCsvProvider(ui: React.ReactNode) {
    return render(<CsvProvider>{ui}</CsvProvider>)
}

afterEach(() => {
    cleanup()
})

describe('csv editor hooks supported entity types', () => {
    it('allows PA entity types to become active through the hook', async () => {
        const user = userEvent.setup()
        renderWithCsvProvider(<ActiveEntityTypeHarness />)

        await user.click(screen.getByRole('button', { name: 'persons' }))
        expect(screen.getByTestId('active-view')).toHaveTextContent('persons')
        expect(screen.getByTestId('active-type')).toHaveTextContent('persons')

        await user.click(screen.getByRole('button', { name: 'hotTitles' }))
        expect(screen.getByTestId('active-view')).toHaveTextContent('hotTitles')
        expect(screen.getByTestId('active-type')).toHaveTextContent('hotTitles')
    })

    it('allows phoneCalls to be the active view without making it a selected entity type', async () => {
        const user = userEvent.setup()
        renderWithCsvProvider(<ActiveEntityTypeHarness />)

        await user.click(screen.getByRole('button', { name: 'phoneCalls' }))

        expect(screen.getByTestId('active-view')).toHaveTextContent('phoneCalls')
        expect(screen.getByTestId('active-type')).toHaveTextContent('phoneCalls')
    })

    it('allows PA entity selection through the hook', async () => {
        const user = userEvent.setup()
        renderWithCsvProvider(<SelectedEntityHarness />)

        await user.click(screen.getByRole('button', { name: 'select person' }))
        expect(screen.getByTestId('selected-type')).toHaveTextContent('persons')
        expect(screen.getByTestId('selected-active-view')).toHaveTextContent('titles')

        await user.click(screen.getByRole('button', { name: 'select hot' }))
        expect(screen.getByTestId('selected-type')).toHaveTextContent('hotTitles')
        expect(screen.getByTestId('hot-selected')).toHaveTextContent('true')
    })

    it('selects a phone call as the real persons entity while preserving phoneCalls view', async () => {
        const user = userEvent.setup()
        renderWithCsvProvider(<SelectedEntityHarness />)

        await user.click(screen.getByRole('button', { name: 'select phone call' }))

        expect(screen.getByTestId('selected-type')).toHaveTextContent('persons')
        expect(screen.getByTestId('selected-active-view')).toHaveTextContent('phoneCalls')
    })

    it('exposes all PA block items in PLATOU and hides PLATOU-only items in BETA', async () => {
        const user = userEvent.setup()
        renderWithCsvProvider(<EntitiesHarness />)

        await user.click(screen.getByRole('button', { name: 'seed' }))
        expect(screen.getByTestId('titles-count')).toHaveTextContent('1')
        expect(screen.getByTestId('persons-count')).toHaveTextContent('1')
        expect(screen.getByTestId('phones-count')).toHaveTextContent('1')
        expect(screen.getByTestId('locations-count')).toHaveTextContent('1')
        expect(screen.getByTestId('hot-count')).toHaveTextContent('1')
        expect(screen.getByTestId('wait-titles-count')).toHaveTextContent('1')
        expect(screen.getByTestId('wait-locations-count')).toHaveTextContent('1')
        expect(screen.getByTestId('beta-locations-count')).toHaveTextContent('0')
        expect(screen.getByTestId('beta-hot-count')).toHaveTextContent('0')
        expect(screen.getByTestId('beta-wait-titles-count')).toHaveTextContent('0')
        expect(screen.getByTestId('beta-wait-locations-count')).toHaveTextContent('0')

        await user.click(screen.getByRole('button', { name: 'add hot' }))
        expect(screen.getByTestId('hot-count')).toHaveTextContent('2')
    })
})
