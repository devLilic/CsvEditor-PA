import { describe, expect, it } from 'vitest'
import { FALLBACK_CSV_FILE_SETTINGS } from '../domain/csvFileSettings'
import { csvFileSettingsService } from './csvFileSettingsService'

describe('csvFileSettingsService', () => {
    it('getCsvFileSettings returns valid settings from IPC', async () => {
        const api = (window as any).electronAPI
        const settings = {
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        }
        api.getCsvFileSettings.mockResolvedValueOnce(settings)

        const result = await csvFileSettingsService.getCsvFileSettings()

        expect(result).toEqual(settings)
        expect(result.savedProjectsFolderPath).toBe('C:/work/saved-projects')
        expect(api.getCsvFileSettings).toHaveBeenCalledOnce()
    })

    it('getCsvFileSettings returns savedProjectsFolderPath from IPC', async () => {
        const api = (window as any).electronAPI
        api.getCsvFileSettings.mockResolvedValueOnce({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'D:/projects/saved',
            exportCsvFolderPath: 'D:/projects/export',
        })

        const result = await csvFileSettingsService.getCsvFileSettings()

        expect(result.savedProjectsFolderPath).toBe('D:/projects/saved')
    })

    it('getCsvFileSettings returns fallback when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.getCsvFileSettings.mockRejectedValueOnce(new Error('store error'))

        const result = await csvFileSettingsService.getCsvFileSettings()

        expect(result).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('setCsvFileSettings saves valid settings', async () => {
        const api = (window as any).electronAPI
        const settings = {
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        }
        api.setCsvFileSettings.mockResolvedValueOnce(settings)

        const result = await csvFileSettingsService.setCsvFileSettings(settings)

        expect(result).toEqual(settings)
        expect(api.setCsvFileSettings).toHaveBeenCalledWith(settings)
    })

    it('setCsvFileSettings saves savedProjectsFolderPath', async () => {
        const api = (window as any).electronAPI
        const settings = {
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'D:/projects/saved',
            exportCsvFolderPath: 'D:/projects/export',
        }
        api.setCsvFileSettings.mockResolvedValueOnce(settings)

        const result = await csvFileSettingsService.setCsvFileSettings(settings)

        expect(api.setCsvFileSettings).toHaveBeenCalledWith({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'D:/projects/saved',
            exportCsvFolderPath: 'D:/projects/export',
        })
        expect(result.savedProjectsFolderPath).toBe('D:/projects/saved')
    })

    it('setCsvFileSettings returns fallback when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.setCsvFileSettings.mockRejectedValueOnce(new Error('store error'))

        const result = await csvFileSettingsService.setCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        })

        expect(result).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('selectWorkingCsv returns path or null', async () => {
        const api = (window as any).electronAPI
        api.selectWorkingCsv
            .mockResolvedValueOnce('C:/work/current.csv')
            .mockResolvedValueOnce(null)

        await expect(csvFileSettingsService.selectWorkingCsv()).resolves.toBe('C:/work/current.csv')
        await expect(csvFileSettingsService.selectWorkingCsv()).resolves.toBeNull()
        expect(api.selectWorkingCsv).toHaveBeenCalledTimes(2)
    })

    it('selectBackupFolder returns path or null', async () => {
        const api = (window as any).electronAPI
        api.selectBackupFolder
            .mockResolvedValueOnce('C:/work/backups')
            .mockResolvedValueOnce(null)

        await expect(csvFileSettingsService.selectBackupFolder()).resolves.toBe('C:/work/backups')
        await expect(csvFileSettingsService.selectBackupFolder()).resolves.toBeNull()
        expect(api.selectBackupFolder).toHaveBeenCalledTimes(2)
    })

    it('selectSavedProjectsFolder returns path or null', async () => {
        const api = (window as any).electronAPI
        api.selectSavedProjectsFolder
            .mockResolvedValueOnce('C:/work/saved-projects')
            .mockResolvedValueOnce(null)

        await expect(csvFileSettingsService.selectSavedProjectsFolder()).resolves.toBe('C:/work/saved-projects')
        await expect(csvFileSettingsService.selectSavedProjectsFolder()).resolves.toBeNull()
        expect(api.selectSavedProjectsFolder).toHaveBeenCalledTimes(2)
    })

    it('selectSavedProjectsFolder returns null when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.selectSavedProjectsFolder.mockRejectedValueOnce(new Error('dialog error'))

        await expect(csvFileSettingsService.selectSavedProjectsFolder()).resolves.toBeNull()
    })

    it('selectExportCsvFolder returns path or null', async () => {
        const api = (window as any).electronAPI
        api.selectExportCsvFolder
            .mockResolvedValueOnce('C:/work/export')
            .mockResolvedValueOnce(null)

        await expect(csvFileSettingsService.selectExportCsvFolder()).resolves.toBe('C:/work/export')
        await expect(csvFileSettingsService.selectExportCsvFolder()).resolves.toBeNull()
        expect(api.selectExportCsvFolder).toHaveBeenCalledTimes(2)
    })

    it('selectExportCsvFolder returns null when IPC fails', async () => {
        const api = (window as any).electronAPI
        api.selectExportCsvFolder.mockRejectedValueOnce(new Error('dialog error'))

        await expect(csvFileSettingsService.selectExportCsvFolder()).resolves.toBeNull()
    })
})
