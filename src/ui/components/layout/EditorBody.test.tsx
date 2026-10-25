import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorBody } from './EditorBody'
import { settingsService } from '@/features/csv-editor/services/settingsService'

const mockState = vi.hoisted(() => ({
    disabledEntityTypes: [] as string[],
    activeSection: { id: 'invited', kind: 'invited' },
    activeEntityType: 'titles',
    setActiveEntityType: vi.fn(),
    clearSelection: vi.fn(),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({ document: { disabledEntityTypes: mockState.disabledEntityTypes } }),
}))
vi.mock('@/features/csv-editor', () => ({
    useEntities: () => ({ activeSection: mockState.activeSection }),
    useActiveEntityType: () => ({ activeEntityType: mockState.activeEntityType, setActiveEntityType: mockState.setActiveEntityType }),
    useSelectedEntity: () => ({ clearSelection: mockState.clearSelection }),
}))
vi.mock('../EntityTypeTabsLeft', () => ({ EntityTypeTabsLeft: () => <div>Entity type tabs</div> }))
vi.mock('../EntityList', () => ({
    EntityList: ({ onRepeatSupratitle }: { onRepeatSupratitle?: (request: any) => void }) => (
        <div>Entity list panel<button type="button" onClick={() => onRepeatSupratitle?.({ requestId: 7, supratitle: 'ANA POPESCU', lowerThirdTypeId: 'breaking-news' })}>Mock repeat</button></div>
    ),
}))
vi.mock('../EntityEditor', () => ({
    EntityEditor: ({ repeatSupratitleRequest }: { repeatSupratitleRequest?: { requestId: number; supratitle: string; lowerThirdTypeId: string } | null }) => (
        <div>Entity editor panel<output data-testid="repeat-request">{repeatSupratitleRequest ? `${repeatSupratitleRequest.requestId}:${repeatSupratitleRequest.supratitle}:${repeatSupratitleRequest.lowerThirdTypeId}` : ''}</output></div>
    ),
}))

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    mockState.disabledEntityTypes = []
    mockState.activeSection = { id: 'invited', kind: 'invited' }
    mockState.activeEntityType = 'titles'
})

describe('EditorBody', () => {
    it('renders the regular editor panels and resize separator', () => {
        render(<EditorBody />)
        expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
        expect(screen.getByText('Entity type tabs')).toBeInTheDocument()
        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
        expect(screen.queryByText(/template editor/i)).not.toBeInTheDocument()
    })

    it('passes repeat-supertitle requests from the list into the editor', async () => {
        const user = userEvent.setup()
        render(<EditorBody />)
        await user.click(screen.getByRole('button', { name: 'Mock repeat' }))
        expect(screen.getByTestId('repeat-request')).toHaveTextContent('7:ANA POPESCU:breaking-news')
    })

    it('shows an empty state when the active show disables every available element', () => {
        mockState.disabledEntityTypes = ['titles', 'persons', 'locations', 'phoneCalls', 'waitTitles', 'waitLocations']
        render(<EditorBody />)
        expect(screen.queryByText('Entity list panel')).not.toBeInTheDocument()
        expect(screen.queryByText('Entity editor panel')).not.toBeInTheDocument()
        expect(screen.getByText(/Activează un element din Emisiuni/)).toBeInTheDocument()
    })

    it('loads and saves the application layout preference', async () => {
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({ layout: { leftPanelWidth: 820 } })
        vi.spyOn(settingsService, 'setConfig').mockResolvedValue({})
        const { container } = render(<EditorBody />)
        await waitFor(() => expect((container.firstElementChild as HTMLElement).style.gridTemplateColumns).toContain('820px'))
    })
})
