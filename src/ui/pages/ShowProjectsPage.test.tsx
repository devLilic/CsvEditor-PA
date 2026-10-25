import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createTemplateDocumentFromTemplates } from '@/features/template-editor/domain/templateDocument'
import { resolveTemplateDocument } from '@/features/template-editor/domain/templateResolver'
import { broadcastTemplates } from '@/templates/broadcast'
import { createStandardShowProject, isShowProject } from '@/features/show-projects/domain/showProject'
import type { ShowProject } from '@/features/show-projects/domain/showProject'
import { ShowProjectsPage } from './ShowProjectsPage'

const mockApi = vi.hoisted(() => ({
    projects: [] as any[],
    activeProjectId: 'one',
    workspaces: {} as Record<string, string>,
    isLoaded: true,
    projectError: null as string | null,
    saveProject: vi.fn(),
    deleteProject: vi.fn(),
    importProject: vi.fn(),
    exportProject: vi.fn(),
    assignLegacyWorkspace: vi.fn(),
    registerAdminNavigationGuard: vi.fn(() => () => undefined),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({ prepareProjectForRuntime: (project: ShowProject) => project, useTemplateDocument: () => mockApi }))
vi.mock('@/ui/components/template-editor/TemplateLayerAccordion', () => ({ TemplateLayerAccordion: () => <div>Template layers</div> }))
vi.mock('@/ui/components/template-editor/TedSampleDataPanel', () => ({ TedSampleDataPanel: () => <div>Sample data</div> }))
vi.mock('@/ui/components/preview16x9/Preview16x9', () => ({ Preview16x9: () => <div>Preview</div> }))

function makeProject(id: string, name: string): ShowProject {
    const document = resolveTemplateDocument({ hardcodedDocument: createTemplateDocumentFromTemplates(broadcastTemplates) })
    return createStandardShowProject(id, name, document)
}

function renderPage() {
    return render(<MemoryRouter><ShowProjectsPage /></MemoryRouter>)
}

beforeEach(() => {
    mockApi.projects = [makeProject('one', 'Prima emisiune'), makeProject('two', 'A doua emisiune')]
    mockApi.activeProjectId = 'one'
    mockApi.workspaces = { one: '', two: '' }
    mockApi.saveProject.mockReset().mockImplementation(async (project: ShowProject, workspace: string) => {
        const index = mockApi.projects.findIndex((item) => item.id === project.id)
        if (index < 0) mockApi.projects = [...mockApi.projects, project]
        else mockApi.projects = mockApi.projects.map((item, itemIndex) => itemIndex === index ? project : item)
        mockApi.workspaces = { ...mockApi.workspaces, [project.id]: workspace }
        return { ok: true }
    })
    mockApi.deleteProject.mockReset().mockResolvedValue({ ok: true })
    mockApi.importProject.mockReset().mockResolvedValue({ ok: true, canceled: true })
    mockApi.exportProject.mockReset().mockResolvedValue({ ok: true })
    mockApi.assignLegacyWorkspace.mockReset().mockResolvedValue({ ok: true })
})

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Show project administration drafts', () => {
    it('saves a new standard draft without requiring another edit', async () => {
        const user = userEvent.setup()
        renderPage()

        await user.click(screen.getByRole('button', { name: 'Emisiune nouă' }))
        await user.clear(screen.getByRole('textbox', { name: 'Nume' }))
        await user.type(screen.getByRole('textbox', { name: 'Nume' }), 'Buletin nou')
        await user.click(screen.getByRole('button', { name: 'Creează draft' }))

        const saveButton = screen.getByRole('button', { name: 'Salvează emisiunea' })
        expect(saveButton).toBeEnabled()
        await user.click(saveButton)
        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Buletin nou' }), ''))
        expect(await screen.findByRole('status')).toHaveTextContent('Modificările emisiunii au fost salvate.')
    })

    it('saves a named full configuration duplicate without requiring another edit', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })

        await user.click(screen.getByRole('button', { name: 'Duplică' }))
        const name = screen.getByRole('textbox', { name: 'Nume' })
        await user.clear(name)
        await user.type(name, 'Prima — copie pentru test')
        await user.click(screen.getByRole('button', { name: 'Creează copie' }))

        const saveButton = screen.getByRole('button', { name: 'Salvează emisiunea' })
        expect(saveButton).toBeEnabled()
        await user.click(saveButton)
        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Prima — copie pentru test' }), ''))
    })

    it('removes a non-default lower-third type and saves a valid show configuration', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Tipuri lower third' }))
        await user.click(screen.getByRole('button', { name: /Breaking News/ }))
        await user.click(screen.getByRole('button', { name: 'Șterge tipul' }))
        await user.click(screen.getByRole('button', { name: 'Salvează emisiunea' }))

        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalled())
        const savedProject = mockApi.saveProject.mock.calls[0][0] as ShowProject
        expect(isShowProject(savedProject)).toBe(true)
        expect(savedProject.lowerThirdTypes.map((type) => type.id)).not.toContain('breaking-news')
    })

    it('saves the BETA button visibility as part of the selected show configuration', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Datele emisiunii' }))
        await user.click(screen.getByRole('checkbox', { name: 'Afișează butonul „Adaugă BETA” pentru această emisiune' }))
        await user.click(screen.getByRole('button', { name: 'Salvează emisiunea' }))

        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalledWith(expect.objectContaining({ betaSectionButtonEnabled: false }), ''))
        expect(isShowProject(mockApi.saveProject.mock.calls[0][0])).toBe(true)
    })

    it('keeps the base lower-third colors in templates and exposes palette colors for extra variants', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Tipuri lower third' }))

        expect(document.querySelectorAll('input[type="color"]')).toHaveLength(0)
        expect(screen.getByText(/Culorile variantei de bază se editează în șablonul din Elemente grafice/)).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Breaking News/ }))
        expect(document.querySelectorAll('input[type="color"]')).toHaveLength(3)
        expect(screen.getByText(/Culorile textului și fundalului se setează în paleta tipului lower third/)).toBeInTheDocument()
    })

    it('switches person name and occupation between an automatically joined line and separate lines', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Elemente grafice' }))
        await user.click(screen.getByRole('tab', { name: /^Persoane/ }))

        const displayMode = screen.getByRole('combobox', { name: 'Afișare nume și funcție' })
        expect(displayMode).toHaveValue('single-line')
        await user.selectOptions(displayMode, 'two-lines')
        expect(screen.getByText(/Numele și funcția apar pe straturi separate\./)).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Salvează emisiunea' }))

        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalledWith(expect.objectContaining({ personDisplayMode: 'two-lines' }), ''))
        const saved = mockApi.saveProject.mock.calls.at(-1)?.[0] as ShowProject
        for (const template of [saved.document.templates.persons, ...Object.values(saved.document.lowerThirdVariants.persons)]) {
            const name = template.layers.find((layer) => layer.type === 'text' && layer.fieldId === 'name')
            const occupation = template.layers.find((layer) => layer.type === 'text' && layer.fieldId === 'occupation')
            expect(name?.type === 'text' ? name.textParts : undefined).toBeUndefined()
            expect(occupation).toMatchObject({ visible: true })
        }
    })

    it('keeps the current project when the unsaved change prompt is canceled', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })

        await user.click(screen.getByRole('tab', { name: 'Datele emisiunii' }))
        const name = screen.getByRole('textbox', { name: 'Nume' })
        await user.clear(name)
        await user.type(name, 'Schimbare locală')
        await user.click(screen.getByRole('button', { name: /A doua emisiune/ }))
        expect(screen.getByRole('dialog')).toHaveTextContent('Modificări nesalvate')
        await user.click(screen.getByRole('button', { name: 'Anulează' }))

        expect(screen.getByRole('heading', { name: /Schimbare locală/ })).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'A doua emisiune' })).not.toBeInTheDocument()
    })

    it('discards the local edit when switching to another show', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Datele emisiunii' }))
        const name = screen.getByRole('textbox', { name: 'Nume' })
        await user.clear(name)
        await user.type(name, 'Schimbare temporară')
        await user.click(screen.getByRole('button', { name: /A doua emisiune/ }))
        await user.click(screen.getByRole('button', { name: 'Renunță la modificări' }))

        expect(await screen.findByRole('heading', { name: /A doua emisiune/ })).toBeInTheDocument()
        expect(mockApi.saveProject).not.toHaveBeenCalled()
    })

    it('saves the local edit before switching to another show', async () => {
        const user = userEvent.setup()
        renderPage()
        await screen.findByRole('heading', { name: /Prima emisiune/ })
        await user.click(screen.getByRole('tab', { name: 'Datele emisiunii' }))
        const name = screen.getByRole('textbox', { name: 'Nume' })
        await user.clear(name)
        await user.type(name, 'Prima actualizată')
        await user.click(screen.getByRole('button', { name: /A doua emisiune/ }))
        await user.click(screen.getByRole('button', { name: 'Salvează', exact: true }))

        await waitFor(() => expect(mockApi.saveProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Prima actualizată' }), ''))
        expect(await screen.findByRole('heading', { name: /A doua emisiune/ })).toBeInTheDocument()
    })
})
