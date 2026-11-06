import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TalesWebImportDialog } from './TalesWebImportDialog'

afterEach(() => cleanup())

describe('TalesWebImportDialog', () => {
    it('stores the shared secret through the connection IPC without rendering it again', async () => {
        const secret = 'local-desktop-readonly-secret-1234567890'
        const connectTalesWeb = vi.fn().mockResolvedValue({ ok: true, data: { connected: true, baseUrl: 'http://tales.test' } })
        Object.assign(window.electronAPI, {
            getTalesWebSession: vi.fn().mockResolvedValue({ connected: false }),
            connectTalesWeb,
            listTalesWebShows: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        })
        render(<TalesWebImportDialog open activeShowName="Impact Global" onClose={vi.fn()} onImport={vi.fn()} />)

        fireEvent.change(await screen.findByLabelText('Adresa Tales Web'), { target: { value: 'http://tales.test' } })
        fireEvent.change(screen.getByLabelText('Secret de integrare'), { target: { value: secret } })
        fireEvent.click(screen.getByRole('button', { name: 'Conectează' }))

        await screen.findByLabelText('Emisiune')
        expect(connectTalesWeb).toHaveBeenCalledWith({ baseUrl: 'http://tales.test', token: secret })
        expect(screen.queryByDisplayValue(secret)).not.toBeInTheDocument()
    })

    it('matches the local show name and leaves archived editions selectable', async () => {
        const importTalesWebEdition = vi.fn().mockResolvedValue({ ok: true, data: { edition: { name: 'Ediție arhivată' } } })
        Object.assign(window.electronAPI, {
            getTalesWebSession: vi.fn().mockResolvedValue({ connected: true, baseUrl: 'http://tales.test' }),
            listTalesWebShows: vi.fn().mockResolvedValue({ ok: true, data: [{ id: 4, name: 'Impact Global', slug: 'impact-global' }] }),
            listTalesWebEditions: vi.fn().mockResolvedValue({ ok: true, data: [{ id: 9, name: 'Ediție arhivată', revision: 3, archived: true }] }),
            importTalesWebEdition,
        })
        const onImport = vi.fn().mockResolvedValue(undefined)
        const onClose = vi.fn()

        render(<TalesWebImportDialog open activeShowName="Impact Global" onClose={onClose} onImport={onImport} />)

        const showSelect = await screen.findByLabelText('Emisiune')
        await waitFor(() => expect(showSelect).toHaveValue('4'))
        await screen.findByRole('option', { name: /Arhivată/ })
        fireEvent.change(screen.getByLabelText('Ediție'), { target: { value: '9' } })
        fireEvent.click(screen.getByRole('button', { name: 'Încarcă ediția' }))
        fireEvent.click(screen.getByRole('button', { name: 'Confirmă importul' }))

        await waitFor(() => expect(importTalesWebEdition).toHaveBeenCalledWith({ showId: 4, editionId: 9 }))
        expect(onImport).toHaveBeenCalledOnce()
        expect(onClose).toHaveBeenCalledOnce()
    })
})
