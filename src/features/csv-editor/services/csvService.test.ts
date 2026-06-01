// src/features/csv-editor/services/csvService.test.ts
import { describe, it, expect } from 'vitest'
import { csvService } from './csvService'

describe('csvService', () => {
    it('getLast returns null when IPC returns null', async () => {
        const api = (globalThis as any).electronAPI
        api.getLastCsv.mockResolvedValueOnce(null)

        const result = await csvService.getLast()

        expect(result).toBeNull()
        expect(api.getLastCsv).toHaveBeenCalledOnce()
    })

    it('getLast NEVER throws even if IPC misbehaves', async () => {
        const api = (globalThis as any).electronAPI
        api.getLastCsv.mockRejectedValueOnce(new Error('fs crash'))

        const result = await csvService.getLast()

        expect(result).toBeNull()
    })

    it('getWorkingCsv returns configured working CSV response when IPC succeeds', async () => {
        const api = (globalThis as any).electronAPI
        const response = {
            ok: true,
            path: 'C:/work/current.csv',
            filename: 'current.csv',
            content: 'a,b,c',
        }
        api.getWorkingCsv.mockResolvedValueOnce(response)

        const result = await csvService.getWorkingCsv()

        expect(result).toEqual(response)
        expect(api.getWorkingCsv).toHaveBeenCalledOnce()
    })

    it('getWorkingCsv returns a controlled error when IPC returns a controlled error', async () => {
        const api = (globalThis as any).electronAPI
        const response = {
            ok: false,
            error: 'No working CSV configured',
        }
        api.getWorkingCsv.mockResolvedValueOnce(response)

        const result = await csvService.getWorkingCsv()

        expect(result).toEqual(response)
    })

    it('getWorkingCsv returns IPC_FAILED when IPC throws', async () => {
        const api = (globalThis as any).electronAPI
        api.getWorkingCsv.mockRejectedValueOnce(new Error('ipc crash'))

        const result = await csvService.getWorkingCsv()

        expect(result).toEqual({ ok: false, error: 'IPC_FAILED' })
    })

    it('getWorkingCsv returns a controlled error when IPC fails without throwing', async () => {
        const api = (globalThis as any).electronAPI
        api.getWorkingCsv.mockResolvedValueOnce({
            ok: false,
            error: 'Working CSV file does not exist',
        })

        const result = await csvService.getWorkingCsv()

        expect(result).toEqual({
            ok: false,
            error: 'Working CSV file does not exist',
        })
    })

    it('openDialog returns null when user cancels dialog', async () => {
        const api = (globalThis as any).electronAPI
        api.openCsvDialog.mockResolvedValueOnce(null)

        const result = await csvService.openDialog()

        expect(result).toBeNull()
        expect(api.openCsvDialog).toHaveBeenCalledOnce()
    })

    it('write returns ok=false when IPC signals failure', async () => {
        const api = (globalThis as any).electronAPI
        api.writeCsv.mockResolvedValueOnce({ ok: false, error: 'no path' })

        const result = await csvService.write('a,b,c')

        expect(result.ok).toBe(false)
        expect(result.error).toBe('no path')
    })

    it('write writes through the working CSV IPC endpoint', async () => {
        const api = (globalThis as any).electronAPI
        api.writeCsv.mockResolvedValueOnce({ ok: true })

        const result = await csvService.write('a,b,c')

        expect(result).toEqual({ ok: true })
        expect(api.writeCsv).toHaveBeenCalledWith('a,b,c')
    })

    it('write returns a controlled error when working CSV is not configured', async () => {
        const api = (globalThis as any).electronAPI
        api.writeCsv.mockResolvedValueOnce({
            ok: false,
            error: 'No working CSV configured',
        })

        const result = await csvService.write('a,b,c')

        expect(result).toEqual({
            ok: false,
            error: 'No working CSV configured',
        })
    })

    it('write does not open the CSV selection dialog', async () => {
        const api = (globalThis as any).electronAPI
        api.writeCsv.mockResolvedValueOnce({ ok: true })

        await csvService.write('a,b,c')

        expect(api.openCsvDialog).not.toHaveBeenCalled()
    })

    it('write NEVER throws even if IPC throws', async () => {
        const api = (globalThis as any).electronAPI
        api.writeCsv.mockRejectedValueOnce(new Error('disk error'))

        const result = await csvService.write('a,b,c')

        expect(result.ok).toBe(false)
    })

    it('backup returns ok=true and backupPath on success', async () => {
        const api = (globalThis as any).electronAPI
        api.bkpCsv.mockResolvedValueOnce({
            ok: true,
            backupPath: '/backups/file_123.csv',
        })

        const result = await csvService.backup('a,b,c')

        expect(result.ok).toBe(true)
        expect(result.backupPath).toBe('/backups/file_123.csv')
    })

    it('backup returns ok=false when IPC fails', async () => {
        const api = (globalThis as any).electronAPI
        api.bkpCsv.mockRejectedValueOnce(new Error('permission denied'))

        const result = await csvService.backup('a,b,c')

        expect(result.ok).toBe(false)
    })

    it('createBackup returns ok=true with backupPath and filename on success', async () => {
        const api = (globalThis as any).electronAPI
        api.createCsvBackup.mockResolvedValueOnce({
            ok: true,
            backupPath: '/backups/emisie_2026-05-26_14-30-05.csv',
            filename: 'emisie_2026-05-26_14-30-05.csv',
        })

        const result = await csvService.createBackup('a,b,c')

        expect(result.ok).toBe(true)
        expect(result.backupPath).toBe('/backups/emisie_2026-05-26_14-30-05.csv')
        expect(result.filename).toBe('emisie_2026-05-26_14-30-05.csv')
        expect(api.createCsvBackup).toHaveBeenCalledWith({ content: 'a,b,c' })
    })

    it('createBackup returns IPC_FAILED when IPC fails', async () => {
        const api = (globalThis as any).electronAPI
        api.createCsvBackup.mockRejectedValueOnce(new Error('ipc crash'))

        const result = await csvService.createBackup('a,b,c')

        expect(result).toEqual({ ok: false, error: 'IPC_FAILED' })
    })

    it('createBackup returns ok=false when input is not a string', async () => {
        const api = (globalThis as any).electronAPI

        const result = await csvService.createBackup(123 as any)

        expect(result.ok).toBe(false)
        expect(api.createCsvBackup).not.toHaveBeenCalled()
    })

    it('createBackup does not modify received content', async () => {
        const api = (globalThis as any).electronAPI
        const content = ' col1,col2 \n value1,value2 \n'
        api.createCsvBackup.mockResolvedValueOnce({ ok: true })

        await csvService.createBackup(content)

        expect(api.createCsvBackup).toHaveBeenCalledWith({ content })
    })
})
