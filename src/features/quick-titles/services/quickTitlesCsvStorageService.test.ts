import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcMock } from '@/test/mocks/ipcMock'
import {
    clearQuickTitlesCsv,
    loadQuickTitlesFromCsv,
    saveQuickTitlesToCsv,
} from './quickTitlesCsvStorageService'

describe('quickTitlesCsvStorageService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(window as any).electronAPI = ipcMock
        ;(globalThis as any).electronAPI = ipcMock
    })

    it('load reads CSV and returns quickTitles', async () => {
        ipcMock.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            content: [
                '"PRESEDINTE: "',
                '"DIRECTOR: "',
            ].join('\n'),
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            created: false,
        })

        await expect(loadQuickTitlesFromCsv()).resolves.toEqual({
            ok: true,
            quickTitles: [
                'PRESEDINTE: ',
                'DIRECTOR: ',
            ],
            created: false,
        })
        expect(ipcMock.readQuickTitlesCsv).toHaveBeenCalledOnce()
    })

    it('load returns an empty list for an empty file', async () => {
        ipcMock.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            content: '',
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            created: true,
        })

        await expect(loadQuickTitlesFromCsv()).resolves.toEqual({
            ok: true,
            quickTitles: [],
            created: true,
        })
    })

    it('load normalizes values', async () => {
        ipcMock.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            content: [
                'PRESEDINTE',
                'DIRECTOR:',
            ].join('\n'),
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            created: false,
        })

        await expect(loadQuickTitlesFromCsv()).resolves.toMatchObject({
            ok: true,
            quickTitles: [
                'PRESEDINTE: ',
                'DIRECTOR: ',
            ],
        })
    })

    it('load removes duplicates', async () => {
        ipcMock.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            content: [
                'PRESEDINTE',
                'PRESEDINTE:',
                'PRESEDINTE: ',
            ].join('\n'),
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            created: false,
        })

        await expect(loadQuickTitlesFromCsv()).resolves.toMatchObject({
            ok: true,
            quickTitles: ['PRESEDINTE: '],
        })
    })

    it('save serializes and calls electronAPI', async () => {
        ipcMock.writeQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
        })

        await expect(saveQuickTitlesToCsv([
            'PRESEDINTE',
            'DIRECTOR:',
        ])).resolves.toEqual({ ok: true })

        expect(ipcMock.writeQuickTitlesCsv).toHaveBeenCalledWith({
            content: [
                '"PRESEDINTE: "',
                '"DIRECTOR: "',
            ].join('\n'),
        })
    })

    it('save does not mutate the received array', async () => {
        const input = ['PRESEDINTE', 'PRESEDINTE:', 'DIRECTOR']
        const snapshot = [...input]
        ipcMock.writeQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
        })

        await saveQuickTitlesToCsv(input)

        expect(input).toEqual(snapshot)
    })

    it('clear calls the dedicated electronAPI channel', async () => {
        ipcMock.clearQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
        })

        await expect(clearQuickTitlesCsv()).resolves.toEqual({ ok: true })
        expect(ipcMock.clearQuickTitlesCsv).toHaveBeenCalledOnce()
    })

    it('returns a controlled error when electronAPI is missing', async () => {
        ;(window as any).electronAPI = undefined

        await expect(loadQuickTitlesFromCsv()).resolves.toEqual({
            ok: false,
            quickTitles: [],
            error: 'electronAPI not available',
        })
        await expect(saveQuickTitlesToCsv(['PRESEDINTE'])).resolves.toEqual({
            ok: false,
            error: 'electronAPI not available',
        })
        await expect(clearQuickTitlesCsv()).resolves.toEqual({
            ok: false,
            error: 'electronAPI not available',
        })
    })

    it('propagates IPC errors as controlled results', async () => {
        ipcMock.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: false,
            error: 'READ_LOCKED',
        })
        ipcMock.writeQuickTitlesCsv.mockResolvedValueOnce({
            ok: false,
            error: 'WRITE_LOCKED',
        })
        ipcMock.clearQuickTitlesCsv.mockResolvedValueOnce({
            ok: false,
            error: 'CLEAR_LOCKED',
        })

        await expect(loadQuickTitlesFromCsv()).resolves.toEqual({
            ok: false,
            quickTitles: [],
            error: 'READ_LOCKED',
        })
        await expect(saveQuickTitlesToCsv(['PRESEDINTE'])).resolves.toEqual({
            ok: false,
            error: 'WRITE_LOCKED',
        })
        await expect(clearQuickTitlesCsv()).resolves.toEqual({
            ok: false,
            error: 'CLEAR_LOCKED',
        })
    })
})
