import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhoneImageSettings } from '@/features/csv-editor'
import { getPhoneImageDataUrl, listWorkPathImages } from '@/features/csv-editor/services/phoneImageService'
import { PhoneImageModal } from './PhoneImageModal'

vi.mock('@/features/csv-editor/services/phoneImageService', () => ({
    getPhoneImageDataUrl: vi.fn(),
    listWorkPathImages: vi.fn(),
}))

vi.mock('./PhoneImageEditor', () => ({
    PhoneImageEditor: ({ onSaved, onCancel, onError }: any) => (
        <div>
            <div>PhoneImageEditor mock</div>
            <button type="button" onClick={() => onSaved('C:\\Work\\ion.jpg')}>
                mock save
            </button>
            <button type="button" onClick={onCancel}>
                mock cancel
            </button>
            <button type="button" onClick={() => onError('save failed')}>
                mock error
            </button>
        </div>
    ),
}))

const settings: PhoneImageSettings = {
    workPath: 'C:\\Work',
    width: 420,
    height: 540,
}

describe('PhoneImageModal', () => {
    beforeEach(() => {
        vi.mocked(listWorkPathImages).mockResolvedValue({
            ok: true,
            files: [],
        })
        vi.mocked(getPhoneImageDataUrl).mockResolvedValue({
            ok: true,
            dataUrl: 'data:image/jpeg;base64,preview',
        })
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('returns null when closed', () => {
        const { container } = render(
            <PhoneImageModal
                open={false}
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(container).toBeEmptyDOMElement()
    })

    it('renders overlay and separated action tabs when open', () => {
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(screen.getByRole('dialog', { name: 'Adaugă poză apel telefonic' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Poze existente' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Încarcă poză nouă' })).toBeInTheDocument()
        expect(screen.queryByText('PhoneImageEditor mock')).not.toBeInTheDocument()
    })

    it('shows the crop editor when switching to upload new photo tab', async () => {
        const user = userEvent.setup()
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Încarcă poză nouă' }))

        expect(screen.getByText('PhoneImageEditor mock')).toBeInTheDocument()
    })

    it('loads existing WORK_PATH images when opened', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'ion.jpg',
                    imageCsvValue: 'C:\\Work\\ion.jpg',
                    finalPath: 'C:\\Work\\ion.jpg',
                },
            ],
        })

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(listWorkPathImages).toHaveBeenCalledOnce()
        expect(await screen.findByText('ion.jpg')).toBeInTheDocument()
        expect(screen.getByText('Poze Existente')).toBeInTheDocument()
        expect(getPhoneImageDataUrl).not.toHaveBeenCalled()
    })

    it('filters existing images only after at least three search letters', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'cristian_iardan.jpg',
                    imageCsvValue: 'C:\\Work\\cristian_iardan.jpg',
                    finalPath: 'C:\\Work\\cristian_iardan.jpg',
                },
                {
                    filename: 'cristina_gherasimov.jpg',
                    imageCsvValue: 'C:\\Work\\cristina_gherasimov.jpg',
                    finalPath: 'C:\\Work\\cristina_gherasimov.jpg',
                },
                {
                    filename: 'curararu.jpg',
                    imageCsvValue: 'C:\\Work\\curararu.jpg',
                    finalPath: 'C:\\Work\\curararu.jpg',
                },
            ],
        })
        const user = userEvent.setup()

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        const searchInput = screen.getByRole('searchbox', { name: 'Caută poze existente' })
        expect(await screen.findByText('cristian_iardan.jpg')).toBeInTheDocument()
        expect(screen.getByText('curararu.jpg')).toBeInTheDocument()

        await user.type(searchInput, 'cu')
        expect(screen.getByText('cristian_iardan.jpg')).toBeInTheDocument()
        expect(screen.getByText('curararu.jpg')).toBeInTheDocument()

        await user.type(searchInput, 'r')
        expect(screen.queryByText('cristian_iardan.jpg')).not.toBeInTheDocument()
        expect(screen.queryByText('cristina_gherasimov.jpg')).not.toBeInTheDocument()
        expect(screen.getByText('curararu.jpg')).toBeInTheDocument()
    })

    it('shows a clear message when existing image search has no matches', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'ion.jpg',
                    imageCsvValue: 'C:\\Work\\ion.jpg',
                    finalPath: 'C:\\Work\\ion.jpg',
                },
            ],
        })
        const user = userEvent.setup()

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        await screen.findByText('ion.jpg')
        await user.type(screen.getByRole('searchbox', { name: 'Caută poze existente' }), 'xyz')

        expect(screen.queryByText('ion.jpg')).not.toBeInTheDocument()
        expect(screen.getByText('Nu există poze pentru această căutare.')).toBeInTheDocument()
    })

    it('keeps the existing image list scrollable for long lists', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: Array.from({ length: 12 }, (_, index) => ({
                filename: `photo_${index + 1}.jpg`,
                imageCsvValue: `C:\\Work\\photo_${index + 1}.jpg`,
                finalPath: `C:\\Work\\photo_${index + 1}.jpg`,
            })),
        })

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        const firstPhoto = await screen.findByText('photo_1.jpg')
        const list = firstPhoto.closest('.overflow-y-auto')

        expect(list).toHaveClass('max-h-[470px]', 'overflow-y-auto')
        expect(screen.getByText('photo_12.jpg')).toBeInTheDocument()
    })

    it('shows a clear message when WORK_PATH is not set', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: false,
            files: [],
            error: 'WORK_PATH_NOT_SET',
        })

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(await screen.findByText('Folderul pentru imagini telefonice nu este setat.')).toBeInTheDocument()
    })

    it('shows a clear message when there are no existing jpg images', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [],
        })

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(await screen.findByText('Nu există poze .jpg în folderul pentru imagini telefonice.')).toBeInTheDocument()
    })

    it('loads a thumbnail only for the selected existing image', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'ana.jpg',
                    imageCsvValue: 'C:\\Work\\ana.jpg',
                    finalPath: 'C:\\Work\\ana.jpg',
                },
                {
                    filename: 'ion.jpg',
                    imageCsvValue: 'C:\\Work\\ion.jpg',
                    finalPath: 'C:\\Work\\ion.jpg',
                },
            ],
        })
        const user = userEvent.setup()

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={vi.fn()}
                onSaved={vi.fn()}
            />
        )

        expect(await screen.findByText('Selectează o poză pentru preview.')).toBeInTheDocument()
        expect(getPhoneImageDataUrl).not.toHaveBeenCalled()

        await user.click(screen.getByRole('button', { name: 'ion.jpg' }))

        expect(getPhoneImageDataUrl).toHaveBeenCalledWith({ filename: 'ion.jpg' })
        const preview = await screen.findByRole('img', { name: 'Preview poză existentă' })
        expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,preview')
    })

    it('uses an existing image without starting crop save flow', async () => {
        vi.mocked(listWorkPathImages).mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'ion.jpg',
                    imageCsvValue: 'C:\\Work\\ion.jpg',
                    finalPath: 'C:\\Work\\ion.jpg',
                },
            ],
        })
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onSaved = vi.fn()

        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={onClose}
                onSaved={onSaved}
            />
        )

        await user.click(await screen.findByRole('button', { name: 'Folosește' }))

        expect(onSaved).toHaveBeenCalledWith('C:\\Work\\ion.jpg')
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('closes when close button is clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={onClose}
                onSaved={vi.fn()}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Închide' }))

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('closes on Escape', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={onClose}
                onSaved={vi.fn()}
            />
        )

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledOnce()
    })

    it('forwards saved value and closes', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        const onSaved = vi.fn()
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={onClose}
                onSaved={onSaved}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Încarcă poză nouă' }))
        await user.click(screen.getByRole('button', { name: 'mock save' }))

        expect(onSaved).toHaveBeenCalledWith('C:\\Work\\ion.jpg')
        expect(onClose).toHaveBeenCalledOnce()
    })

    it('keeps errors visible in the modal', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()
        render(
            <PhoneImageModal
                open
                settings={settings}
                onClose={onClose}
                onSaved={vi.fn()}
            />
        )

        await user.click(screen.getByRole('button', { name: 'Încarcă poză nouă' }))
        await user.click(screen.getByRole('button', { name: 'mock error' }))

        expect(screen.getByText('save failed')).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
    })
})
