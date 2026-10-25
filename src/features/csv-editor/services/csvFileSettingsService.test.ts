import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_CSV_FILE_SETTINGS } from '../domain/csvFileSettings'
import { csvFileSettingsService } from './csvFileSettingsService'

describe('csvFileSettingsService', () => {
    it('normalizes project-root settings received from IPC', async () => {
        const api = (window as any).electronAPI
        api.getCsvFileSettings.mockResolvedValueOnce({
            projectFolderPath: 'C:/work',
            exportPrefix: 'PA_',
            workingCsvPath: '',
            backupFolderPath: 'ignored',
            savedProjectsFolderPath: 'ignored',
            exportCsvFolderPath: 'ignored',
        })
        await expect(csvFileSettingsService.getCsvFileSettings()).resolves.toEqual({
            projectFolderPath: 'C:/work',
            exportPrefix: 'PA_',
            workingCsvPath: '',
            backupFolderPath: 'C:/work/Backup',
            savedProjectsFolderPath: 'C:/work/Saved',
            exportCsvFolderPath: 'C:/work/Export',
        })
    })

    it('keeps legacy standalone folder values when there is no working CSV root', async () => {
        const api = (window as any).electronAPI
        api.getCsvFileSettings.mockResolvedValueOnce({
            workingCsvPath: '',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'D:/projects/saved',
            exportCsvFolderPath: 'D:/projects/export',
        })
        const result = await csvFileSettingsService.getCsvFileSettings()
        expect(result.projectFolderPath).toBe('')
        expect(result.savedProjectsFolderPath).toBe('D:/projects/saved')
    })

    it('returns fallback when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.getCsvFileSettings.mockRejectedValueOnce(new Error('store error'))
        await expect(csvFileSettingsService.getCsvFileSettings()).resolves.toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('normalizes and forwards explicit show scope when saving', async () => {
        const api = (window as any).electronAPI
        const input = {
            projectFolderPath: 'C:/work',
            exportPrefix: 'PA_',
            workingCsvPath: '',
            backupFolderPath: 'ignored',
            savedProjectsFolderPath: 'ignored',
            exportCsvFolderPath: 'ignored',
        }
        const normalized = {
            projectFolderPath: 'C:/work',
            exportPrefix: 'PA_',
            workingCsvPath: '',
            backupFolderPath: 'C:/work/Backup',
            savedProjectsFolderPath: 'C:/work/Saved',
            exportCsvFolderPath: 'C:/work/Export',
        }
        api.setCsvFileSettings.mockResolvedValueOnce(normalized)
        const listener = vi.fn()
        const unsubscribe = csvFileSettingsService.subscribeCsvFileSettings(listener)

        await expect(csvFileSettingsService.setCsvFileSettings(input, 'show-pa')).resolves.toEqual(normalized)
        expect(api.setCsvFileSettings).toHaveBeenCalledWith(normalized, 'show-pa')
        expect(listener).toHaveBeenCalledWith(normalized)
        unsubscribe()
    })

    it('returns fallback when a save fails', async () => {
        const api = (window as any).electronAPI
        api.setCsvFileSettings.mockRejectedValueOnce(new Error('store error'))
        await expect(csvFileSettingsService.setCsvFileSettings(FALLBACK_CSV_FILE_SETTINGS)).resolves.toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('folder selectors return path or null on errors', async () => {
        const api = (window as any).electronAPI
        api.selectWorkingCsv.mockResolvedValueOnce('C:/work/current.csv').mockResolvedValueOnce(null)
        api.selectBackupFolder.mockRejectedValueOnce(new Error('dialog error'))
        await expect(csvFileSettingsService.selectWorkingCsv()).resolves.toBe('C:/work/current.csv')
        await expect(csvFileSettingsService.selectWorkingCsv()).resolves.toBeNull()
        await expect(csvFileSettingsService.selectBackupFolder()).resolves.toBeNull()
    })
})
