import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PhoneImageEditor } from './PhoneImageEditor'
import { phoneImageService } from '@/features/csv-editor'
import type { PhoneImageSettings } from '@/features/csv-editor'

vi.mock('@/features/csv-editor', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/features/csv-editor')>()

    return {
        ...actual,
        phoneImageService: {
            saveFinalPhoneImage: vi.fn(),
        },
    }
})

const settings: PhoneImageSettings = {
    workPath: 'WORK_PATH',
    width: 420,
    height: 540,
}

let drawImageMock: ReturnType<typeof vi.fn>
let saveMock: ReturnType<typeof vi.fn>
let translateMock: ReturnType<typeof vi.fn>
let scaleMock: ReturnType<typeof vi.fn>
let restoreMock: ReturnType<typeof vi.fn>
class ImageMock {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 1000
    naturalHeight = 500

    set src(_value: string) {
        setTimeout(() => this.onload?.(), 0)
    }
}

function renderEditor(overrides: Partial<React.ComponentProps<typeof PhoneImageEditor>> = {}) {
    return render(
        <PhoneImageEditor
            settings={settings}
            suggestedFilename="Ion Popescu"
            onSaved={vi.fn()}
            onCancel={vi.fn()}
            onError={vi.fn()}
            {...overrides}
        />
    )
}

async function uploadImage() {
    const user = userEvent.setup()
    const file = new File(['fake-image'], 'poza.png', { type: 'image/png' })

    await user.upload(screen.getByLabelText(/Poz/), file)

    await waitFor(() => {
        expect(screen.getByAltText('Preview apel telefonic')).toBeInTheDocument()
    })

    return user
}

describe('PhoneImageEditor', () => {
    beforeEach(() => {
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockReset()
        vi.stubGlobal('Image', ImageMock)
        drawImageMock = vi.fn()
        saveMock = vi.fn()
        translateMock = vi.fn()
        scaleMock = vi.fn()
        restoreMock = vi.fn()

        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:phone-image'),
        })
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: vi.fn(),
        })
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            clearRect: vi.fn(),
            save: saveMock,
            translate: translateMock,
            scale: scaleMock,
            drawImage: drawImageMock,
            restore: restoreMock,
        })) as any
        HTMLCanvasElement.prototype.toDataURL = vi.fn(function (this: HTMLCanvasElement) {
            return 'data:image/jpeg;base64,abc123'
        })
    })

    afterEach(() => {
        cleanup()
        vi.unstubAllGlobals()
    })

    it('shows file input', () => {
        renderEditor()

        expect(screen.getByLabelText(/Poz/)).toHaveAttribute('type', 'file')
    })

    it('shows filename input', () => {
        renderEditor()

        expect(screen.getByLabelText('Filename final')).toBeInTheDocument()
    })

    it('allows editing filename before save', async () => {
        const user = userEvent.setup()
        renderEditor()
        const filenameInput = screen.getByLabelText('Filename final')

        await user.clear(filenameInput)
        await user.type(filenameInput, 'custom name')

        expect(filenameInput).toHaveValue('custom name')
    })

    it('shows zoom slider', () => {
        renderEditor()

        expect(screen.getByLabelText('Zoom')).toHaveAttribute('type', 'range')
    })

    it('shows horizontal flip control disabled until an image exists', async () => {
        renderEditor()

        expect(screen.getByRole('button', { name: 'Flip horizontal' })).toBeDisabled()

        await uploadImage()

        expect(screen.getByRole('button', { name: 'Flip horizontal' })).toBeEnabled()
    })

    it('uses cover scale as minimum zoom and relative maximum zoom after loading', async () => {
        renderEditor()

        await uploadImage()

        const zoomSlider = screen.getByLabelText('Zoom')
        expect(zoomSlider).toHaveAttribute('min', '1.08')
        expect(zoomSlider).toHaveAttribute('max', String(1.08 * 3))
    })

    it('shows the fixed crop frame area', () => {
        renderEditor()

        expect(screen.getByRole('region', { name: 'Zonă crop apel telefonic' })).toBeInTheDocument()
    })

    it('explains that the person must be framed inside the fixed frame', () => {
        renderEditor()

        expect(screen.getByText(/persoana să fie încadrată în chenar/i)).toBeInTheDocument()
    })

    it('keeps save disabled until an image exists', () => {
        renderEditor()

        expect(screen.getByRole('button', { name: /imaginea final/ })).toBeDisabled()
    })

    it('enables save after an image is loaded', async () => {
        renderEditor()

        await uploadImage()

        expect(screen.getByRole('button', { name: /imaginea final/ })).toBeEnabled()
    })

    it('calls onSaved when service returns ok', async () => {
        const onSaved = vi.fn()
        const onError = vi.fn()
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: true,
            imageCsvValue: 'C:\\Work\\ion_popescu.jpg',
            finalPath: 'C:\\Work\\ion_popescu.jpg',
        })
        renderEditor({ onSaved, onError })

        const user = await uploadImage()
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith('C:\\Work\\ion_popescu.jpg')
        })
        expect(onError).not.toHaveBeenCalled()
        expect(phoneImageService.saveFinalPhoneImage).toHaveBeenCalledWith({
            filename: 'ion_popescu.jpg',
            jpegBase64: 'abc123',
        })
    })

    it('exports a JPEG when saving a loaded image', async () => {
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: true,
            imageCsvValue: 'C:\\Work\\ion_popescu.jpg',
        })
        renderEditor()

        const user = await uploadImage()
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(phoneImageService.saveFinalPhoneImage).toHaveBeenCalledOnce()
        })

        expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92)
    })

    it('exports a horizontally flipped JPEG when flip is enabled', async () => {
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: true,
            imageCsvValue: 'C:\\Work\\ion_popescu.jpg',
        })
        renderEditor()

        const user = await uploadImage()
        await user.click(screen.getByRole('button', { name: 'Flip horizontal' }))
        expect(screen.getByRole('button', { name: 'Flip horizontal' })).toHaveAttribute('aria-pressed', 'true')

        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(phoneImageService.saveFinalPhoneImage).toHaveBeenCalledOnce()
        })

        expect(saveMock).toHaveBeenCalledOnce()
        expect(translateMock).toHaveBeenCalledWith(420, 0)
        expect(scaleMock).toHaveBeenCalledWith(-1, 1)
        expect(drawImageMock).toHaveBeenCalledOnce()
        expect(restoreMock).toHaveBeenCalledOnce()
    })

    it('uses uniform zoom when exporting', async () => {
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: true,
            imageCsvValue: 'C:\\Work\\ion_popescu.jpg',
        })
        renderEditor()

        const user = await uploadImage()
        fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: '2.16' } })
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(phoneImageService.saveFinalPhoneImage).toHaveBeenCalledOnce()
        })

        const [, , , sWidth, sHeight, dx, dy, dWidth, dHeight] = drawImageMock.mock.calls[0]
        expect(sWidth).toBeCloseTo(420 / 2.16)
        expect(sHeight).toBeCloseTo(540 / 2.16)
        expect([dx, dy, dWidth, dHeight]).toEqual([0, 0, 420, 540])
    })

    it('uses the dragged image position when exporting', async () => {
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: true,
            imageCsvValue: 'C:\\Work\\ion_popescu.jpg',
        })
        renderEditor()

        await uploadImage()

        const cropFrame = screen.getByRole('region', { name: 'Zonă crop apel telefonic' })
        const preview = screen.getByAltText('Preview apel telefonic')
        Object.defineProperty(cropFrame, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({
                width: 420,
                height: 540,
                left: 0,
                top: 0,
                right: 420,
                bottom: 540,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }),
        })
        preview.setPointerCapture = vi.fn()
        preview.releasePointerCapture = vi.fn()
        preview.hasPointerCapture = vi.fn(() => true)

        preview.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 1,
            clientX: 200,
            clientY: 200,
        }))
        preview.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 1,
            clientX: 80,
            clientY: 200,
        }))
        preview.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 1,
            clientX: 80,
            clientY: 200,
        }))

        const user = userEvent.setup()
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(phoneImageService.saveFinalPhoneImage).toHaveBeenCalledOnce()
        })

        expect(drawImageMock).toHaveBeenCalled()
        expect(drawImageMock.mock.calls[0][1]).toBeGreaterThan(330 / 1.08)
    })

    it('does not save when canvas export fails', async () => {
        const onError = vi.fn()
        HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any
        renderEditor({ onError })

        const user = await uploadImage()
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        expect(phoneImageService.saveFinalPhoneImage).not.toHaveBeenCalled()
        expect(onError).toHaveBeenCalledWith('Imaginea finală nu a putut fi generată.')
    })

    it('calls onError when service returns an error', async () => {
        const onSaved = vi.fn()
        const onError = vi.fn()
        vi.mocked(phoneImageService.saveFinalPhoneImage).mockResolvedValueOnce({
            ok: false,
            error: 'write failed',
        })
        renderEditor({ onSaved, onError })

        const user = await uploadImage()
        await user.click(screen.getByRole('button', { name: /imaginea final/ }))

        await waitFor(() => {
            expect(onError).toHaveBeenCalledWith('write failed')
        })
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('calls onCancel when cancel is clicked', async () => {
        const onCancel = vi.fn()
        const user = userEvent.setup()
        renderEditor({ onCancel })

        await user.click(screen.getByRole('button', { name: 'Anulează' }))

        expect(onCancel).toHaveBeenCalledOnce()
    })
})

