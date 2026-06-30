import type { RendererApi } from '@/shared/ipc-types'
import { normalizeAndDeduplicateQuickTitles } from '../domain/quickTitle'
import { parseQuickTitlesCsv, serializeQuickTitlesCsv } from '../domain/quickTitlesCsv'

export type LoadQuickTitlesFromCsvResult = {
    ok: boolean
    quickTitles: string[]
    created?: boolean
    error?: string
}

export type SaveQuickTitlesToCsvResult = {
    ok: boolean
    error?: string
}

export type ClearQuickTitlesCsvResult = {
    ok: boolean
    error?: string
}

function getApi(): RendererApi | null {
    return (window as Window & { electronAPI?: RendererApi }).electronAPI ?? null
}

function missingApiError() {
    return 'electronAPI not available'
}

export async function loadQuickTitlesFromCsv(): Promise<LoadQuickTitlesFromCsvResult> {
    const api = getApi()
    if (!api) {
        return {
            ok: false,
            quickTitles: [],
            error: missingApiError(),
        }
    }

    try {
        const result = await api.readQuickTitlesCsv()
        if (!result.ok) {
            return {
                ok: false,
                quickTitles: [],
                error: result.error,
            }
        }

        return {
            ok: true,
            quickTitles: parseQuickTitlesCsv(result.content),
            created: result.created,
        }
    } catch (error) {
        return {
            ok: false,
            quickTitles: [],
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export async function saveQuickTitlesToCsv(
    quickTitles: string[]
): Promise<SaveQuickTitlesToCsvResult> {
    const api = getApi()
    if (!api) {
        return {
            ok: false,
            error: missingApiError(),
        }
    }

    try {
        const normalized = normalizeAndDeduplicateQuickTitles([...quickTitles])
        const result = await api.writeQuickTitlesCsv({
            content: serializeQuickTitlesCsv(normalized),
        })

        if (!result.ok) {
            return {
                ok: false,
                error: result.error,
            }
        }

        return { ok: true }
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

export async function clearQuickTitlesCsv(): Promise<ClearQuickTitlesCsvResult> {
    const api = getApi()
    if (!api) {
        return {
            ok: false,
            error: missingApiError(),
        }
    }

    try {
        const result = await api.clearQuickTitlesCsv()
        if (!result.ok) {
            return {
                ok: false,
                error: result.error,
            }
        }

        return { ok: true }
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}
