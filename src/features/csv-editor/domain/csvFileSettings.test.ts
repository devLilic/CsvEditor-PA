import { describe, expect, it } from 'vitest'
import {
    FALLBACK_CSV_FILE_SETTINGS,
    normalizeCsvFileSettings,
} from './csvFileSettings'

describe('normalizeCsvFileSettings', () => {
    it('normalizes a valid object', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        })).toEqual({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        })
    })

    it('uses fallback settings for null', () => {
        expect(normalizeCsvFileSettings(null)).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('uses fallback for missing workingCsvPath', () => {
        expect(normalizeCsvFileSettings({
            backupFolderPath: 'C:/work/backups',
        })).toEqual({
            workingCsvPath: FALLBACK_CSV_FILE_SETTINGS.workingCsvPath,
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
            exportCsvFolderPath: FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
        })
    })

    it('uses fallback for missing backupFolderPath', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
        })).toEqual({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: FALLBACK_CSV_FILE_SETTINGS.backupFolderPath,
            savedProjectsFolderPath: FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
            exportCsvFolderPath: FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
        })
    })

    it('uses fallback for missing savedProjectsFolderPath', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
        })).toEqual({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
            exportCsvFolderPath: FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
        })
    })

    it('uses fallback for non-string savedProjectsFolderPath', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 123,
        })).toEqual({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: FALLBACK_CSV_FILE_SETTINGS.savedProjectsFolderPath,
            exportCsvFolderPath: FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
        })
    })

    it('keeps existing workingCsvPath and backupFolderPath when savedProjectsFolderPath is valid', () => {
        const settings = normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: 'C:/work/export',
        })

        expect(settings.workingCsvPath).toBe('C:/work/current.csv')
        expect(settings.backupFolderPath).toBe('C:/work/backups')
        expect(settings.savedProjectsFolderPath).toBe('C:/work/saved-projects')
        expect(settings.exportCsvFolderPath).toBe('C:/work/export')
    })

    it('uses fallback for non-string values', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 123,
            backupFolderPath: false,
            savedProjectsFolderPath: null,
            exportCsvFolderPath: 456,
        })).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('uses full fallback for an invalid object', () => {
        expect(normalizeCsvFileSettings('invalid')).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('keeps valid strings exactly as provided', () => {
        const settings = normalizeCsvFileSettings({
            workingCsvPath: '  C:/path with spaces/current.csv  ',
            backupFolderPath: '',
            savedProjectsFolderPath: '  C:/path with spaces/saved projects  ',
            exportCsvFolderPath: '  C:/path with spaces/export  ',
        })

        expect(settings.workingCsvPath).toBe('  C:/path with spaces/current.csv  ')
        expect(settings.backupFolderPath).toBe('')
        expect(settings.savedProjectsFolderPath).toBe('  C:/path with spaces/saved projects  ')
        expect(settings.exportCsvFolderPath).toBe('  C:/path with spaces/export  ')
    })

    it('uses fallback for missing exportCsvFolderPath', () => {
        expect(normalizeCsvFileSettings({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
        })).toEqual({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
            savedProjectsFolderPath: 'C:/work/saved-projects',
            exportCsvFolderPath: FALLBACK_CSV_FILE_SETTINGS.exportCsvFolderPath,
        })
    })
})
