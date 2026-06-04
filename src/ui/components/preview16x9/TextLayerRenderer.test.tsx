import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BroadcastTextLayer } from '@/shared/preview/templateContract'
import { TextLayerRenderer } from './TextLayerRenderer'

const baseLayer: BroadcastTextLayer = {
    id: 'text-1',
    type: 'text',
    fieldId: 'title',
    fallbackText: 'Fallback title',
    x: 150,
    y: 320,
    width: 900,
    height: 90,
    zIndex: 1,
    opacity: 0.9,
    rotation: 4,
    textStyle: {
        fontFamily: 'Inter',
        fontSize: 56,
        fontWeight: 700,
        color: '#ffffff',
        align: 'center',
    },
}

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
    vi.restoreAllMocks()
})

describe('TextLayerRenderer', () => {
    it('renders resolved text in the design box', () => {
        const { container } = render(
            <TextLayerRenderer layer={baseLayer} data={{ title: 'Live title' }} />
        )
        const textLayer = container.querySelector('[data-layer-id="text-1"]')

        expect(screen.getByText('Live title')).toBeInTheDocument()
        expect(textLayer).toHaveStyle({
            position: 'absolute',
            left: '150px',
            top: '320px',
            width: '900px',
            height: '90px',
            overflow: 'hidden',
        })
    })

    it('applies text style and transform', () => {
        const upperLayer: BroadcastTextLayer = {
            ...baseLayer,
            textStyle: {
                ...baseLayer.textStyle,
                transform: 'uppercase',
            },
        }

        const { container } = render(
            <TextLayerRenderer layer={upperLayer} data={{ title: 'Live title' }} />
        )
        const textLayer = container.querySelector('[data-layer-id="text-1"]')

        expect(screen.getByText('LIVE TITLE')).toBeInTheDocument()
        expect(textLayer).toHaveStyle({
            opacity: '0.9',
            transform: 'rotate(4deg)',
            color: '#ffffff',
            fontFamily: 'Inter',
            fontSize: '56px',
            fontWeight: '700',
            textAlign: 'center',
        })
    })

    it('renders an optional text layer border without changing layout dimensions', () => {
        const { container } = render(
            <TextLayerRenderer
                layer={{
                    ...baseLayer,
                    border: {
                        color: '#ff00ff',
                        width: 2,
                        style: 'dashed',
                    },
                }}
                data={{ title: 'Live title' }}
            />
        )
        const textLayer = container.querySelector('[data-layer-id="text-1"]')

        expect(textLayer).toHaveStyle({
            width: '900px',
            height: '90px',
            outline: '2px dashed #ff00ff',
            outlineOffset: '-2px',
        })
    })

    it('rotates the text layer from its configured origin point', () => {
        const { container } = render(
            <TextLayerRenderer
                layer={{ ...baseLayer, rotationOrigin: 'top left' }}
                data={{ title: 'Live title' }}
            />
        )

        expect(container.querySelector('[data-layer-id="text-1"]')).toHaveStyle({
            transformOrigin: 'top left',
        })
    })

    it('uses fallback text when data is missing', () => {
        render(<TextLayerRenderer layer={baseLayer} data={{}} />)

        expect(screen.getByText('Fallback title')).toBeInTheDocument()
    })

    it('keeps short text at scaleX=1', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(300)

        render(<TextLayerRenderer layer={baseLayer} data={{ title: 'Short' }} />)

        await waitFor(() => {
            expect(screen.getByText('Short')).toHaveStyle({
                left: '50%',
                transform: 'translateX(-50%) scaleX(1)',
                transformOrigin: 'center center',
            })
        })
    })

    it('shrinks long text on X when it does not fit', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1800)

        render(<TextLayerRenderer layer={baseLayer} data={{ title: 'Long title' }} />)

        await waitFor(() => {
            expect(screen.getByText('Long title')).toHaveStyle({
                left: '50%',
                transform: 'translateX(-50%) scaleX(0.4955555555555556)',
            })
        })
    })

    it('keeps fitted text on one line for scale measurement', () => {
        render(<TextLayerRenderer layer={baseLayer} data={{ title: 'Long title' }} />)

        expect(screen.getByText('Long title')).toHaveStyle({
            display: 'inline-block',
            maxWidth: 'none',
            whiteSpace: 'nowrap',
        })
    })

    it('wraps text naturally inside the box when fit in box is disabled', () => {
        render(
            <TextLayerRenderer
                layer={{ ...baseLayer, fitInBox: false }}
                data={{ title: 'Consilier politic cu responsabilitati internationale' }}
            />
        )

        expect(screen.getByText('Consilier politic cu responsabilitati internationale')).toHaveStyle({
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
        })
    })

    it('keeps a small safety gap after scaled text so the last glyph remains visible', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1000)

        render(
            <TextLayerRenderer
                layer={{ ...baseLayer, width: 500, minScaleX: 0.4 }}
                data={{ title: 'Long title' }}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Long title')).toHaveStyle({
                left: '50%',
                transform: 'translateX(-50%) scaleX(0.492)',
            })
        })
    })

    it('keeps shrinking below minScaleX for very long text', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(3000)

        render(
            <TextLayerRenderer
                layer={{ ...baseLayer, minScaleX: 0.8 }}
                data={{ title: 'Very long title' }}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Very long title')).toHaveStyle({
                left: '50%',
                transform: 'translateX(-50%) scaleX(0.29733333333333334)',
            })
        })
    })

    it('keeps center-aligned scaled text anchored to the middle of the design box', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1800)

        render(
            <TextLayerRenderer
                layer={{
                    ...baseLayer,
                    textStyle: { ...baseLayer.textStyle, align: 'center' },
                }}
                data={{ title: 'Centered text' }}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Centered text')).toHaveStyle({
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%) scaleX(0.4955555555555556)',
                transformOrigin: 'center center',
            })
        })
    })

    it('uses transform-origin based on align', async () => {
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1800)

        render(
            <TextLayerRenderer
                layer={{
                    ...baseLayer,
                    textStyle: { ...baseLayer.textStyle, align: 'right' },
                }}
                data={{ title: 'Right aligned' }}
            />
        )

        await waitFor(() => {
            expect(screen.getByText('Right aligned')).toHaveStyle({
                transformOrigin: 'right center',
            })
        })
    })
})
