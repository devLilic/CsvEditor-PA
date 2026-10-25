import { describe, expect, it } from 'vitest'
import { FALLBACK_CSV_FILE_SETTINGS, normalizeCsvFileSettings } from './csvFileSettings'

describe('normalizeCsvFileSettings', () => {
    it('provides empty project root and prefix by default', () => {
        expect(normalizeCsvFileSettings(null)).toEqual(FALLBACK_CSV_FILE_SETTINGS)
    })

    it('keeps the selected project root and configurable export prefix', () => {
        const settings = normalizeCsvFileSettings({ projectFolderPath: 'D:/Projects/Show', exportPrefix: 'ED_' })
        expect(settings.projectFolderPath).toBe('D:/Projects/Show')
        expect(settings.exportPrefix).toBe('ED_')
    })

    it('derives a project root from legacy working CSV settings', () => {
        const settings = normalizeCsvFileSettings({ workingCsvPath: 'C:/work/current.csv' })
        expect(settings.projectFolderPath).toBe('C:/work')
        expect(settings.workingCsvPath).toBe('C:/work/current.csv')
    })

    it('removes characters that cannot safely appear in export filenames', () => {
        expect(normalizeCsvFileSettings({ exportPrefix: '  PA:/\u0000_  ' }).exportPrefix).toBe('PA_')
    })

    it('falls back for invalid field types', () => {
        const settings = normalizeCsvFileSettings({ projectFolderPath: 123, exportPrefix: false })
        expect(settings.projectFolderPath).toBe('')
        expect(settings.exportPrefix).toBe('')
    })
})
