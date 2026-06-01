import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BroadcastLayer } from '@/shared/preview/templateContract'
import { LayerRenderer } from './LayerRenderer'

const textLayer: BroadcastLayer = {
    id: 'text-1',
    type: 'text',
    fieldId: 'title',
    fallbackText: 'Fallback',
    x: 0,
    y: 0,
    width: 300,
    height: 50,
    zIndex: 1,
    textStyle: {
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: 700,
        color: '#ffffff',
        align: 'left',
    },
}

const imageLayer: BroadcastLayer = {
    id: 'image-1',
    type: 'image',
    src: '/logo.png',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 2,
}

const shapeLayer: BroadcastLayer = {
    id: 'shape-1',
    type: 'shape',
    shapeType: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 3,
    fill: {
        type: 'solid',
        value: '#ff0000',
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

describe('LayerRenderer', () => {
    it('renders text layers with TextLayerRenderer', () => {
        render(<LayerRenderer layer={textLayer} data={{ title: 'Live title' }} />)

        expect(screen.getByText('Live title')).toBeInTheDocument()
    })

    it('renders image layers with ImageLayerRenderer', () => {
        const { container } = render(<LayerRenderer layer={imageLayer} />)

        expect(container.querySelector('img')).toHaveAttribute('src', '/logo.png')
    })

    it('renders shape layers with ShapeLayerRenderer', () => {
        const { container } = render(<LayerRenderer layer={shapeLayer} />)

        expect(container.querySelector('[data-layer-id="shape-1"]')).toBeInTheDocument()
    })

    it('returns null for unknown layer types', () => {
        const unknownLayer = {
            id: 'unknown-1',
            type: 'unknown',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            zIndex: 4,
        } as unknown as BroadcastLayer

        const { container } = render(<LayerRenderer layer={unknownLayer} />)

        expect(container).toBeEmptyDOMElement()
    })
})
