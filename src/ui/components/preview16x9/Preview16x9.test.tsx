import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { Preview16x9 } from './Preview16x9'

let resizeCallbacks: ResizeObserverCallback[] = []

const template: BroadcastTemplate = {
    id: 'test-template',
    name: 'Test Template',
    canvas: {
        width: 1920,
        height: 1080,
        background: {
            type: 'color',
            value: '#000000',
        },
    },
    layers: [
        {
            id: 'logo-image',
            type: 'image',
            src: '/logo.png',
            x: 1500,
            y: 80,
            width: 240,
            height: 120,
            zIndex: 4,
            objectFit: 'contain',
        },
        {
            id: 'hidden-shape',
            type: 'shape',
            shapeType: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            zIndex: 3,
            visible: false,
            fill: { type: 'solid', value: '#ff0000' },
        },
        {
            id: 'title-text',
            type: 'text',
            fieldId: 'title',
            fallbackText: 'Fallback title',
            x: 160,
            y: 800,
            width: 1000,
            height: 80,
            zIndex: 2,
            textStyle: {
                fontFamily: 'Inter',
                fontSize: 56,
                fontWeight: 700,
                color: '#ffffff',
                align: 'left',
            },
        },
        {
            id: 'shape-bg',
            type: 'shape',
            shapeType: 'rect',
            x: 120,
            y: 780,
            width: 1100,
            height: 120,
            zIndex: 1,
            fill: { type: 'solid', value: '#333333' },
        },
    ],
}

function emitResize(width: number, height: number) {
    act(() => {
        for (const callback of resizeCallbacks) {
            callback([
                {
                    contentRect: { width, height },
                } as ResizeObserverEntry,
            ], {} as ResizeObserver)
        }
    })
}

beforeEach(() => {
    resizeCallbacks = []

    class ResizeObserverMock {
        constructor(callback: ResizeObserverCallback) {
            resizeCallbacks.push(callback)
        }
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

describe('Preview16x9', () => {
    it('renders without crashing with a minimal template', () => {
        const minimalTemplate: BroadcastTemplate = {
            id: 'minimal',
            name: 'Minimal',
            canvas: {
                width: 1920,
                height: 1080,
                background: { type: 'color', value: '#000000' },
            },
            layers: [],
        }

        render(<Preview16x9 template={minimalTemplate} />)

        expect(screen.getByTestId('preview16x9-root')).toBeInTheDocument()
    })

    it('renders background color', () => {
        const { container } = render(<Preview16x9 template={template} />)
        const background = container.querySelector('[data-preview-background="color"]')

        expect(background).toHaveStyle({ backgroundColor: '#000000' })
    })

    it('renders a text layer', () => {
        render(<Preview16x9 template={template} data={{ title: 'Rendered title' }} />)

        expect(screen.getByText('Rendered title')).toBeInTheDocument()
    })

    it('renders a shape layer', () => {
        const { container } = render(<Preview16x9 template={template} />)

        expect(container.querySelector('[data-layer-id="shape-bg"]')).toBeInTheDocument()
    })

    it('renders an image layer with a testable marker', () => {
        const { container } = render(<Preview16x9 template={template} />)

        const image = container.querySelector('[data-layer-id="logo-image"]')

        expect(image).toHaveAttribute('src', '/logo.png')
    })

    it('creates an internal design canvas with template dimensions', () => {
        const { container } = render(<Preview16x9 template={template} />)
        const canvas = container.querySelector('[data-design-canvas="true"]')

        expect(canvas).toHaveStyle({
            width: '1920px',
            height: '1080px',
            transformOrigin: 'top left',
        })
    })

    it('uses uniform contain scale and keeps the frame inside the container', async () => {
        const { container } = render(<Preview16x9 template={template} />)

        emitResize(960, 500)

        const frame = container.querySelector('[data-preview-frame="true"]')
        const canvas = container.querySelector('[data-design-canvas="true"]')

        await waitFor(() => {
            expect(frame).toHaveStyle({
                width: '888.8888888888889px',
                height: '500px',
            })
            expect(canvas).toHaveStyle({
                transform: 'scale(0.46296296296296297)',
            })
        })
    })

    it('uses width fit mode when requested', async () => {
        const { container } = render(<Preview16x9 template={template} fitMode="width" />)

        emitResize(960, 500)

        const frame = container.querySelector('[data-preview-frame="true"]')
        const canvas = container.querySelector('[data-design-canvas="true"]')

        await waitFor(() => {
            expect(frame).toHaveStyle({
                width: '960px',
                height: '540px',
            })
            expect(canvas).toHaveStyle({ transform: 'scale(0.5)' })
        })
    })

    it('respects maxHeight for contain mode', async () => {
        const { container } = render(<Preview16x9 template={template} maxHeight={300} />)

        emitResize(960, 500)

        const frame = container.querySelector('[data-preview-frame="true"]')

        await waitFor(() => {
            expect(frame).toHaveStyle({
                width: '533.3333333333334px',
                height: '300px',
            })
        })
    })

    it('renders visible layers sorted by zIndex and resolves text data', () => {
        const { container } = render(
            <Preview16x9 template={template} data={{ title: 'Live title' }} />
        )

        const layerIds = Array.from(container.querySelectorAll('[data-layer-id]'))
            .map((layer) => layer.getAttribute('data-layer-id'))

        expect(layerIds).toEqual(['shape-bg', 'title-text', 'logo-image'])
        expect(screen.getByText('Live title')).toBeInTheDocument()
        expect(container.querySelector('[data-layer-id="hidden-shape"]')).toBeNull()
    })

    it('uses sampleData when data is missing', () => {
        render(<Preview16x9 template={template} sampleData={{ title: 'Sample title' }} />)

        expect(screen.getByText('Sample title')).toBeInTheDocument()
    })

    it('uses fallbackText when data and sampleData are missing', () => {
        render(<Preview16x9 template={template} />)

        expect(screen.getAllByText('Fallback title')).toHaveLength(1)
    })
})
