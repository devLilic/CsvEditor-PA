import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { TemplateEditorPanel } from './TemplateEditorPanel'

const templateDocumentState = vi.hoisted(() => ({
    isLoaded: true,
    isDirty: false,
    updateTemplate: vi.fn(),
    resetTemplateToDefault: vi.fn(),
    saveTemplates: vi.fn(),
    setActiveTedEntityType: vi.fn(),
    setTedSampleOverrides: vi.fn(),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        document: {
            templates: broadcastTemplates,
        },
        ...templateDocumentState,
    }),
}))

vi.mock('@/ui/context/TedModeContext', () => ({
    useTedMode: () => ({
        activeTedEntityType: 'titles',
        setActiveTedEntityType: templateDocumentState.setActiveTedEntityType,
        tedSampleOverrides: {},
        setTedSampleOverrides: templateDocumentState.setTedSampleOverrides,
    }),
}))

beforeEach(() => {
    templateDocumentState.isDirty = false
    templateDocumentState.updateTemplate.mockReset()
    templateDocumentState.updateTemplate.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.resetTemplateToDefault.mockReset()
    templateDocumentState.resetTemplateToDefault.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.saveTemplates.mockReset()
    templateDocumentState.saveTemplates.mockResolvedValue({ ok: true })
    templateDocumentState.setActiveTedEntityType.mockClear()
    templateDocumentState.setTedSampleOverrides.mockClear()
})

afterEach(() => {
    cleanup()
})

describe('TemplateEditorPanel', () => {
    it('does not render outside TED mode', () => {
        render(<TemplateEditorPanel isTedMode={false} />)

        expect(screen.queryByTestId('template-editor-panel')).not.toBeInTheDocument()
    })

    it('shows Save templates and Reset to default without a reset-all action', () => {
        render(<TemplateEditorPanel isTedMode />)

        expect(screen.getByRole('button', { name: 'Save templates' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Reset to default' })).toBeEnabled()
        expect(screen.queryByRole('button', { name: /reset all/i })).not.toBeInTheDocument()
    })

    it('shows entity tabs, sample inputs, and the layer accordion', () => {
        render(<TemplateEditorPanel isTedMode />)

        expect(screen.getByRole('tab', { name: 'Titles' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Persons' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Locations' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Phones' })).toBeInTheDocument()
        expect(screen.getByLabelText('title')).toBeInTheDocument()
        expect(screen.getByText('Background')).toBeInTheDocument()
        expect(screen.getByText('title-main-text (text)')).toBeInTheDocument()
    })

    it('sets dirty when a layer field changes', async () => {
        const user = userEvent.setup()
        const { rerender } = render(<TemplateEditorPanel isTedMode />)
        const summary = screen.getByText('title-main-text (text)')

        await user.click(summary)
        const details = summary.closest('details')
        expect(details).not.toBeNull()
        fireEvent.change(within(details as HTMLElement).getByLabelText('X'), {
            target: { value: '777' },
        })
        rerender(<TemplateEditorPanel isTedMode />)

        expect(templateDocumentState.updateTemplate).toHaveBeenCalledWith(
            'titles',
            expect.objectContaining({
                layers: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'title-main-text',
                        x: 777,
                    }),
                ]),
            }),
        )
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })

    it('does not set dirty when sample input changes', () => {
        const { rerender } = render(<TemplateEditorPanel isTedMode />)

        fireEvent.change(screen.getByLabelText('title'), {
            target: { value: 'Preview only title' },
        })
        rerender(<TemplateEditorPanel isTedMode />)

        expect(templateDocumentState.setTedSampleOverrides).toHaveBeenCalled()
        expect(templateDocumentState.updateTemplate).not.toHaveBeenCalled()
        expect(screen.getByText('Clean')).toBeInTheDocument()
    })

    it('resets only the active template, sets dirty, and does not save automatically', async () => {
        const user = userEvent.setup()
        const { rerender } = render(<TemplateEditorPanel isTedMode />)

        await user.click(screen.getByRole('button', { name: 'Reset to default' }))
        rerender(<TemplateEditorPanel isTedMode />)

        expect(templateDocumentState.resetTemplateToDefault).toHaveBeenCalledWith('titles')
        expect(templateDocumentState.saveTemplates).not.toHaveBeenCalled()
        expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })

    it('saves the template document when Save templates is clicked', async () => {
        templateDocumentState.isDirty = true
        const user = userEvent.setup()
        render(<TemplateEditorPanel isTedMode />)

        await user.click(screen.getByRole('button', { name: 'Save templates' }))

        expect(templateDocumentState.saveTemplates).toHaveBeenCalledOnce()
    })

    it('shows a warning when local save succeeds but dev default update fails', async () => {
        templateDocumentState.isDirty = true
        templateDocumentState.saveTemplates.mockResolvedValueOnce({
            ok: true,
            warning: 'Template-urile au fost salvate local, dar defaultTemplates.oc.json nu a putut fi actualizat.',
        })
        const user = userEvent.setup()
        render(<TemplateEditorPanel isTedMode />)

        await user.click(screen.getByRole('button', { name: 'Save templates' }))

        expect(await screen.findByText(
            'Template-urile au fost salvate local, dar defaultTemplates.oc.json nu a putut fi actualizat.'
        )).toBeInTheDocument()
    })
})
