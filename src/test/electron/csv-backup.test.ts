import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCsvBackupTarget, writeCsvBackup } from '../../../electron/main/csv-backup'

describe('csv-backup', () => {
    const now = new Date('2026-05-26T14:30:05')
    let tempDir: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-backup-'))
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    it('fails when backupFolderPath is missing', async () => {
        const result = await resolveCsvBackupTarget({
            content: 'a,b',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: '',
            now,
        })

        expect(result).toEqual({
            ok: false,
            error: 'No backup folder configured',
        })
    })

    it('fails when content is not a string', async () => {
        const result = await resolveCsvBackupTarget({
            content: 123,
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result).toEqual({
            ok: false,
            error: 'Invalid content type, expected string',
        })
    })

    it('builds the final path with the expected filename', async () => {
        const result = await resolveCsvBackupTarget({
            content: 'a,b',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(result.filename).toBe('emisie_2026-05-26_14-30-05.csv')
        expect(result.backupPath).toBe(path.join(tempDir, result.filename))
    })

    it('writes the CSV content to the file', async () => {
        const result = await writeCsvBackup({
            content: 'col1,col2\nvalue1,value2',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result.ok).toBe(true)
        expect(result.backupPath).toBeTruthy()

        const written = await fs.readFile(result.backupPath!, 'utf-8')
        expect(written).toBe('col1,col2\nvalue1,value2')
    })

    it('returns the final path', async () => {
        const result = await writeCsvBackup({
            content: 'a,b',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result).toEqual({
            ok: true,
            backupPath: path.join(tempDir, 'emisie_2026-05-26_14-30-05.csv'),
            filename: 'emisie_2026-05-26_14-30-05.csv',
        })
    })

    it('keeps at most 10 CSV backup files after creating a new backup', async () => {
        for (let index = 0; index < 10; index += 1) {
            const filename = `old-${index}.csv`
            const filePath = path.join(tempDir, filename)
            await fs.writeFile(filePath, `old-${index}`, 'utf-8')
            const timestamp = new Date(`2026-05-26T13:${String(index).padStart(2, '0')}:00`)
            await fs.utimes(filePath, timestamp, timestamp)
        }

        await fs.writeFile(path.join(tempDir, 'notes.txt'), 'not a csv', 'utf-8')

        const result = await writeCsvBackup({
            content: 'new,backup',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result.ok).toBe(true)
        expect(result.backupPath).toBeTruthy()

        const filenames = await fs.readdir(tempDir)
        const csvFiles = filenames.filter((filename) => filename.toLowerCase().endsWith('.csv'))

        expect(csvFiles).toHaveLength(10)
        expect(csvFiles).toContain('emisie_2026-05-26_14-30-05.csv')
        expect(csvFiles).not.toContain('old-0.csv')
        expect(filenames).toContain('notes.txt')
    })

    it('does not delete any CSV files when the new backup brings the folder to exactly 10 files', async () => {
        for (let index = 0; index < 9; index += 1) {
            const filename = `old-${index}.csv`
            const filePath = path.join(tempDir, filename)
            await fs.writeFile(filePath, `old-${index}`, 'utf-8')
            const timestamp = new Date(`2026-05-26T13:${String(index).padStart(2, '0')}:00`)
            await fs.utimes(filePath, timestamp, timestamp)
        }

        const result = await writeCsvBackup({
            content: 'new,backup',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: tempDir,
            now,
        })

        expect(result.ok).toBe(true)

        const filenames = await fs.readdir(tempDir)
        const csvFiles = filenames.filter((filename) => filename.toLowerCase().endsWith('.csv'))

        expect(csvFiles).toHaveLength(10)
        expect(csvFiles).toContain('emisie_2026-05-26_14-30-05.csv')
        for (let index = 0; index < 9; index += 1) {
            expect(csvFiles).toContain(`old-${index}.csv`)
        }
    })

    it('returns success when old backup cleanup fails', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const writtenPaths: string[] = []
        const fakeFs = {
            async stat(filePath: string) {
                if (filePath === 'C:/backups') {
                    return { isDirectory: () => true }
                }

                return {
                    isDirectory: () => false,
                    mtimeMs: filePath.includes('old-0') ? 1 : 2,
                }
            },
            async access() {
                return undefined
            },
            async writeFile(filePath: string) {
                writtenPaths.push(filePath)
            },
            async readdir() {
                return [
                    'old-0.csv',
                    'old-1.csv',
                    'old-2.csv',
                    'old-3.csv',
                    'old-4.csv',
                    'old-5.csv',
                    'old-6.csv',
                    'old-7.csv',
                    'old-8.csv',
                    'old-9.csv',
                    'emisie_2026-05-26_14-30-05.csv',
                ]
            },
            async unlink() {
                throw new Error('cannot delete old backup')
            },
        }

        const result = await writeCsvBackup({
            content: 'new,backup',
            workingCsvPath: 'C:/work/emisie.csv',
            backupFolderPath: 'C:/backups',
            now,
            fs: fakeFs,
        })

        expect(result).toEqual({
            ok: true,
            backupPath: path.join('C:/backups', 'emisie_2026-05-26_14-30-05.csv'),
            filename: 'emisie_2026-05-26_14-30-05.csv',
        })
        expect(writtenPaths).toEqual([
            path.join('C:/backups', 'emisie_2026-05-26_14-30-05.csv'),
        ])
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[csv:create-backup] failed to delete old backup:',
            path.join('C:/backups', 'old-0.csv'),
            expect.any(Error),
        )
        consoleErrorSpy.mockRestore()
    })
})
