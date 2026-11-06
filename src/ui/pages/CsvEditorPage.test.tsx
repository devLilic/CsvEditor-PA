import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvEditorPage } from './CsvEditorPage'

const mocks = vi.hoisted(() => ({
    csvState: { isLoaded: false },
    workingCopyError: null as string | null,
    retryInitialization: vi.fn(),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        activeProjectId: 'show-a',
        activeProject: { name: 'Știrile serii' },
        workspaces: { 'show-a': 'C:/work/show-a' },
        legacyWorkspaceMigration: false,
        isLoaded: true,
    }),
}))
vi.mock('@/features/csv-editor/context/CsvContext', () => ({
    useCsvContext: () => ({ state: mocks.csvState, workingCopyError: mocks.workingCopyError, retryInitialization: mocks.retryInitialization }),
}))
vi.mock('../components/layout/EditorHeader', () => ({ EditorHeader: () => <header /> }))
vi.mock('../components/layout/EditorBody', () => ({ EditorBody: () => <div data-testid="editor-body" /> }))

afterEach(() => {
    cleanup()
    mocks.csvState.isLoaded = false
    mocks.workingCopyError = null
    vi.clearAllMocks()
})

describe('CsvEditorPage project loading', () => {
    it('shows the centered loading status until CSV_LOADED marks the project ready', () => {
        const view = render(<CsvEditorPage />)
        expect(screen.getByRole('status', { name: 'Se încarcă emisiunea selectată' })).toBeInTheDocument()
        expect(screen.getByRole('status').querySelector('svg')).toHaveClass('animate-spin', 'motion-reduce:animate-none')
        expect(screen.getByRole('status').querySelector('svg')).toHaveClass('text-[var(--accent)]')
        expect(screen.queryByTestId('editor-body')).not.toBeInTheDocument()

        mocks.csvState.isLoaded = true
        view.rerender(<CsvEditorPage />)
        expect(screen.queryByRole('status', { name: 'Se încarcă emisiunea selectată' })).not.toBeInTheDocument()
        expect(screen.getByTestId('editor-body')).toBeInTheDocument()
    })

    it('shows a retryable error instead of leaving the loading overlay on failure', () => {
        mocks.workingCopyError = 'INVALID_SHOW_EDITION'
        render(<CsvEditorPage />)
        expect(screen.getByRole('alert')).toHaveTextContent('INVALID_SHOW_EDITION')
        expect(screen.queryByRole('status', { name: 'Se încarcă emisiunea selectată' })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Reîncearcă' }))
        expect(mocks.retryInitialization).toHaveBeenCalledOnce()
    })
})
