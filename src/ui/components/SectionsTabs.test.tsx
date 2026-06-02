import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SectionsTabs } from './SectionsTabs'

const csvHooks = vi.hoisted(() => ({
    sections: [{ id: 'invited-1', kind: 'invited', rows: [] }] as any[],
    activeSectionId: 'invited-1',
    setActiveSection: vi.fn(),
    addBetaSection: vi.fn(),
    renameBetaSection: vi.fn(),
    deleteBetaSection: vi.fn(),
    clearSelection: vi.fn(),
    setActiveEntityType: vi.fn(),
}))

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        useEntities: () => ({
            sections: csvHooks.sections,
            activeSectionId: csvHooks.activeSectionId,
            setActiveSection: csvHooks.setActiveSection,
            addBetaSection: csvHooks.addBetaSection,
            renameBetaSection: csvHooks.renameBetaSection,
            deleteBetaSection: csvHooks.deleteBetaSection,
        }),
        useSelectedEntity: () => ({
            clearSelection: csvHooks.clearSelection,
        }),
        useActiveEntityType: () => ({
            setActiveEntityType: csvHooks.setActiveEntityType,
        }),
    }
})

beforeEach(() => {
    csvHooks.sections = [{ id: 'invited-1', kind: 'invited', rows: [] }]
    csvHooks.activeSectionId = 'invited-1'
    csvHooks.setActiveSection.mockClear()
    csvHooks.addBetaSection.mockClear()
    csvHooks.renameBetaSection.mockClear()
    csvHooks.deleteBetaSection.mockClear()
    csvHooks.clearSelection.mockClear()
    csvHooks.setActiveEntityType.mockClear()
})

afterEach(() => {
    cleanup()
})

describe('SectionsTabs', () => {
    it('shows only PLATOU and ADAUGĂ BETA for a new project', () => {
        render(<SectionsTabs />)

        expect(screen.getByRole('button', { name: 'PLATOU' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'ADAUGĂ BETA' })).toBeInTheDocument()
    })

    it('creates a BETA section through the prompt', async () => {
        const user = userEvent.setup()
        render(<SectionsTabs />)

        await user.click(screen.getByRole('button', { name: 'ADAUGĂ BETA' }))
        await user.type(screen.getByPlaceholderText('Ex: Consiliu UE'), 'Externe{Enter}')

        expect(csvHooks.addBetaSection).toHaveBeenCalledWith('Externe')
    })

    it('opens the BETA prompt when clicking ADAUGĂ BETA', async () => {
        const user = userEvent.setup()
        render(<SectionsTabs />)

        await user.click(screen.getByRole('button', { name: 'ADAUGĂ BETA' }))

        expect(screen.getByPlaceholderText('Ex: Consiliu UE')).toBeInTheDocument()
    })

    it('shows an existing BETA section as a tab', () => {
        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]

        render(<SectionsTabs />)

        expect(screen.getByRole('button', { name: 'Externe' })).toBeInTheDocument()
    })

    it('shows BETA tabs and resets editor state when switching section', async () => {
        const user = userEvent.setup()
        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]
        render(<SectionsTabs />)

        await user.click(screen.getByRole('button', { name: 'Externe' }))

        expect(csvHooks.clearSelection).toHaveBeenCalled()
        expect(csvHooks.setActiveEntityType).toHaveBeenCalledWith('titles')
        expect(csvHooks.setActiveSection).toHaveBeenCalledWith('beta-1')
    })

    it('renames a BETA section', async () => {
        const user = userEvent.setup()
        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]
        const { rerender } = render(<SectionsTabs />)

        await user.click(screen.getByTitle('Rename'))
        const input = screen.getByDisplayValue('Externe')
        await user.clear(input)
        await user.type(input, 'Actualizat{Enter}')

        expect(csvHooks.renameBetaSection).toHaveBeenCalledWith('beta-1', 'Actualizat')

        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Actualizat', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]
        rerender(<SectionsTabs />)

        expect(screen.getByRole('button', { name: 'Actualizat' })).toBeInTheDocument()
    })

    it('asks for confirmation before deleting a BETA section', async () => {
        const user = userEvent.setup()
        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]
        render(<SectionsTabs />)

        await user.click(screen.getByTitle('Delete'))

        expect(screen.getByRole('button', { name: /Confirm/ })).toBeInTheDocument()
        expect(csvHooks.deleteBetaSection).not.toHaveBeenCalled()
    })

    it('deletes a BETA section with confirmation and resets editor state', async () => {
        const user = userEvent.setup()
        csvHooks.sections = [
            { id: 'beta-1', kind: 'beta', betaIndex: 1, betaTitle: 'Externe', rows: [] },
            { id: 'invited-1', kind: 'invited', rows: [] },
        ]
        render(<SectionsTabs />)

        await user.click(screen.getByTitle('Delete'))
        await user.click(screen.getByRole('button', { name: /Confirm/ }))

        expect(csvHooks.clearSelection).toHaveBeenCalled()
        expect(csvHooks.deleteBetaSection).toHaveBeenCalledWith('beta-1')
        expect(csvHooks.setActiveEntityType).toHaveBeenCalledWith('titles')
    })
})
