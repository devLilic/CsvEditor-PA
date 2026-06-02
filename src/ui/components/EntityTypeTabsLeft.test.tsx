import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityTypeTabsLeft } from './EntityTypeTabsLeft'

const csvHooks = vi.hoisted(() => ({
    activeEntityType: 'titles',
    activeSection: { id: 'invited-1', kind: 'invited', rows: [] } as any,
    setActiveEntityType: vi.fn(),
    clearSelection: vi.fn(),
}))

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        useActiveEntityType: () => ({
            activeViewType: csvHooks.activeEntityType,
            setActiveViewType: csvHooks.setActiveEntityType,
            activeEntityType: csvHooks.activeEntityType,
            setActiveEntityType: csvHooks.setActiveEntityType,
        }),
        useSelectedEntity: () => ({
            clearSelection: csvHooks.clearSelection,
        }),
        useEntities: () => ({
            activeSection: csvHooks.activeSection,
        }),
    }
})

beforeEach(() => {
    csvHooks.activeEntityType = 'titles'
    csvHooks.activeSection = { id: 'invited-1', kind: 'invited', rows: [] }
    csvHooks.setActiveEntityType.mockClear()
    csvHooks.clearSelection.mockClear()
})

afterEach(() => {
    cleanup()
})

describe('EntityTypeTabsLeft', () => {
    it('renders Titluri tab', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Titluri' })).toBeInTheDocument()
    })

    it('renders Persoane tab', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Persoane' })).toBeInTheDocument()
    })

    it('renders Locatii tab', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Locații' })).toBeInTheDocument()
    })

    it('renders Phones tab', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Phones' })).toBeInTheDocument()
    })

    it('renders PA-only tabs for PLATOU', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getAllByRole('button')).toHaveLength(7)
        expect(screen.getByRole('button', { name: 'Ultima oră' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Titluri așteptare' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Locații așteptare' })).toBeInTheDocument()
    })

    it('renders only Titluri and Persoane tabs for BETA', () => {
        csvHooks.activeSection = { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] }
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Titluri' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Persoane' })).toBeInTheDocument()
        expect(screen.getAllByRole('button')).toHaveLength(2)
        expect(screen.queryByRole('button', { name: 'Locații' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Phones' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Ultima oră' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Titluri așteptare' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Locații așteptare' })).not.toBeInTheDocument()
    })

    it('clears selection and changes active type when switching tabs', async () => {
        const user = userEvent.setup()
        render(<EntityTypeTabsLeft />)

        await user.click(screen.getByRole('button', { name: 'Persoane' }))

        expect(csvHooks.clearSelection).toHaveBeenCalledTimes(1)
        expect(csvHooks.setActiveEntityType).toHaveBeenCalledWith('persons')
    })

    it('clears selection and changes active type when switching to phone calls', async () => {
        const user = userEvent.setup()
        render(<EntityTypeTabsLeft />)

        await user.click(screen.getByRole('button', { name: 'Phones' }))

        expect(csvHooks.clearSelection).toHaveBeenCalledTimes(1)
        expect(csvHooks.setActiveEntityType).toHaveBeenCalledWith('phoneCalls')
    })

    it('does not clear selection when clicking the already active tab', async () => {
        const user = userEvent.setup()
        render(<EntityTypeTabsLeft />)

        await user.click(screen.getByRole('button', { name: 'Titluri' }))

        expect(csvHooks.clearSelection).not.toHaveBeenCalled()
        expect(csvHooks.setActiveEntityType).not.toHaveBeenCalled()
    })
})
