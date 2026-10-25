import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { TemplateEditorPanel } from './TemplateEditorPanel'

const lowerThirdVariants = {
    titles: Object.fromEntries(DEFAULT_LOWER_THIRD_TYPES.map((type) => [type.id, broadcastTemplates.titles])),
    persons: Object.fromEntries(DEFAULT_LOWER_THIRD_TYPES.map((type) => [type.id, broadcastTemplates.persons])),
}

const templateDocumentState = vi.hoisted(() => ({
    isLoaded: true,
    isDirty: false,
    activeLowerThirdTypeId: 'ordinary',
    updateTemplate: vi.fn(),
    updateLowerThirdVariant: vi.fn(),
    setTemplateEntityEnabled: vi.fn(),
    resetTemplateToDefault: vi.fn(),
    resetLowerThirdVariantToDefault: vi.fn(),
    saveTemplates: vi.fn(),
    setActiveTedEntityType: vi.fn(),
    setActiveLowerThirdTypeId: vi.fn(),
    setTedSampleOverrides: vi.fn(),
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        document: {
            templates: broadcastTemplates,
            lowerThirdVariants,
        },
        ...templateDocumentState,
    }),
}))

vi.mock('@/ui/context/TedModeContext', () => ({
    useTedMode: () => ({
        activeTedEntityType: 'titles',
        setActiveTedEntityType: templateDocumentState.setActiveTedEntityType,
        activeLowerThirdTypeId: templateDocumentState.activeLowerThirdTypeId,
        setActiveLowerThirdTypeId: templateDocumentState.setActiveLowerThirdTypeId,
        tedSampleOverrides: {},
        setTedSampleOverrides: templateDocumentState.setTedSampleOverrides,
    }),
}))

beforeEach(() => {
    templateDocumentState.isDirty = false
    templateDocumentState.activeLowerThirdTypeId = 'ordinary'
    templateDocumentState.updateTemplate.mockReset()
    templateDocumentState.updateLowerThirdVariant.mockReset()
    templateDocumentState.setTemplateEntityEnabled.mockReset()
    templateDocumentState.updateTemplate.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.updateLowerThirdVariant.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.resetTemplateToDefault.mockReset()
    templateDocumentState.resetLowerThirdVariantToDefault.mockReset()
    templateDocumentState.resetTemplateToDefault.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.resetLowerThirdVariantToDefault.mockImplementation(() => {
        templateDocumentState.isDirty = true
    })
    templateDocumentState.saveTemplates.mockReset()
    templateDocumentState.saveTemplates.mockResolvedValue({ ok: true })
    templateDocumentState.setActiveTedEntityType.mockClear()
    templateDocumentState.setActiveLowerThirdTypeId.mockReset()
    templateDocumentState.setActiveLowerThirdTypeId.mockImplementation((typeId: string) => {
        templateDocumentState.activeLowerThirdTypeId = typeId
    })
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
        expect(screen.getByRole('tab', { name: 'Hot Titles' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Wait Titles' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Wait Locations' })).toBeInTheDocument()
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

        expect(templateDocumentState.updateLowerThirdVariant).toHaveBeenCalledWith(
            'titles',
            'ordinary',
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

    it('saves an image background to the selected non-ordinary variant', async () => {
        const { rerender } = render(<TemplateEditorPanel isTedMode />)
        fireEvent.change(screen.getByLabelText('Lower-third variant'), {
            target: { value: 'urgent' },
        })
        rerender(<TemplateEditorPanel isTedMode />)

        const image = new File(['png-data'], 'shared-background.png', { type: 'image/png' })
        fireEvent.change(screen.getByLabelText('Image path selector'), {
            target: { files: [image] },
        })

        await waitFor(() => {
            expect(templateDocumentState.updateLowerThirdVariant).toHaveBeenCalledWith(
                'titles',
                'urgent',
                expect.objectContaining({
                    canvas: expect.objectContaining({
                        background: expect.objectContaining({
                            type: 'image',
                            value: expect.stringMatching(/^data:image\/png;base64,/),
                        }),
                    }),
                }),
            )
        })
    })

    it('can hide and reactivate a template type from the main screen', async () => {
        const user = userEvent.setup()
        render(<TemplateEditorPanel isTedMode />)

        await user.click(screen.getByRole('checkbox', { name: 'Show phoneCalls in main screen' }))
        expect(templateDocumentState.setTemplateEntityEnabled).toHaveBeenCalledWith('phoneCalls', false)
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

        expect(templateDocumentState.resetLowerThirdVariantToDefault).toHaveBeenCalledWith('titles', 'ordinary')
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
            warning: 'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.',
        })
        const user = userEvent.setup()
        render(<TemplateEditorPanel isTedMode />)

        await user.click(screen.getByRole('button', { name: 'Save templates' }))

        expect(await screen.findByText(
            'Template-urile au fost salvate local, dar defaultTemplates.pa.json nu a putut fi actualizat.'
        )).toBeInTheDocument()
    })
})
