import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ipcMock } from '@/test/mocks/ipcMock'
import { EntityExportFailureAlert } from './EntityExportFailureAlert'

describe('EntityExportFailureAlert', () => {
    afterEach(() => {
        cleanup()
    })

    it('shows a visible error when entity export fails', () => {
        let listener: Parameters<typeof window.electronAPI.onEntityExportError>[0] | undefined
        vi.mocked(ipcMock.onEntityExportError).mockImplementationOnce((callback) => {
            listener = callback
            return vi.fn()
        })

        render(<EntityExportFailureAlert />)

        act(() => {
            listener?.({
                kind: 'titles',
                filePath: 'D:\\TV\\OC\\Export\\OC_titles.csv',
                message: 'LOCKED',
            })
        })

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Nu s-a putut actualiza fișierul CSV pentru emisie.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Verifică folderul de export sau conexiunea la disc.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent('D:\\TV\\OC\\Export\\OC_titles.csv')
    })

    it('unsubscribes when unmounted', () => {
        const unsubscribe = vi.fn()
        vi.mocked(ipcMock.onEntityExportError).mockReturnValueOnce(unsubscribe)

        const { unmount } = render(<EntityExportFailureAlert />)
        unmount()

        expect(unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('can be dismissed by the user', async () => {
        const user = userEvent.setup()
        let listener: Parameters<typeof window.electronAPI.onEntityExportError>[0] | undefined
        vi.mocked(ipcMock.onEntityExportError).mockImplementationOnce((callback) => {
            listener = callback
            return vi.fn()
        })

        render(<EntityExportFailureAlert />)

        act(() => {
            listener?.({
                kind: 'persons',
                filePath: 'D:\\TV\\OC\\Export\\OC_persons.csv',
                message: 'LOCKED',
            })
        })

        await user.click(screen.getByRole('button', { name: 'Închide' }))

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
