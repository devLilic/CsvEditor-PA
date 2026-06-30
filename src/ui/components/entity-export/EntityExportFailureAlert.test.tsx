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
                filePath: 'D:\\TV\\PA\\Export\\PA_titles.csv',
                message: 'LOCKED',
            })
        })

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Nu s-a putut actualiza fisierul CSV pentru emisie.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Verifica folderul de export sau conexiunea la disc.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent('D:\\TV\\PA\\Export\\PA_titles.csv')
    })

    it('shows a specific message when quickTitles CSV save fails', () => {
        let listener: Parameters<typeof window.electronAPI.onEntityExportError>[0] | undefined
        vi.mocked(ipcMock.onEntityExportError).mockImplementationOnce((callback) => {
            listener = callback
            return vi.fn()
        })

        render(<EntityExportFailureAlert />)

        act(() => {
            listener?.({
                kind: 'quickTitles',
                filePath: 'D:\\TV\\PA\\Export\\PA_quickTitles.csv',
                message: 'LOCKED',
            })
        })

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Quick Titles nu au putut fi salvate in PA_quickTitles.csv.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Verifica folderul de export si accesul la fisier.'
        )
        expect(screen.getByRole('alert')).toHaveTextContent('D:\\TV\\PA\\Export\\PA_quickTitles.csv')
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
                filePath: 'D:\\TV\\PA\\Export\\PA_persons.csv',
                message: 'LOCKED',
            })
        })

        await user.click(screen.getByRole('button', { name: 'Inchide' }))

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
