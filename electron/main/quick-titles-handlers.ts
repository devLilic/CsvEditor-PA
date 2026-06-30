import { BrowserWindow, ipcMain } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { resolveQuickTitlesCsvPath as resolveQuickTitlesCsvExportPath } from '../../src/features/entity-export/domain/exportPathResolver'
import { parseQuickTitlesCsv, serializeQuickTitlesCsv } from '../../src/features/quick-titles/domain/quickTitlesCsv'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import type {
    ReadQuickTitlesCsvResult,
    WriteQuickTitlesCsvResult,
} from '../../src/shared/ipc-types'
import {
    getCsvFilePath,
    getCsvFileSettings,
    setQuickTitles,
} from '../store'
import { notifyEntityExportFailure } from './entity-export-notification'
import {
    readQuickTitlesCsv,
    writeQuickTitlesCsv,
    type QuickTitlesCsvError,
} from './quick-titles-csv-service'

const fsp = fs.promises

function isMissingFileError(error: unknown): boolean {
    return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

export async function resolveQuickTitlesCsvPath(): Promise<string> {
    const settings = getCsvFileSettings()
    const exportFolderPath = settings.exportCsvFolderPath.trim()
    const workingCsvPath = settings.workingCsvPath.trim() || getCsvFilePath()

    if (!workingCsvPath && !exportFolderPath) {
        throw new Error('No working CSV configured')
    }

    const filePath = resolveQuickTitlesCsvExportPath({
        workingCsvPath: workingCsvPath ?? '',
        exportFolderPath,
    })

    await fsp.mkdir(path.dirname(filePath), { recursive: true })
    return filePath
}

function notifyQuickTitlesFailure(mainWindow: BrowserWindow, error: QuickTitlesCsvError): void {
    notifyEntityExportFailure(mainWindow, error)
}

async function readQuickTitlesCsvContent(
    mainWindow: BrowserWindow
): Promise<ReadQuickTitlesCsvResult> {
    try {
        const filePath = await resolveQuickTitlesCsvPath()

        try {
            const content = await fsp.readFile(filePath, 'utf-8')
            return {
                ok: true,
                content,
                path: filePath,
                created: false,
            }
        } catch (error) {
            if (!isMissingFileError(error)) {
                console.error('[quick-titles:read-csv] failed to read PA_quickTitles.csv:', {
                    path: filePath,
                    error,
                })

                return {
                    ok: false,
                    error: getErrorMessage(error),
                }
            }

            const writeResult = await writeQuickTitlesCsv({
                filePath,
                quickTitles: [],
                onError: (quickTitleError) => notifyQuickTitlesFailure(mainWindow, quickTitleError),
            })

            if (!writeResult.ok) {
                return {
                    ok: false,
                    error: writeResult.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR',
                }
            }

            return {
                ok: true,
                content: serializeQuickTitlesCsv([]),
                path: filePath,
                created: true,
            }
        }
    } catch (error) {
        return {
            ok: false,
            error: getErrorMessage(error),
        }
    }
}

async function writeQuickTitlesCsvContent(input: {
    mainWindow: BrowserWindow
    content: unknown
}): Promise<WriteQuickTitlesCsvResult> {
    try {
        if (typeof input.content !== 'string') {
            return {
                ok: false,
                error: 'Invalid content type, expected string',
            }
        }

        const filePath = await resolveQuickTitlesCsvPath()
        const quickTitles = parseQuickTitlesCsv(input.content)
        const result = await writeQuickTitlesCsv({
            filePath,
            quickTitles,
            onError: (error) => notifyQuickTitlesFailure(input.mainWindow, error),
        })

        if (!result.ok) {
            return {
                ok: false,
                error: result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR',
            }
        }

        setQuickTitles(quickTitles)
        return {
            ok: true,
            path: filePath,
        }
    } catch (error) {
        return {
            ok: false,
            error: getErrorMessage(error),
        }
    }
}

async function clearQuickTitlesCsv(
    mainWindow: BrowserWindow
): Promise<WriteQuickTitlesCsvResult> {
    try {
        const filePath = await resolveQuickTitlesCsvPath()
        const result = await writeQuickTitlesCsv({
            filePath,
            quickTitles: [],
            onError: (error) => notifyQuickTitlesFailure(mainWindow, error),
        })

        if (!result.ok) {
            return {
                ok: false,
                error: result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR',
            }
        }

        setQuickTitles([])
        return {
            ok: true,
            path: filePath,
        }
    } catch (error) {
        return {
            ok: false,
            error: getErrorMessage(error),
        }
    }
}

export function registerQuickTitlesHandlers(mainWindow: BrowserWindow): void {
    ipcMain.handle(IPC_CHANNELS.QUICK_TITLES_READ_CSV, async () => {
        const result = await readQuickTitlesCsvContent(mainWindow)
        if (result.ok) {
            const readResult = await readQuickTitlesCsv({
                filePath: result.path,
                onError: (error) => notifyQuickTitlesFailure(mainWindow, error),
            })
            if (readResult.ok) {
                setQuickTitles(readResult.quickTitles)
            }
        }
        return result
    })

    ipcMain.handle(IPC_CHANNELS.QUICK_TITLES_WRITE_CSV, async (_event, request: unknown) => {
        return writeQuickTitlesCsvContent({
            mainWindow,
            content: (request as { content?: unknown } | null)?.content,
        })
    })

    ipcMain.handle(IPC_CHANNELS.QUICK_TITLES_CLEAR_CSV, async () => clearQuickTitlesCsv(mainWindow))
}
