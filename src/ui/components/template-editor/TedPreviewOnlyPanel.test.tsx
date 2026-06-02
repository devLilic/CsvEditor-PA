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

    it.each([
        ['hotTitles', broadcastTemplates.hotTitles, { title: 'SAMPLE HOT TITLE' }, 'hot-title-text'],
        ['waitTitles', broadcastTemplates.waitTitles, { title: 'SAMPLE WAIT TITLE' }, 'wait-title-text'],
        ['waitLocations', broadcastTemplates.waitLocations, { location: 'SAMPLE WAIT LOCATION' }, 'wait-location-text'],
    ])('renders the %s template with live TED sample text', (_entityType, template, sampleData, layerId) => {
        const sampleText = Object.values(sampleData)[0]
        const { container } = render(
            <TedPreviewOnlyPanel
                template={template}
                sampleData={sampleData}
            />
        )

        expect(screen.getByText(sampleText)).toBeInTheDocument()
        expect(container.querySelector(`[data-layer-id="${layerId}"]`)).toBeInTheDocument()
    })
})
