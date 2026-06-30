import * as fs from 'node:fs'
import * as path from 'node:path'
import {
    normalizeAndDeduplicateQuickTitles,
} from '../../src/features/quick-titles/domain/quickTitle'
import {
    parseQuickTitlesCsv,
    serializeQuickTitlesCsv,
} from '../../src/features/quick-titles/domain/quickTitlesCsv'

const fsp = fs.promises
const DEFAULT_RETRY_COUNT = 3
const DEFAULT_RETRY_DELAY_MS = 100

type QuickTitlesCsvFs = {
    mkdir(filePath: string, options: { recursive: true }): Promise<unknown>
    readFile(filePath: string, encoding: BufferEncoding): Promise<string>
    writeFile(filePath: string, content: string, options: { encoding: BufferEncoding; flag: 'w' }): Promise<unknown>
    rename(oldPath: string, newPath: string): Promise<unknown>
    unlink(filePath: string): Promise<unknown>
}

export interface QuickTitlesCsvError {
    kind: 'quickTitles'
    filePath: string
    error: Error
}

export interface QuickTitlesCsvResult {
    ok: boolean
    error?: string
}

export interface QuickTitlesCsvReadResult extends QuickTitlesCsvResult {
    quickTitles: string[]
}

export function normalizeQuickTitlesForCsv(list: string[]): string[] {
    return normalizeAndDeduplicateQuickTitles(list)
}

function normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
}

function notifyError(input: {
    filePath: string
    error: Error
    onError?: (error: QuickTitlesCsvError) => void
}): void {
    const payload = {
        kind: 'quickTitles' as const,
        filePath: input.filePath,
        error: input.error,
    }

    if (input.onError) {
        input.onError(payload)
        return
    }

    console.error('[quick-titles-csv] failed:', input.error)
}

async function cleanupTempFile(fsApi: QuickTitlesCsvFs, tempPath: string): Promise<void> {
    await fsApi.unlink(tempPath).catch(() => undefined)
}

async function delay(ms: number): Promise<void> {
    if (ms <= 0) {
        return
    }

    await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function writeQuickTitlesCsv(input: {
    filePath: string
    quickTitles: string[]
    retryCount?: number
    retryDelayMs?: number
    fs?: QuickTitlesCsvFs
    onError?: (error: QuickTitlesCsvError) => void
}): Promise<QuickTitlesCsvResult> {
    const fsApi = input.fs ?? fsp
    const attempts = Math.min(
        DEFAULT_RETRY_COUNT,
        Math.max(1, Math.floor(input.retryCount ?? DEFAULT_RETRY_COUNT))
    )
    const retryDelayMs = Math.max(0, Math.floor(input.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS))
    const csv = serializeQuickTitlesCsv(input.quickTitles)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const tempPath = `${input.filePath}.${process.pid}.${Date.now()}.${attempt}.tmp`

        try {
            await fsApi.mkdir(path.dirname(input.filePath), { recursive: true })
            await fsApi.writeFile(tempPath, csv, {
                encoding: 'utf-8',
                flag: 'w',
            })
            await fsApi.rename(tempPath, input.filePath)
            return { ok: true }
        } catch (error) {
            lastError = normalizeError(error)
            await cleanupTempFile(fsApi, tempPath)
            if (attempt < attempts) {
                await delay(retryDelayMs)
            }
        }
    }

    const finalError = lastError ?? new Error('UNKNOWN_QUICK_TITLES_CSV_ERROR')
    const contextualError = new Error(`Failed to write PA_quickTitles.csv at ${input.filePath}: ${finalError.message}`)
    notifyError({
        filePath: input.filePath,
        error: contextualError,
        onError: input.onError,
    })

    return {
        ok: false,
        error: contextualError.message,
    }
}

export async function readQuickTitlesCsv(input: {
    filePath: string
    retryCount?: number
    retryDelayMs?: number
    fs?: QuickTitlesCsvFs
    onError?: (error: QuickTitlesCsvError) => void
}): Promise<QuickTitlesCsvReadResult> {
    const fsApi = input.fs ?? fsp

    try {
        const content = await fsApi.readFile(input.filePath, 'utf-8')
        const quickTitles = parseQuickTitlesCsv(content)

        return {
            ok: true,
            quickTitles,
        }
    } catch (error) {
        const normalizedError = normalizeError(error)
        if ((normalizedError as NodeJS.ErrnoException).code === 'ENOENT') {
            const writeResult = await writeQuickTitlesCsv({
                filePath: input.filePath,
                quickTitles: [],
                retryCount: input.retryCount,
                retryDelayMs: input.retryDelayMs,
                fs: fsApi,
                onError: input.onError,
            })

            return {
                ok: writeResult.ok,
                quickTitles: [],
                error: writeResult.error,
            }
        }

        notifyError({
            filePath: input.filePath,
            error: normalizedError,
            onError: input.onError,
        })

        return {
            ok: false,
            quickTitles: [],
            error: normalizedError.message,
        }
    }
}
