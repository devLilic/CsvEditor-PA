import { describe, expect, it } from 'vitest'
import { createCsvBackupFilename } from './csvBackupFile'

describe('createCsvBackupFilename', () => {
    const now = new Date('2026-05-26T14:30:05')

    it('keeps the original filename without extension', () => {
        expect(createCsvBackupFilename({
            workingCsvPath: 'C:/work/emisie.csv',
            now,
        })).toBe('emisie_2026-05-26_14-30-05.csv')
    })

    it('adds the date and time', () => {
        expect(createCsvBackupFilename({
            workingCsvPath: 'C:/work/proiect.csv',
            now,
        })).toContain('2026-05-26_14-30-05')
    })

    it('uses the .csv extension', () => {
        expect(createCsvBackupFilename({
            workingCsvPath: 'C:/work/proiect.txt',
            now,
        })).toMatch(/\.csv$/)
    })

    it('replaces problematic characters', () => {
        expect(createCsvBackupFilename({
            workingCsvPath: 'C:/work/emisie: final?.csv',
            now,
        })).toBe('emisie_ final__2026-05-26_14-30-05.csv')
    })

    it('falls back when working path is missing', () => {
        expect(createCsvBackupFilename({
            workingCsvPath: '',
            now,
        })).toBe('backup_2026-05-26_14-30-05.csv')
    })
})
