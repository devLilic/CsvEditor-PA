import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { TemplateDocumentProvider } from '@/features/template-editor/state/TemplateDocumentProvider'
import { EditModeProvider } from '@/ui/context/EditModeContext'
import { TedModeProvider, useTedMode } from '@/ui/context/TedModeContext'
import { EditorBody } from './EditorBody'

vi.mock('../EntityTypeTabsLeft', () => ({
    EntityTypeTabsLeft: () => <div>Entity type tabs</div>,
}))

vi.mock('../EntityList', () => ({
    EntityList: () => <div>Entity list panel</div>,
}))

vi.mock('../EntityEditor', () => ({
    EntityEditor: () => (
        <div>
            Entity editor panel
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
    TedPreviewOnlyPanel: () => (
        <div>
            TED preview only panel
            <div data-testid="preview16x9-root" />
        </div>
    ),
}))

function TestProviders({ children }: { children: ReactNode }) {
    return (
        <EditModeProvider>
            <TedModeProvider>
                <TemplateDocumentProvider>
                    {children}
                </TemplateDocumentProvider>
            </TedModeProvider>
        </EditModeProvider>
    )
}

function TedModeControls() {
    const { isTedMode, toggleTedMode } = useTedMode()

    return (
        <button type="button" onClick={toggleTedMode}>
            TED {isTedMode ? 'ON' : 'OFF'}
        </button>
    )
}

function renderEditorBody({ withTedControls = false } = {}) {
    return render(
        <TestProviders>
            {withTedControls && <TedModeControls />}
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
                layout: {
                    leftPanelWidth: 820,
                },
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
})
