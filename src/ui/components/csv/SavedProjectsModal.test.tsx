import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { savedProjectsService } from '@/features/csv-editor/services/savedProjectsService'
import { SavedProjectsModal } from './SavedProjectsModal'

const showProvider = vi.hoisted(() => ({
    flushWorkingCopy: vi.fn(),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => showProvider,
}))

vi.mock('@/features/csv-editor/services/savedProjectsService', () => ({
    savedProjectsService: {
        listSavedProjects: vi.fn(),
        saveCurrentAsProject: vi.fn(),
        loadProjectIntoWorkingCsv: vi.fn(),
        deleteSavedProject: vi.fn(),
    },
}))

function renderModal(props?: Partial<Parameters<typeof SavedProjectsModal>[0]>) {
    return render(
        <SavedProjectsModal
            open
            onClose={vi.fn()}
            onProjectLoaded={vi.fn()}
            {...props}
        />,
    )
}

describe('SavedProjectsModal', () => {
    beforeEach(() => {
        showProvider.flushWorkingCopy.mockReset().mockResolvedValue({ ok: true })
        vi.mocked(savedProjectsService.listSavedProjects).mockResolvedValue({
            ok: true,
            files: [
                {
                    filename: 'Emisiunea_1.csv',
                    fullPath: 'C:/saved/Emisiunea_1.csv',
                    mtimeMs: 2,
                },
                {
                    filename: 'Emisiunea_2.csv',
                    fullPath: 'C:/saved/Emisiunea_2.csv',
                    mtimeMs: 1,
                },
            ],
        })
        vi.mocked(savedProjectsService.saveCurrentAsProject).mockResolvedValue({
            ok: true,
            filename: 'Nou.csv',
            fullPath: 'C:/saved/Nou.csv',
        })
        vi.mocked(savedProjectsService.loadProjectIntoWorkingCsv).mockResolvedValue({
            ok: true,
            content: 'loaded,csv',
        })
        vi.mocked(savedProjectsService.deleteSavedProject).mockResolvedValue({
            ok: true,
        })
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
        vi.clearAllMocks()
    })

    it('does not render when open is false', () => {
        renderModal({ open: false })

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('calls listSavedProjects when opened', async () => {
        renderModal()

        await waitFor(() => {
            expect(savedProjectsService.listSavedProjects).toHaveBeenCalledOnce()
        })
    })

    it('shows returned files', async () => {
        renderModal()

        expect(await screen.findByText('Emisiunea_1.csv')).toBeInTheDocument()
        expect(screen.getByText('Emisiunea_2.csv')).toBeInTheDocument()
    })

    it('keeps the saved editions dialog focused on saved editions', async () => {
        renderModal()

        expect(await screen.findByText('Emisiunea_1.csv')).toBeInTheDocument()
        expect(screen.queryByLabelText(/Salvează ediția curentă ca/i)).not.toBeInTheDocument()
        expect(savedProjectsService.saveCurrentAsProject).not.toHaveBeenCalled()
    })

    it('calls loadProjectIntoWorkingCsv when loading', async () => {
        const user = userEvent.setup()
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă ediția' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        await waitFor(() => {
            expect(showProvider.flushWorkingCopy).toHaveBeenCalledOnce()
            expect(savedProjectsService.loadProjectIntoWorkingCsv).toHaveBeenCalledWith({
                filename: 'Emisiunea_1.csv',
            })
        })
    })

    it('does not load an edition when flushing the active show fails', async () => {
        const user = userEvent.setup()
        showProvider.flushWorkingCopy.mockResolvedValueOnce({ ok: false, error: 'WORKSPACE_SAVE_FAILED' })
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă ediția' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('WORKSPACE_SAVE_FAILED')
        expect(savedProjectsService.loadProjectIntoWorkingCsv).not.toHaveBeenCalled()
    })

    it('calls onProjectLoaded with content after successful load', async () => {
        const user = userEvent.setup()
        const onProjectLoaded = vi.fn()
        const onClose = vi.fn()
        renderModal({ onProjectLoaded, onClose })

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă ediția' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        await waitFor(() => {
            expect(onProjectLoaded).toHaveBeenCalledWith('loaded,csv')
        })
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('does not load when the user cancels load confirmation', async () => {
        const user = userEvent.setup()
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă ediția' })[0])

        expect(screen.getByText('Încarci această ediție?')).toBeInTheDocument()
        expect(screen.getByText(/ediția curentă va fi salvată în Backup/i)).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Anulează' }))

        expect(savedProjectsService.loadProjectIntoWorkingCsv).not.toHaveBeenCalled()
    })

    it('shows a clear message and does not close when load backup fails', async () => {
        const user = userEvent.setup()
        const onProjectLoaded = vi.fn()
        const onClose = vi.fn()
        vi.mocked(savedProjectsService.loadProjectIntoWorkingCsv).mockResolvedValueOnce({
            ok: false,
            error: 'BACKUP_FAILED',
        })
        renderModal({ onProjectLoaded, onClose })

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă ediția' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Backupul ediției curente nu a putut fi creat. Ediția salvată nu a fost încărcată. Verifică folderul Backup din Setări.'
        )
        expect(onProjectLoaded).not.toHaveBeenCalled()
        expect(onClose).not.toHaveBeenCalled()
    })

    it('asks for confirmation before deleting', async () => {
        const user = userEvent.setup()
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Șterge' })[0])

        expect(confirmSpy).toHaveBeenCalledWith('Ștergi ediția salvată Emisiunea_1.csv?')
        expect(savedProjectsService.deleteSavedProject).not.toHaveBeenCalled()
    })

    it('calls deleteSavedProject after confirmation', async () => {
        const user = userEvent.setup()
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Șterge' })[0])

        await waitFor(() => {
            expect(savedProjectsService.deleteSavedProject).toHaveBeenCalledWith({
                filename: 'Emisiunea_1.csv',
            })
        })
    })

    it('shows a clear message when saved projects folder is missing', async () => {
        vi.mocked(savedProjectsService.listSavedProjects).mockResolvedValueOnce({
            ok: false,
            files: [],
            error: 'No saved projects folder configured',
        })

        renderModal()

        expect(await screen.findByRole('alert')).toHaveTextContent('No saved projects folder configured')
    })
})
