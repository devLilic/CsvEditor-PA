import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BroadcastImageLayer } from '@/shared/preview/templateContract'
import { ImageLayerRenderer } from './ImageLayerRenderer'
import { phoneImageService } from '@/features/csv-editor/services/phoneImageService'

vi.mock('@/features/csv-editor/services/phoneImageService', () => ({
    phoneImageService: {
        loadPhoneImageDataUrl: vi.fn(),
    },
}))

const baseLayer: BroadcastImageLayer = {
    id: 'image-1',
    type: 'image',
    src: '/logo.png',
    x: 100,
    y: 200,
    width: 320,
    height: 180,
    zIndex: 1,
}

describe('ImageLayerRenderer', () => {
    beforeEach(() => {
        vi.mocked(phoneImageService.loadPhoneImageDataUrl).mockResolvedValue({
            ok: false,
            error: 'not found',
        })
    })

    it('renders an image inside the design box with default contain objectFit', () => {
        const { container } = render(<ImageLayerRenderer layer={baseLayer} />)
        const image = container.querySelector('img')

        expect(image).toHaveAttribute('src', '/logo.png')
        expect(image).toHaveStyle({
            position: 'absolute',
            left: '100px',
            top: '200px',
            width: '320px',
            height: '180px',
            objectFit: 'contain',
            display: 'block',
        })
    })

    it('supports cover objectFit', () => {
        const { container } = render(
            <ImageLayerRenderer layer={{ ...baseLayer, objectFit: 'cover' }} />
        )

        expect(container.querySelector('img')).toHaveStyle({ objectFit: 'cover' })
    })

    it('supports fill objectFit', () => {
        const { container } = render(
            <ImageLayerRenderer layer={{ ...baseLayer, objectFit: 'fill' }} />
        )

        expect(container.querySelector('img')).toHaveStyle({ objectFit: 'fill' })
    })

    it('rotates from the configured origin point', () => {
        const { container } = render(
            <ImageLayerRenderer
                layer={{ ...baseLayer, rotation: 10, rotationOrigin: 'top right' }}
            />
        )

        expect(container.querySelector('img')).toHaveStyle({
            transform: 'rotate(10deg)',
            transformOrigin: 'top right',
        })
    })

    it('does not crash and renders a discrete placeholder when src is empty', () => {
        const { container } = render(
            <ImageLayerRenderer layer={{ ...baseLayer, src: '' }} />
        )

        const placeholder = container.querySelector('[data-empty-image-layer="true"]')

        expect(container.querySelector('img')).toBeNull()
        expect(placeholder).toHaveStyle({
            position: 'absolute',
            left: '100px',
            top: '200px',
            width: '320px',
            height: '180px',
        })
    })

    it('resolves WORK_PATH token using phone image data loader', async () => {
        vi.mocked(phoneImageService.loadPhoneImageDataUrl).mockResolvedValueOnce({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,abc123',
        })

        const { container } = render(
            <ImageLayerRenderer layer={{ ...baseLayer, src: 'WORK_PATH/ion.jpg' }} />
        )

        await waitFor(() => {
            expect(phoneImageService.loadPhoneImageDataUrl).toHaveBeenCalledWith({
                imageRef: 'WORK_PATH/ion.jpg',
            })
            expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,abc123')
        })
    })

    it('uses image value from preview data and resolves WORK_PATH', async () => {
        vi.mocked(phoneImageService.loadPhoneImageDataUrl).mockResolvedValueOnce({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,workpath',
        })

        const { container } = render(
            <ImageLayerRenderer
                layer={{ ...baseLayer, src: '{image}' }}
                data={{ image: 'WORK_PATH/ion.jpg' }}
            />
        )

        await waitFor(() => {
            expect(phoneImageService.loadPhoneImageDataUrl).toHaveBeenCalledWith({
                imageRef: 'WORK_PATH/ion.jpg',
            })
            expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,workpath')
        })
    })

    it('uses image filename from preview data and resolves it through the phone image data loader', async () => {
        vi.mocked(phoneImageService.loadPhoneImageDataUrl).mockResolvedValueOnce({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,andrei',
        })

        const { container } = render(
            <ImageLayerRenderer
                layer={{ ...baseLayer, src: '{image}' }}
                data={{ image: 'andrei_curararu.jpg' }}
            />
        )

        await waitFor(() => {
            expect(phoneImageService.loadPhoneImageDataUrl).toHaveBeenCalledWith({
                imageRef: 'andrei_curararu.jpg',
            })
            expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,andrei')
        })
    })

    it('renders placeholder when phone image data loader fails', async () => {
        vi.mocked(phoneImageService.loadPhoneImageDataUrl).mockResolvedValueOnce({
            ok: false,
            error: 'not found',
        })

        const { container } = render(
            <ImageLayerRenderer layer={{ ...baseLayer, src: 'WORK_PATH/ion.jpg' }} />
        )

        await waitFor(() => {
            expect(container.querySelector('[data-empty-image-layer="true"]')).toBeInTheDocument()
        })
        expect(container.querySelector('img')).toBeNull()
    })
})
