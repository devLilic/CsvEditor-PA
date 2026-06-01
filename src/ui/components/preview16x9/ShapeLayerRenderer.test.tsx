import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BroadcastShapeLayer } from '@/shared/preview/templateContract'
import { ShapeLayerRenderer } from './ShapeLayerRenderer'

const baseLayer: BroadcastShapeLayer = {
    id: 'shape-1',
    type: 'shape',
    shapeType: 'rect',
    x: 120,
    y: 240,
    width: 640,
    height: 90,
    zIndex: 1,
    opacity: 0.75,
    rotation: 12,
    fill: {
        type: 'solid',
        value: '#ff0000',
    },
    borderRadius: 8,
}

describe('ShapeLayerRenderer', () => {
    it('renders a rect shape in design coordinates', () => {
        const { container } = render(<ShapeLayerRenderer layer={baseLayer} />)
        const shape = container.querySelector('[data-layer-id="shape-1"]')

        expect(shape).toHaveStyle({
            position: 'absolute',
            left: '120px',
            top: '240px',
            width: '640px',
            height: '90px',
        })
    })

    it('applies opacity, rotation, fill, and borderRadius', () => {
        const { container } = render(<ShapeLayerRenderer layer={baseLayer} />)
        const shape = container.querySelector('[data-layer-id="shape-1"]')

        expect(shape).toHaveStyle({
            opacity: '0.75',
            transform: 'rotate(12deg)',
            transformOrigin: 'center center',
            backgroundColor: '#ff0000',
            borderRadius: '8px',
        })
    })

    it('rotates from the configured origin point', () => {
        const { container } = render(
            <ShapeLayerRenderer layer={{ ...baseLayer, rotationOrigin: 'bottom right' }} />
        )

        expect(container.querySelector('[data-layer-id="shape-1"]')).toHaveStyle({
            transformOrigin: 'bottom right',
        })
    })
})
