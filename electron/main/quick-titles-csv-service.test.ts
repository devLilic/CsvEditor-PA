import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeQuickTitle } from '../../src/features/quick-titles/domain/quickTitle'
import {
    normalizeQuickTitlesForCsv,
    readQuickTitlesCsv,
    writeQuickTitlesCsv,
} from './quick-titles-csv-service'

function createFsMock() {
    return {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        rename: vi.fn(),
        unlink: vi.fn(),
    }
}

describe('quick-titles-csv-service', () => {
    let fsMock: ReturnType<typeof createFsMock>

    beforeEach(() => {
        fsMock = createFsMock()
        fsMock.mkdir.mockResolvedValue(undefined)
        fsMock.readFile.mockResolvedValue('PRESEDINTE: \n')
        fsMock.writeFile.mockResolvedValue(undefined)
        fsMock.rename.mockResolvedValue(undefined)
        fsMock.unlink.mockResolvedValue(undefined)
    })

    it('normalizes quickTitles with colon and trailing space', () => {
        expect(normalizeQuickTitle(' PRESEDINTE ')).toBe('PRESEDINTE: ')
        expect(normalizeQuickTitle('PRESEDINTE:')).toBe('PRESEDINTE: ')
        expect(normalizeQuickTitle('PRESEDINTE:   ')).toBe('PRESEDINTE: ')
    })

    it('removes duplicates while preserving first occurrence order', () => {
        expect(normalizeQuickTitlesForCsv([
            'PRESEDINTE',
            'PRIM-MINISTRU:',
            'PRESEDINTE: ',
            'DIRECTOR',
        ])).toEqual([
            'PRESEDINTE: ',
            'PRIM-MINISTRU: ',
            'DIRECTOR: ',
        ])
    })

    it('reads valid PA_quickTitles.csv as the primary source', async () => {
        fsMock.readFile.mockResolvedValue([
            'PRESEDINTE:',
            'PRIM-MINISTRU: ',
            'PRESEDINTE: ',
        ].join('\n'))

        await expect(readQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            fs: fsMock,
        })).resolves.toEqual({
            ok: true,
            quickTitles: [
                'PRESEDINTE: ',
                'PRIM-MINISTRU: ',
            ],
        })
    })

    it('reads CSV files without requiring a header', async () => {
        fsMock.readFile.mockResolvedValue('PRESEDINTE: \n')

        await expect(readQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            fs: fsMock,
        })).resolves.toEqual({
            ok: true,
            quickTitles: ['PRESEDINTE: '],
        })
    })

    it('creates a missing quickTitles CSV as an empty file', async () => {
        const missingFileError = new Error('missing') as NodeJS.ErrnoException
        missingFileError.code = 'ENOENT'
        fsMock.readFile.mockRejectedValue(missingFileError)

        await expect(readQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            fs: fsMock,
        })).resolves.toEqual({
            ok: true,
            quickTitles: [],
            error: undefined,
        })

        expect(fsMock.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('PA_quickTitles.csv.'),
            '',
            {
                encoding: 'utf-8',
                flag: 'w',
            }
        )
        expect(fsMock.rename).toHaveBeenCalledWith(
            expect.stringContaining('PA_quickTitles.csv.'),
            'D:\\TV\\OC\\Export\\PA_quickTitles.csv'
        )
    })

    it('writes the complete quickTitles CSV atomically', async () => {
        await expect(writeQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            quickTitles: ['PRESEDINTE', 'PRIM-MINISTRU:', 'PRESEDINTE: '],
            fs: fsMock,
        })).resolves.toEqual({ ok: true })

        expect(fsMock.mkdir).toHaveBeenCalledWith('D:\\TV\\OC\\Export', {
            recursive: true,
        })
        expect(fsMock.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('PA_quickTitles.csv.'),
            '"PRESEDINTE: "\n"PRIM-MINISTRU: "',
            {
                encoding: 'utf-8',
                flag: 'w',
            }
        )
        expect(fsMock.rename).toHaveBeenCalledWith(
            expect.stringContaining('PA_quickTitles.csv.'),
            'D:\\TV\\OC\\Export\\PA_quickTitles.csv'
        )
    })

    it('retries atomic writes up to three times and notifies on failure', async () => {
        const onError = vi.fn()
        fsMock.writeFile.mockRejectedValue(new Error('LOCKED'))

        await expect(writeQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            quickTitles: ['PRESEDINTE'],
            fs: fsMock,
            retryDelayMs: 0,
            onError,
        })).resolves.toEqual({
            ok: false,
            error: 'Failed to write PA_quickTitles.csv at D:\\TV\\OC\\Export\\PA_quickTitles.csv: LOCKED',
        })

        expect(fsMock.writeFile).toHaveBeenCalledTimes(3)
        expect(fsMock.rename).not.toHaveBeenCalled()
        expect(fsMock.unlink).toHaveBeenCalledTimes(3)
        expect(onError).toHaveBeenCalledWith({
            kind: 'quickTitles',
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            error: expect.any(Error),
        })
        expect(onError.mock.calls[0][0].error.message).toContain('D:\\TV\\OC\\Export\\PA_quickTitles.csv')
    })

    it('cleans up failed temp writes and succeeds on a later retry', async () => {
        fsMock.writeFile
            .mockRejectedValueOnce(new Error('LOCKED'))
            .mockResolvedValueOnce(undefined)

        await expect(writeQuickTitlesCsv({
            filePath: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            quickTitles: ['PRESEDINTE'],
            fs: fsMock,
            retryDelayMs: 0,
        })).resolves.toEqual({ ok: true })

        expect(fsMock.writeFile).toHaveBeenCalledTimes(2)
        expect(fsMock.unlink).toHaveBeenCalledTimes(1)
        expect(fsMock.rename).toHaveBeenCalledTimes(1)
        expect(fsMock.rename).toHaveBeenCalledWith(
            expect.stringContaining('PA_quickTitles.csv.'),
            'D:\\TV\\OC\\Export\\PA_quickTitles.csv'
        )
    })
})
