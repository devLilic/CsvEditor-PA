import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorHeader } from './EditorHeader'
import { useWorkingCsvInfo } from '@/features/csv-editor/hooks/useWorkingCsvInfo'

const {
    startNewProjectMock,
    forceStartNewProjectWithoutBackupMock,
    setTitleFilterMock,
    dispatchMock,
    listSavedProjectsMock,
    saveCurrentAsProjectMock,
    loadProjectIntoWorkingCsvMock,
    deleteSavedProjectMock,
    toggleTedModeMock,
    setTedModeMock,
    discardUnsavedChangesMock,
    saveTemplatesMock,
    headerModeState,
} = vi.hoisted(() => ({
    startNewProjectMock: vi.fn(),
    forceStartNewProjectWithoutBackupMock: vi.fn(),
    setTitleFilterMock: vi.fn(),
    dispatchMock: vi.fn(),
    listSavedProjectsMock: vi.fn(),
    saveCurrentAsProjectMock: vi.fn(),
    loadProjectIntoWorkingCsvMock: vi.fn(),
    deleteSavedProjectMock: vi.fn(),
    toggleTedModeMock: vi.fn(),
    setTedModeMock: vi.fn(),
    discardUnsavedChangesMock: vi.fn(),
    saveTemplatesMock: vi.fn(),
    headerModeState: {
        editMode: false,
        isTedMode: false,
        isTemplateDirty: false,
    },
}))

vi.mock('@/features/csv-editor', () => ({
    useEntities: () => ({
        startNewProject: startNewProjectMock,
        forceStartNewProjectWithoutBackup: forceStartNewProjectWithoutBackupMock,
    }),
}))

vi.mock('@/ui/context/TitleFilterContext', () => ({
    useTitleFilter: () => ({
        titleFilter: '',
        setTitleFilter: setTitleFilterMock,
    }),
}))

vi.mock('@/ui/components/SectionsTabs', () => ({
    SectionsTabs: () => <div data-testid="sections-tabs" />,
}))

vi.mock('@/ui/components/EditModeToggle', () => ({
    EditModeToggle: () => (
        <button disabled={headerModeState.isTedMode}>
            Edit Mode {headerModeState.editMode ? 'ON' : 'OFF'}
        </button>
    ),
}))

vi.mock('@/ui/context/EditModeContext', () => ({
    useEditMode: () => ({
        editMode: headerModeState.editMode,
    }),
}))

vi.mock('@/ui/context/TedModeContext', () => ({
    useTedMode: () => ({
        isTedMode: headerModeState.isTedMode,
        toggleTedMode: toggleTedModeMock,
        setTedMode: setTedModeMock,
    }),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        isDirty: headerModeState.isTemplateDirty,
        discardUnsavedChanges: discardUnsavedChangesMock,
        saveTemplates: saveTemplatesMock,
    }),
}))

vi.mock('@/features/csv-editor/context/CsvContext', () => ({
    useCsvContext: () => ({
        state: {
            entities: {
                sections: [
                    {
                        id: 'current-section',
                        kind: 'invited',
                        rows: [
                            {
                                id: 'current-row',
                                title: { id: 'current-title', title: 'CURRENT TITLE' },
                                person: { id: 'current-person', name: 'CURRENT NAME', occupation: 'CURRENT ROLE' },
                                location: { id: 'current-location', location: 'CURRENT LOCATION' },
                            },
                        ],
                    },
                ],
            },
        },
        dispatch: dispatchMock,
    }),
}))

vi.mock('@/features/csv-editor/services/savedProjectsService', () => ({
    savedProjectsService: {
        listSavedProjects: listSavedProjectsMock,
        saveCurrentAsProject: saveCurrentAsProjectMock,
        loadProjectIntoWorkingCsv: loadProjectIntoWorkingCsvMock,
        deleteSavedProject: deleteSavedProjectMock,
    },
}))

vi.mock('@/features/csv-editor/hooks/useWorkingCsvInfo', () => ({
    useWorkingCsvInfo: vi.fn(),
}))

describe('EditorHeader', () => {
    beforeEach(() => {
        startNewProjectMock.mockClear()
        forceStartNewProjectWithoutBackupMock.mockClear()
        setTitleFilterMock.mockClear()
        dispatchMock.mockClear()
        listSavedProjectsMock.mockClear()
        saveCurrentAsProjectMock.mockClear()
        loadProjectIntoWorkingCsvMock.mockClear()
        deleteSavedProjectMock.mockClear()
        toggleTedModeMock.mockClear()
        setTedModeMock.mockClear()
        discardUnsavedChangesMock.mockClear()
        saveTemplatesMock.mockReset()
        saveTemplatesMock.mockResolvedValue({ ok: true })
        headerModeState.editMode = false
        headerModeState.isTedMode = false
        headerModeState.isTemplateDirty = false
        startNewProjectMock.mockResolvedValue({ ok: true })
        forceStartNewProjectWithoutBackupMock.mockResolvedValue({ ok: true })
        listSavedProjectsMock.mockResolvedValue({
            ok: true,
            files: [
                {
                    filename: 'Emisiunea_1.csv',
                    fullPath: 'C:/saved/Emisiunea_1.csv',
                    mtimeMs: 2,
                },
            ],
        })
        saveCurrentAsProjectMock.mockResolvedValue({ ok: true, filename: 'Manual.csv', fullPath: 'C:/saved/Manual.csv' })
        loadProjectIntoWorkingCsvMock.mockResolvedValue({ ok: true, content: 'loaded,csv,content' })
        deleteSavedProjectMock.mockResolvedValue({ ok: true })
        vi.mocked(useWorkingCsvInfo).mockReturnValue({
            filename: 'emisie.csv',
            path: 'C:/work/emisie.csv',
            isConfigured: true,
        })
    })

    afterEach(() => {
        cleanup()
    })

    it('shows the Proiect nou button and no CSV picker in the header', () => {
        render(<EditorHeader />)

        expect(screen.queryByText('Punctul pe Azi')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Proiect nou/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Selecteaz/i })).not.toBeInTheDocument()
        expect(screen.queryByText('Sterge')).not.toBeInTheDocument()
        expect(screen.getByText('CSV: emisie.csv')).toBeInTheDocument()
    })

    it('shows an unset CSV badge when no working CSV is configured', () => {
        vi.mocked(useWorkingCsvInfo).mockReturnValueOnce({
            filename: 'nesetat',
            path: '',
            isConfigured: false,
        })

        render(<EditorHeader />)

        expect(screen.getByText('CSV: nesetat')).toBeInTheDocument()
    })

    it('keeps the CSV badge before Edit Mode and Proiect nou available', () => {
        render(<EditorHeader />)

        const badge = screen.getByText('CSV: emisie.csv')
        const editMode = screen.getByRole('button', { name: /Edit Mode/i })
        const newProject = screen.getByRole('button', { name: /Proiect nou/i })

        expect(badge.compareDocumentPosition(editMode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(editMode.compareDocumentPosition(newProject) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('does not show EDIT Templates while Edit Mode is off', () => {
        render(<EditorHeader />)

        expect(screen.queryByRole('button', { name: 'EDIT Templates' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Exit Templates' })).not.toBeInTheDocument()
    })

    it('shows EDIT Templates before the CSV badge while Edit Mode is on', () => {
        headerModeState.editMode = true
        render(<EditorHeader />)

        const templatesButton = screen.getByRole('button', { name: 'EDIT Templates' })
        const badge = screen.getByText('CSV: emisie.csv')

        expect(
            templatesButton.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
    })

    it('toggles TED mode from EDIT Templates', async () => {
        headerModeState.editMode = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'EDIT Templates' }))

        expect(setTedModeMock).toHaveBeenCalledWith(true)
    })

    it('shows Exit Templates while TED mode is on', () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        render(<EditorHeader />)

        expect(screen.getByRole('button', { name: 'Exit Templates' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'EDIT Templates' })).not.toBeInTheDocument()
    })

    it('disables the Edit Mode toggle while TED mode is on', () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        render(<EditorHeader />)

        expect(screen.getByRole('button', { name: 'Edit Mode ON' })).toBeDisabled()
    })

    it('enables the Edit Mode toggle after TED mode is off', () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = false
        render(<EditorHeader />)

        expect(screen.getByRole('button', { name: 'Edit Mode ON' })).toBeEnabled()
    })

    it('exits TED immediately when templates are clean', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))

        expect(setTedModeMock).toHaveBeenCalledWith(false)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('asks before leaving TED with unsaved template changes', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))

        expect(screen.getByRole('dialog')).toHaveTextContent('Ai modificări nesalvate în template.')
        expect(setTedModeMock).not.toHaveBeenCalled()
    })

    it('discards unsaved changes before leaving TED without saving', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))
        await user.click(screen.getByRole('button', { name: 'Ieși fără salvare' }))

        expect(discardUnsavedChangesMock).toHaveBeenCalledOnce()
        expect(setTedModeMock).toHaveBeenCalledWith(false)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('keeps TED open when the user cancels exiting with unsaved changes', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))
        await user.click(screen.getByRole('button', { name: 'Anulează' }))

        expect(setTedModeMock).not.toHaveBeenCalled()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('saves templates and leaves TED after a successful save', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))
        await user.click(screen.getByRole('button', { name: 'Salvează și ieși' }))

        expect(saveTemplatesMock).toHaveBeenCalledOnce()
        expect(setTedModeMock).toHaveBeenCalledWith(false)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('shows a warning after leaving TED when local save succeeds but dev default update fails', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        saveTemplatesMock.mockResolvedValueOnce({
            ok: true,
            warning: 'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.',
        })
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))
        await user.click(screen.getByRole('button', { name: 'Salvează și ieși' }))

        expect(screen.getByRole('status')).toHaveTextContent(
            'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.'
        )
        expect(setTedModeMock).toHaveBeenCalledWith(false)
    })

    it('keeps TED open and shows the error when saving templates fails', async () => {
        headerModeState.editMode = true
        headerModeState.isTedMode = true
        headerModeState.isTemplateDirty = true
        saveTemplatesMock.mockResolvedValueOnce({ ok: false, error: 'SAVE_FAILED' })
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Exit Templates' }))
        await user.click(screen.getByRole('button', { name: 'Salvează și ieși' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('SAVE_FAILED')
        expect(setTedModeMock).not.toHaveBeenCalled()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('uses the new confirmation dialog text', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))

        expect(screen.getByText('Incepi un proiect nou?')).toBeInTheDocument()
        expect(screen.getByText(/backup CSV in folderul setat in Setari/i)).toBeInTheDocument()
        expect(screen.getByText(/Doar dupa backup/i)).toBeInTheDocument()
        expect(screen.getByText(/fisierul de lucru va fi resetat/i)).toBeInTheDocument()
        expect(screen.getByText(/Daca backup-ul esueaza, resetarea nu se face/i)).toBeInTheDocument()
    })

    it('calls startNewProject after confirmation', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))
        await user.click(screen.getByRole('button', { name: /Confirm/i }))

        expect(startNewProjectMock).toHaveBeenCalledTimes(1)
    })

    it('does not show backup failed dialog when startNewProject succeeds', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))
        await user.click(screen.getByRole('button', { name: /Confirm/i }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(forceStartNewProjectWithoutBackupMock).not.toHaveBeenCalled()
    })

    it('opens backup failed dialog when starting a new project fails during backup', async () => {
        const user = userEvent.setup()
        startNewProjectMock.mockResolvedValueOnce({
            ok: false,
            reason: 'BACKUP_FAILED',
            error: 'No backup folder configured',
        })

        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))
        await user.click(screen.getByRole('button', { name: /Confirm/i }))

        expect(await screen.findByRole('dialog')).toHaveTextContent('Backup CSV nu a putut fi creat.')
        expect(screen.getByText(/Proiectul curent nu a fost resetat/)).toBeInTheDocument()
        expect(screen.getByText('No backup folder configured')).toBeInTheDocument()
        expect(forceStartNewProjectWithoutBackupMock).not.toHaveBeenCalled()
    })

    it('lets the user return from backup failed dialog without forcing reset', async () => {
        const user = userEvent.setup()
        startNewProjectMock.mockResolvedValueOnce({
            ok: false,
            reason: 'BACKUP_FAILED',
            error: 'No backup folder configured',
        })

        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))
        await user.click(screen.getByRole('button', { name: /Confirm/i }))
        await user.click(await screen.findByRole('button', { name: 'Revino' }))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(forceStartNewProjectWithoutBackupMock).not.toHaveBeenCalled()
    })

    it('continues without backup when the user confirms the backup failed dialog', async () => {
        const user = userEvent.setup()
        startNewProjectMock.mockResolvedValueOnce({
            ok: false,
            reason: 'BACKUP_FAILED',
            error: 'No backup folder configured',
        })

        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: /Proiect nou/i }))
        await user.click(screen.getByRole('button', { name: /Confirm/i }))
        await user.click(await screen.findByRole('button', { name: 'Continuă fără backup' }))

        expect(forceStartNewProjectWithoutBackupMock).toHaveBeenCalledTimes(1)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens saved projects modal from the header', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Proiecte salvate' }))

        expect(await screen.findByRole('dialog')).toHaveTextContent('Proiecte salvate')
        expect(listSavedProjectsMock).toHaveBeenCalledOnce()
    })

    it('shows the saved projects button', () => {
        render(<EditorHeader />)

        expect(screen.getByRole('button', { name: 'Proiecte salvate' })).toBeInTheDocument()
    })

    it('dispatches CSV_LOADED when a saved project is loaded', async () => {
        const user = userEvent.setup()
        loadProjectIntoWorkingCsvMock.mockResolvedValueOnce({
            ok: true,
            content: [
                'Nr;Titlu;Nume;Functie;Image;Locatie;Ultima Ora;Titlu Asteptare;Locatie Asteptare',
                ';--- beta 1 - Extern ---;;;;;;;',
                ';Titlu beta;;;;;;;;',
                ';--- INVITATI ---;;;;;;;',
                ';Titlu platou;;;;;;;;',
            ].join('\n'),
        })
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Proiecte salvate' }))
        await screen.findByText('Emisiunea_1.csv')
        await user.click(screen.getByRole('button', { name: 'Încarcă în CSV-ul de lucru' }))
        await user.click(screen.getByRole('button', { name: 'Încarcă' }))

        expect(loadProjectIntoWorkingCsvMock).toHaveBeenCalledWith({
            filename: 'Emisiunea_1.csv',
        })
        expect(dispatchMock).toHaveBeenCalledWith({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    expect.objectContaining({
                        kind: 'beta',
                        betaIndex: 1,
                        betaTitle: 'Extern',
                    }),
                    expect.objectContaining({
                        kind: 'invited',
                    }),
                ],
            },
        })
    })

    it('passes the current serialized CSV content to the modal save flow', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Proiecte salvate' }))
        await user.type(await screen.findByLabelText(/Salvează proiectul curent ca/i), 'Manual')
        await user.click(screen.getByRole('button', { name: 'Salvează' }))

        expect(saveCurrentAsProjectMock).toHaveBeenCalledWith({
            filename: 'Manual',
            content: expect.stringContaining('CURRENT TITLE'),
        })
    })

    it('does not show backup files in the saved projects modal', async () => {
        const user = userEvent.setup()
        render(<EditorHeader />)

        await user.click(screen.getByRole('button', { name: 'Proiecte salvate' }))

        expect(await screen.findByText('Emisiunea_1.csv')).toBeInTheDocument()
        expect(screen.queryByText(/backup/i)).not.toBeInTheDocument()
    })
})
