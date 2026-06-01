import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { TedPreviewOnlyPanel } from './TedPreviewOnlyPanel'

beforeEach(() => {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
        writable: true,
        configurable: true,
        value: ResizeObserverMock,
    })
})

afterEach(() => {
    cleanup()
})

describe('TedPreviewOnlyPanel', () => {
    it('renders only the controlled Preview16x9 surface', () => {
        render(
            <TedPreviewOnlyPanel
                template={broadcastTemplates.titles}
                sampleData={{ title: 'TED SAMPLE' }}
            />
        )

        expect(screen.getByTestId('ted-preview-only-panel')).toHaveClass(
            'min-h-0',
            'min-w-0',
            'overflow-hidden',
        )
        expect(screen.getByTestId('preview16x9-root')).toHaveStyle({
            maxHeight: '700px',
        })
        expect(screen.getByText('TED SAMPLE')).toBeInTheDocument()
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('uses a modified template live', () => {
        const template = {
            ...broadcastTemplates.titles,
            layers: broadcastTemplates.titles.layers.map((layer) => (
                layer.id === 'title-main-text'
                    ? {
                        ...layer,
                        textStyle: {
                            ...layer.textStyle,
                            color: '#123456',
                        },
                    }
                    : layer
            )),
        }

        const { container } = render(
            <TedPreviewOnlyPanel
                template={template}
                sampleData={{ title: 'LIVE TEMPLATE' }}
            />
        )

        expect(screen.getByText('LIVE TEMPLATE')).toHaveStyle({
            color: '#123456',
        })
        expect(container.querySelector('[data-layer-id="title-main-text"]')).toBeInTheDocument()
    })
})
