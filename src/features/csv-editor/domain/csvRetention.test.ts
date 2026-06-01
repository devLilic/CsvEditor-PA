import { describe, expect, it } from 'vitest'
import { MAX_BACKUP_CSV_FILES, type CsvFileInfo, getBackupFilesToDelete } from './csvRetention'

function file(filename: string, mtimeMs: number): CsvFileInfo {
    return {
        filename,
        fullPath: `C:/backups/${filename}`,
        mtimeMs,
    }
}

describe('getBackupFilesToDelete', () => {
    it('returns nothing to delete when files are below the limit', () => {
        const files = Array.from({ length: 9 }, (_, index) => file(`backup-${index}.csv`, index))

        expect(getBackupFilesToDelete({
            files,
            maxFiles: MAX_BACKUP_CSV_FILES,
        })).toEqual([])
    })

    it('returns nothing to delete when files are exactly at the limit', () => {
        const files = Array.from({ length: 10 }, (_, index) => file(`backup-${index}.csv`, index))

        expect(getBackupFilesToDelete({
            files,
            maxFiles: MAX_BACKUP_CSV_FILES,
        })).toEqual([])
    })

    it('returns the oldest file when there is one file over the limit', () => {
        const files = Array.from({ length: 11 }, (_, index) => file(`backup-${index}.csv`, index))

        expect(getBackupFilesToDelete({
            files,
            maxFiles: MAX_BACKUP_CSV_FILES,
        })).toEqual([
            file('backup-0.csv', 0),
        ])
    })

    it('returns the three oldest files when there are three files over the limit', () => {
        const files = Array.from({ length: 13 }, (_, index) => file(`backup-${index}.csv`, index))

        expect(getBackupFilesToDelete({
            files,
            maxFiles: MAX_BACKUP_CSV_FILES,
        })).toEqual([
            file('backup-0.csv', 0),
            file('backup-1.csv', 1),
            file('backup-2.csv', 2),
        ])
    })

    it('sorts by mtimeMs and keeps the newest files', () => {
        const files = [
            file('newest.csv', 300),
            file('oldest.csv', 100),
            file('middle.csv', 200),
        ]

        expect(getBackupFilesToDelete({
            files,
            maxFiles: 2,
        })).toEqual([
            file('oldest.csv', 100),
        ])
    })

    it('ignores non-csv files when they are included in the input', () => {
        const files = [
            file('old-note.txt', 1),
            file('backup-1.csv', 2),
            file('backup-2.csv', 3),
            file('document.pdf', 4),
            file('backup-3.csv', 5),
        ]

        expect(getBackupFilesToDelete({
            files,
            maxFiles: 2,
        })).toEqual([
            file('backup-1.csv', 2),
        ])
    })

    it('does not mutate the original array', () => {
        const files = [
            file('newest.csv', 300),
            file('oldest.csv', 100),
            file('middle.csv', 200),
        ]
        const originalOrder = [...files]

        getBackupFilesToDelete({
            files,
            maxFiles: 2,
        })

        expect(files).toEqual(originalOrder)
    })

    it('returns all csv files when maxFiles is zero or lower', () => {
        const files = [
            file('newest.csv', 300),
            file('oldest.csv', 100),
            file('middle.csv', 200),
        ]

        expect(getBackupFilesToDelete({
            files,
            maxFiles: 0,
        })).toEqual([
            file('oldest.csv', 100),
            file('middle.csv', 200),
            file('newest.csv', 300),
        ])

        expect(getBackupFilesToDelete({
            files,
            maxFiles: -1,
        })).toEqual([
            file('oldest.csv', 100),
            file('middle.csv', 200),
            file('newest.csv', 300),
        ])
    })
})
