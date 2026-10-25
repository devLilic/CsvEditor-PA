import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LegacyWorkspaceMigrationDialog } from './LegacyWorkspaceMigrationDialog'

const mocks = vi.hoisted(() => ({
    assignLegacyWorkspace: vi.fn(async () => ({ ok: true })),
    activateProject: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        projects: [{ id: 'show-a', name: 'Tales' }, { id: 'show-b', name: 'Sport' }],
        activeProjectId: 'show-a',
        legacyWorkspaceMigration: { projectFolderPath: 'C:/Tales' },
        assignLegacyWorkspace: mocks.assignLegacyWorkspace,
        activateProject: mocks.activateProject,
    }),
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('LegacyWorkspaceMigrationDialog', () => {
    it('preselects the active show and binds only after explicit confirmation', async () => {
        const user = userEvent.setup()
        render(<LegacyWorkspaceMigrationDialog />)
        const showPicker = screen.getByRole('combobox', { name: 'Emisiune' })
        expect(showPicker).toHaveValue('show-a')
        expect(mocks.assignLegacyWorkspace).not.toHaveBeenCalled()
        await user.click(screen.getByRole('button', { name: 'Asociază folderul' }))
        expect(mocks.assignLegacyWorkspace).toHaveBeenCalledWith('show-a')
        expect(mocks.activateProject).not.toHaveBeenCalled()
    })

    it('allows deferring without writing or assigning anything', async () => {
        const user = userEvent.setup()
        render(<LegacyWorkspaceMigrationDialog />)
        await user.click(screen.getByRole('button', { name: 'Mai târziu' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(mocks.assignLegacyWorkspace).not.toHaveBeenCalled()
        expect(mocks.activateProject).not.toHaveBeenCalled()
    })

    it('makes opening another show explicit when associating to a non-active show', async () => {
        const user = userEvent.setup()
        render(<LegacyWorkspaceMigrationDialog />)
        await user.selectOptions(screen.getByRole('combobox', { name: 'Emisiune' }), 'show-b')
        await user.click(screen.getByRole('button', { name: 'Asociază și deschide emisiunea' }))
        expect(mocks.assignLegacyWorkspace).toHaveBeenCalledWith('show-b')
        expect(mocks.activateProject).toHaveBeenCalledWith('show-b')
    })
})
