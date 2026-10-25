import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { savedProjectsService } from '@/features/csv-editor/services/savedProjectsService'
import { SavedProjectsModal } from './SavedProjectsModal'

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
            currentProjectContent='{"version":1,"entities":{"sections":[]}}'
            onClose={vi.fn()}
            onProjectLoaded={vi.fn()}
            {...props}
        />,
    )
}

describe('SavedProjectsModal', () => {
    beforeEach(() => {
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

    it('calls saveCurrentAsProject when saving', async () => {
        const user = userEvent.setup()
        renderModal()

        await user.type(screen.getByLabelText(/Salvează proiectul curent ca/i), 'Nou')
        await user.click(screen.getByRole('button', { name: 'Salvează' }))

        await waitFor(() => {
            expect(savedProjectsService.saveCurrentAsProject).toHaveBeenCalledWith({
                filename: 'Nou',
                content: '{"version":1,"entities":{"sections":[]}}',
            })
        })
    })

    it('calls loadProjectIntoWorkingCsv when loading', async () => {
        const user = userEvent.setup()
        renderModal()

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă proiectul' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        await waitFor(() => {
            expect(savedProjectsService.loadProjectIntoWorkingCsv).toHaveBeenCalledWith({
                filename: 'Emisiunea_1.csv',
            })
        })
    })

    it('calls onProjectLoaded with content after successful load', async () => {
        const user = userEvent.setup()
        const onProjectLoaded = vi.fn()
        const onClose = vi.fn()
        renderModal({ onProjectLoaded, onClose })

        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getAllByRole('button', { name: 'Încarcă proiectul' })[0])
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
        await user.click(screen.getAllByRole('button', { name: 'Încarcă proiectul' })[0])

        expect(screen.getByText('Încarci acest proiect?')).toBeInTheDocument()
        expect(screen.getByText(/starea proiectului curent va fi salvată în backup/i)).toBeInTheDocument()

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
        await user.click(screen.getAllByRole('button', { name: 'Încarcă proiectul' })[0])
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Backupul proiectului curent nu a putut fi creat. Proiectul salvat nu a fost încărcat. Verifică folderul Backup din Setări.'
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

        expect(confirmSpy).toHaveBeenCalledWith('Ștergi proiectul salvat Emisiunea_1.csv?')
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
