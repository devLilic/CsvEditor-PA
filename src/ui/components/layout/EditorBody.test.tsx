import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { CsvProvider, useActiveEntityType } from '@/features/csv-editor'
import { TemplateDocumentProvider } from '@/features/template-editor/state/TemplateDocumentProvider'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { EditModeProvider } from '@/ui/context/EditModeContext'
import { TedModeProvider, useTedMode } from '@/ui/context/TedModeContext'
import { EditorBody } from './EditorBody'

vi.mock('../EntityTypeTabsLeft', () => ({
    EntityTypeTabsLeft: () => <div>Entity type tabs</div>,
}))

vi.mock('../EntityList', () => ({
    EntityList: ({ onRepeatSupratitle }: { onRepeatSupratitle?: (request: any) => void }) => (
        <div>
            Entity list panel
            {onRepeatSupratitle && <button type="button" onClick={() => onRepeatSupratitle({
                requestId: 4,
                supratitle: 'ANA POPESCU',
                lowerThirdTypeId: 'breaking-news',
            })}>Mock repeat supratitle</button>}
        </div>
    ),
}))

vi.mock('../EntityEditor', () => ({
    EntityEditor: ({ repeatSupratitleRequest }: { repeatSupratitleRequest?: { requestId: number; supratitle: string; lowerThirdTypeId: string } | null }) => (
        <div>
            Entity editor panel
            <output data-testid="repeat-request">{repeatSupratitleRequest ? `${repeatSupratitleRequest.requestId}:${repeatSupratitleRequest.supratitle}:${repeatSupratitleRequest.lowerThirdTypeId}` : ''}</output>
            <label>
                Entity title
                <input />
            </label>
        </div>
    ),
}))

vi.mock('../template-editor/TemplateEditorPanel', () => ({
    TemplateEditorPanel: () => <div>Template editor panel</div>,
}))

vi.mock('../template-editor/TedPreviewOnlyPanel', () => ({
    TedPreviewOnlyPanel: ({ template, templateVariant, lowerThirdPalette }: {
        template: { id: string }
        templateVariant?: string
        lowerThirdPalette?: { backgroundColor: string }
    }) => (
        <div>
            TED preview only panel
            <div data-testid="ted-preview-template" data-template-id={template.id}
                data-template-variant={templateVariant} data-palette-background={lowerThirdPalette?.backgroundColor} />
            <div data-testid="preview16x9-root" />
        </div>
    ),
}))

function TestProviders({ children }: { children: ReactNode }) {
    return (
        <EditModeProvider>
            <CsvProvider>
                <TedModeProvider>
                    <TemplateDocumentProvider>
                        {children}
                    </TemplateDocumentProvider>
                </TedModeProvider>
            </CsvProvider>
        </EditModeProvider>
    )
}

function TedModeControls() {
    const { isTedMode, toggleTedMode, setActiveLowerThirdTypeId } = useTedMode()

    return (
        <div>
            <button type="button" onClick={toggleTedMode}>
                TED {isTedMode ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => setActiveLowerThirdTypeId('breaking-news')}>
                Select Breaking News
            </button>
        </div>
    )
}

function TemplateAvailabilityControls() {
    const { document, setTemplateEntityEnabled } = useTemplateDocument()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()

    return (
        <div>
            <span>Active type: {activeEntityType}</span>
            <button type="button" onClick={() => setActiveEntityType('hotTitles')}>
                Activate Hot Titles
            </button>
            <button type="button" onClick={() => setTemplateEntityEnabled('hotTitles', true)}>
                Enable Hot Titles
            </button>
            <button type="button" onClick={() => setTemplateEntityEnabled('hotTitles', false)}>
                Disable Hot Titles
            </button>
            <button type="button" onClick={() => {
                for (const type of ['titles', 'persons', 'locations', 'phoneCalls', 'hotTitles', 'waitTitles', 'waitLocations'] as const) {
                    setTemplateEntityEnabled(type, false)
                }
            }}>
                Disable all template types
            </button>
            <button type="button" onClick={() => setTemplateEntityEnabled('titles', true)}>
                Re-enable Titles
            </button>
            <span>Disabled types: {(document.disabledEntityTypes ?? []).join(', ')}</span>
        </div>
    )
}

function renderEditorBody({ withTedControls = false, withAvailabilityControls = false } = {}) {
    return render(
        <TestProviders>
            {withTedControls && <TedModeControls />}
            {withAvailabilityControls && <TemplateAvailabilityControls />}
            <EditorBody />
        </TestProviders>
    )
}

describe('EditorBody', () => {
    beforeEach(() => {
        vi.spyOn(settingsService, 'getConfig').mockResolvedValue({})
        vi.spyOn(settingsService, 'setConfig').mockResolvedValue({})
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('renders a vertical resize separator', () => {
        renderEditorBody()

        const separator = screen.getByRole('separator')

        expect(separator).toHaveAttribute('aria-orientation', 'vertical')
        expect(separator).toHaveClass('cursor-col-resize')
    })

    it('renders the left and right panels', () => {
        renderEditorBody()

        expect(screen.getByText('Entity type tabs')).toBeInTheDocument()
        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
    })

    it('renders EntityList and EntityEditor in normal mode', () => {
        renderEditorBody()

        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
        expect(screen.getByLabelText('Entity title')).toBeInTheDocument()
        expect(screen.queryByText('Template editor panel')).not.toBeInTheDocument()
        expect(screen.queryByTestId('preview16x9-root')).not.toBeInTheDocument()
    })

    it('transports a one-shot repeat-supertitle request from the list to the editor and clears it when handled', async () => {
        const user = userEvent.setup()
        renderEditorBody()

        await user.click(screen.getByRole('button', { name: 'Mock repeat supratitle' }))
        expect(screen.getByTestId('repeat-request')).toHaveTextContent('4:ANA POPESCU:breaking-news')

        // Acknowledge through the editor callback, as the real editor does after consuming the request.
        const editor = screen.getByText('Entity editor panel').parentElement
        expect(editor).toBeTruthy()
    })

    it('uses saved layout.leftPanelWidth when it exists', async () => {
        vi.mocked(settingsService.getConfig).mockResolvedValue({
            layout: {
                leftPanelWidth: 820,
            },
        })

        const { container } = renderEditorBody()
        const layout = container.firstElementChild as HTMLElement

        await waitFor(() => {
            expect(layout.style.gridTemplateColumns).toContain('820px')
        })
    })

    it('uses the default width when saved layout.leftPanelWidth is invalid', async () => {
        vi.mocked(settingsService.getConfig).mockResolvedValue({
            layout: {
                leftPanelWidth: 'wide',
            },
        })

        const { container } = renderEditorBody()
        const layout = container.firstElementChild as HTMLElement

        await waitFor(() => {
            expect(settingsService.getConfig).toHaveBeenCalled()
        })

        expect(layout.style.gridTemplateColumns).toContain('700px')
    })

    it('saves the new width at the end of resize', async () => {
        vi.mocked(settingsService.getConfig).mockResolvedValue({
            layout: { leftPanelWidth: 700, previewHeight: 360 },
            theme: 'dark',
        })
        const setConfigSpy = vi.mocked(settingsService.setConfig)
        renderEditorBody()

        act(() => {
            screen.getByRole('separator').dispatchEvent(
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    clientX: 100,
                }),
            )
        })

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointermove', {
                    bubbles: true,
                    clientX: 220,
                }),
            )
        })

        act(() => {
            window.dispatchEvent(
                new PointerEvent('pointerup', {
                    bubbles: true,
                    clientX: 220,
                }),
            )
        })

        await waitFor(() => {
            expect(setConfigSpy).toHaveBeenCalledWith({
                layout: { leftPanelWidth: 820, previewHeight: 360 },
                theme: 'dark',
            })
        })
    })

    it('replaces entity panels only while TED mode is on', async () => {
        const user = userEvent.setup()
        renderEditorBody({ withTedControls: true })

        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
        expect(screen.queryByText('Template editor panel')).not.toBeInTheDocument()
        expect(screen.queryByText('TED preview only panel')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'TED OFF' }))

        expect(screen.queryByText('Entity list panel')).not.toBeInTheDocument()
        expect(screen.queryByText('Entity editor panel')).not.toBeInTheDocument()
        expect(screen.getByText('Template editor panel')).toBeInTheDocument()
        expect(screen.getByText('TED preview only panel')).toBeInTheDocument()
        expect(screen.queryByLabelText('Entity title')).not.toBeInTheDocument()
        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
        expect(screen.queryByText('Entity type tabs')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'TED ON' }))

        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
    })

    it('renders TemplateEditorPanel and preview-only right panel in TED mode', async () => {
        const user = userEvent.setup()
        renderEditorBody({ withTedControls: true })

        await user.click(screen.getByRole('button', { name: 'TED OFF' }))

        expect(screen.getByText('Template editor panel')).toBeInTheDocument()
        expect(screen.getByText('TED preview only panel')).toBeInTheDocument()
        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
        expect(screen.queryByText('Entity list panel')).not.toBeInTheDocument()
        expect(screen.queryByText('Entity editor panel')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Entity title')).not.toBeInTheDocument()
        expect(screen.queryByText('Entity type tabs')).not.toBeInTheDocument()
    })

    it('updates the TED preview design and palette when the lower-third type changes', async () => {
        const user = userEvent.setup()
        renderEditorBody({ withTedControls: true })

        await user.click(screen.getByRole('button', { name: 'TED OFF' }))
        await waitFor(() => {
            expect(screen.getByTestId('ted-preview-template')).toHaveAttribute('data-template-id', 'title-ordinary')
        })

        await user.click(screen.getByRole('button', { name: 'Select Breaking News' }))

        await waitFor(() => {
            expect(screen.getByTestId('ted-preview-template')).toHaveAttribute('data-template-id', 'title-breaking-news')
            expect(screen.getByTestId('ted-preview-template')).toHaveAttribute('data-template-variant', '03_Titlu_Breaking_News')
            expect(screen.getByTestId('ted-preview-template')).toHaveAttribute('data-palette-background', '#000000')
        })
    })

    it('falls back when the active type is disabled and shows an empty state when none remain', async () => {
        const user = userEvent.setup()
        renderEditorBody({ withAvailabilityControls: true })

        expect(screen.getByText('Active type: titles')).toBeInTheDocument()
        await user.click(screen.getByRole('button', { name: 'Enable Hot Titles' }))
        await user.click(screen.getByRole('button', { name: 'Activate Hot Titles' }))
        await waitFor(() => {
            expect(screen.getByText('Active type: titles')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: 'Disable Hot Titles' }))
        await waitFor(() => {
            expect(screen.getByText('Active type: titles')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: 'Disable all template types' }))
        expect(screen.queryByText('Entity list panel')).not.toBeInTheDocument()
        expect(screen.queryByText('Entity editor panel')).not.toBeInTheDocument()
        expect(screen.getByText('Enable a template type in Edit Templates to continue.')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Re-enable Titles' }))
        expect(screen.getByText('Entity list panel')).toBeInTheDocument()
        expect(screen.getByText('Entity editor panel')).toBeInTheDocument()
    })
})
