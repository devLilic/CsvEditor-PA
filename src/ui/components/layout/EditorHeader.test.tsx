import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EditorHeader } from './EditorHeader'
import { settingsService } from '@/features/csv-editor/services/settingsService'

const mocks = vi.hoisted(() => ({
    projects: [
        { id: 'show-a', name: 'Știrile serii', betaSectionButtonEnabled: true },
        { id: 'show-b', name: 'Sport', betaSectionButtonEnabled: true },
    ],
    flushWorkingCopy: vi.fn(async () => ({ ok: true })),
    activateProject: vi.fn(async () => ({ ok: true })),
    startNewProject: vi.fn(async () => ({ ok: true })),
    forceStartNewProjectWithoutBackup: vi.fn(async () => ({ ok: true })),
    setTitleFilter: vi.fn(),
}))

vi.mock('@/features/csv-editor', () => ({
    useEntities: () => ({
        startNewProject: mocks.startNewProject,
        forceStartNewProjectWithoutBackup: mocks.forceStartNewProjectWithoutBackup,
    }),
}))
vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        projects: mocks.projects,
        activeProjectId: 'show-a',
        workspaces: { 'show-a': 'C:/workspace/Știrile serii' },
        activateProject: mocks.activateProject,
        isLoaded: true,
        flushWorkingCopy: mocks.flushWorkingCopy,
    }),
}))
vi.mock('@/features/csv-editor/context/CsvContext', () => ({
    useCsvContext: () => ({ state: { isLoaded: true, entities: { sections: [] } }, dispatch: vi.fn() }),
}))
vi.mock('@/ui/context/TitleFilterContext', () => ({
    useTitleFilter: () => ({ titleFilter: '', setTitleFilter: mocks.setTitleFilter }),
}))
vi.mock('@/ui/components/SectionsTabs', () => ({
    SectionsTabs: ({ showAddBetaButton }: { showAddBetaButton?: boolean }) => (
        <div data-testid="sections-tabs">{showAddBetaButton ? 'Adaugă BETA' : null}</div>
    ),
}))
vi.mock('@/ui/components/EditModeToggle', () => ({ EditModeToggle: () => <button>Edit Mode</button> }))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.projects[0].betaSectionButtonEnabled = true
})

function renderHeader() {
    return render(<MemoryRouter><EditorHeader /></MemoryRouter>)
}

describe('EditorHeader', () => {
    it('shows a clean header with the optional show selector and a blue, icon-free new-edition button', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        renderHeader()
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Proiect de emisiune' })).toBeInTheDocument())
        expect(screen.getByRole('combobox', { name: 'Proiect de emisiune' })).toHaveValue('show-a')
        expect(screen.queryByText('Tales')).not.toBeInTheDocument()
        expect(screen.queryByText('Emisiune')).not.toBeInTheDocument()
        expect(screen.queryByText(/^Ediție:/)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Emisiuni' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Setări' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Ediții salvate' })).not.toBeInTheDocument()
        const newEdition = screen.getByRole('button', { name: 'Ediție nouă' })
        expect(newEdition).toBeEnabled()
        expect(newEdition).toHaveClass('bg-blue-600')
        expect(newEdition.querySelector('svg')).not.toBeInTheDocument()
        expect(screen.queryByText(/edit templates|exit templates/i)).not.toBeInTheDocument()
    })

    it('hides the show selector when the local application setting is disabled', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(false)
        renderHeader()
        await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Proiect de emisiune' })).not.toBeInTheDocument())
    })

    it('hides the add-beta button when the active show disables it', async () => {
        mocks.projects[0].betaSectionButtonEnabled = false
        renderHeader()
        await waitFor(() => expect(screen.queryByText('Adaugă BETA')).not.toBeInTheDocument())
    })

    it('confirms creating a new edition for the selected show', async () => {
        const user = userEvent.setup()
        renderHeader()
        await user.click(screen.getByRole('button', { name: 'Ediție nouă' }))
        expect(screen.getByRole('heading', { name: 'Începi o ediție nouă?' })).toBeInTheDocument()
    })

    it('flushes the current edition before switching shows', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        const user = userEvent.setup()
        renderHeader()
        await user.selectOptions(await screen.findByRole('combobox', { name: 'Proiect de emisiune' }), 'show-b')
        expect(mocks.flushWorkingCopy).toHaveBeenCalledOnce()
        expect(mocks.activateProject).toHaveBeenCalledWith('show-b')
    })

    it('keeps the loading indicator visible until project activation finishes', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        let finishFlush!: (value: { ok: boolean }) => void
        mocks.flushWorkingCopy.mockImplementationOnce(() => new Promise((resolve) => { finishFlush = resolve }))
        const user = userEvent.setup()
        renderHeader()
        await user.selectOptions(await screen.findByRole('combobox', { name: 'Proiect de emisiune' }), 'show-b')

        expect(screen.getByRole('status', { name: 'Se încarcă emisiunea selectată' })).toBeInTheDocument()
        finishFlush({ ok: true })
        await waitFor(() => expect(screen.queryByRole('status', { name: 'Se încarcă emisiunea selectată' })).not.toBeInTheDocument())
        expect(mocks.activateProject).toHaveBeenCalledWith('show-b')
    })

    it('clears the loading indicator and reports an activation failure', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        mocks.activateProject.mockResolvedValueOnce({ ok: false, error: 'ACTIVATION_FAILED' })
        const user = userEvent.setup()
        renderHeader()
        await user.selectOptions(await screen.findByRole('combobox', { name: 'Proiect de emisiune' }), 'show-b')

        expect(await screen.findByRole('alert')).toHaveTextContent('ACTIVATION_FAILED')
        expect(screen.queryByRole('status', { name: 'Se încarcă emisiunea selectată' })).not.toBeInTheDocument()
    })

    it('clears the loading indicator and reports a flush failure', async () => {
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        mocks.flushWorkingCopy.mockResolvedValueOnce({ ok: false, error: 'WORKSPACE_SAVE_FAILED' })
        const user = userEvent.setup()
        renderHeader()
        await user.selectOptions(await screen.findByRole('combobox', { name: 'Proiect de emisiune' }), 'show-b')

        expect(await screen.findByRole('alert')).toHaveTextContent('WORKSPACE_SAVE_FAILED')
        expect(screen.queryByRole('status', { name: 'Se încarcă emisiunea selectată' })).not.toBeInTheDocument()
        expect(mocks.activateProject).not.toHaveBeenCalled()
    })

    it('opens saved editions from the application menu event', async () => {
        const user = userEvent.setup()
        vi.spyOn(settingsService, 'getShowProjectSelectorEnabled').mockResolvedValue(true)
        renderHeader()
        window.dispatchEvent(new Event('tales:open-saved-editions'))
        expect(await screen.findByRole('dialog', { name: 'Ediții salvate' })).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Închide' }))
    })
})
