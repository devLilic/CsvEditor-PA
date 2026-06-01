import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EntityTypeTabsLeft } from './EntityTypeTabsLeft'

const csvHooks = vi.hoisted(() => ({
    activeEntityType: 'titles',
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
    }
})

beforeEach(() => {
    csvHooks.activeEntityType = 'titles'
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

        expect(screen.getByRole('button', { name: /Loca/ })).toBeInTheDocument()
    })

    it('renders Apeluri telefonice tab', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.getByRole('button', { name: 'Apeluri telefonice' })).toBeInTheDocument()
    })

    it('does not render legacy tabs', () => {
        render(<EntityTypeTabsLeft />)

        expect(screen.queryByRole('button', { name: /Ultima/ })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Titluri.*teptare/ })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Loca.*teptare/ })).not.toBeInTheDocument()
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

        await user.click(screen.getByRole('button', { name: 'Apeluri telefonice' }))

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
