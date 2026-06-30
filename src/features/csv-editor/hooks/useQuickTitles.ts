// src/features/csv-editor/hooks/useQuickTitles.ts
import { useEffect, useState, useCallback, useRef } from 'react'
import { settingsService } from '../services/settingsService'
import { csvFileSettingsService } from '../services/csvFileSettingsService'
import type { CsvFileSettings } from '../domain/csvFileSettings'
import {
    clearQuickTitlesCsv,
    loadQuickTitlesFromCsv,
    saveQuickTitlesToCsv,
} from '../../quick-titles/services/quickTitlesCsvStorageService'
import { normalizeAndDeduplicateQuickTitles } from '../../quick-titles/domain/quickTitle'

let cachedQuickTitles: string[] = []
let hasLoadedQuickTitles = false

function hasQuickTitlesCsvPathChanged(
    previous: CsvFileSettings | null,
    next: CsvFileSettings
): boolean {
    if (!previous) return true

    return previous.exportCsvFolderPath !== next.exportCsvFolderPath
        || previous.workingCsvPath !== next.workingCsvPath
}

async function mirrorLegacyQuickTitles(list: string[]): Promise<void> {
    await settingsService.setQuickTitles(list)
}

async function persistQuickTitles(list: string[]): Promise<void> {
    const normalized = normalizeAndDeduplicateQuickTitles(list)
    const result = await saveQuickTitlesToCsv(normalized)
    if (!result.ok) {
        throw new Error(result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR')
    }

    mirrorLegacyQuickTitles(normalized).catch((error) =>
        console.error('Failed to mirror quickTitles legacy cache:', error)
    )
}

export function useQuickTitles() {
    const [quickTitles, setQuickTitlesState] = useState<string[]>(cachedQuickTitles)
    const isLoadedRef = useRef(hasLoadedQuickTitles)
    const csvFileSettingsRef = useRef<CsvFileSettings | null>(null)

    const setQuickTitles = useCallback((titles: string[] | ((prev: string[]) => string[])) => {
        setQuickTitlesState((prev) => {
            const next = typeof titles === 'function' ? titles(prev) : titles
            cachedQuickTitles = next
            return next
        })
    }, [])

    const reloadQuickTitles = useCallback(async () => {
        const result = await loadQuickTitlesFromCsv()
        const list = result.ok ? result.quickTitles : []
        hasLoadedQuickTitles = true
        setQuickTitles(list)
        isLoadedRef.current = true
        mirrorLegacyQuickTitles(list).catch((error) =>
            console.error('Failed to mirror quickTitles legacy cache:', error)
        )
    }, [setQuickTitles])

    useEffect(() => {
        const unsubscribeQuickTitles = settingsService.subscribeQuickTitles((titles) => {
            hasLoadedQuickTitles = true
            isLoadedRef.current = true
            setQuickTitles(titles)
        })

        const unsubscribeCsvFileSettings = csvFileSettingsService.subscribeCsvFileSettings((settings) => {
            if (!hasQuickTitlesCsvPathChanged(csvFileSettingsRef.current, settings)) {
                return
            }

            csvFileSettingsRef.current = settings
            reloadQuickTitles().catch((error) =>
                console.error('Failed to reload quickTitles after CSV file settings changed:', error)
            )
        })

        // External PC-to-PC synchronization is intentionally pull-based in this version.
        // PA_quickTitles.csv is reread when this hook mounts during app start/restart,
        // when the export/working CSV settings change, or when callers use reloadQuickTitles().
        // Do not add polling or filesystem watchers here without a dedicated product requirement.
        void csvFileSettingsService.getCsvFileSettings().then((settings) => {
            csvFileSettingsRef.current = settings
        })

        void reloadQuickTitles()

        return () => {
            unsubscribeQuickTitles()
            unsubscribeCsvFileSettings()
        }
    }, [reloadQuickTitles, setQuickTitles])

    const addQuickTitle = useCallback(async (title: string) => {
        const trimmed = title.trim()
        if (!trimmed) return

        setQuickTitles((prev) => {
            const next = normalizeAndDeduplicateQuickTitles([...prev, trimmed])
            persistQuickTitles(next).catch((error) =>
                console.error('Failed to persist quickTitles (add):', error)
            )
            return next
        })
    }, [setQuickTitles])

    const removeQuickTitle = useCallback(async (title: string) => {
        setQuickTitles((prev) => {
            const next = normalizeAndDeduplicateQuickTitles(prev.filter((t) => t !== title))
            persistQuickTitles(next).catch((error) =>
                console.error('Failed to persist quickTitles (remove):', error)
            )
            return next
        })
    }, [setQuickTitles])

    const updateQuickTitle = useCallback(async (currentTitle: string, nextTitle: string) => {
        const current = currentTitle.trim()
        const nextValue = nextTitle.trim()
        if (!current || !nextValue) return

        setQuickTitles((prev) => {
            const index = prev.findIndex((title) => title === currentTitle)
            if (index < 0) {
                return prev
            }

            const next = [...prev]
            next[index] = nextValue
            const normalized = normalizeAndDeduplicateQuickTitles(next)
            persistQuickTitles(normalized).catch((error) =>
                console.error('Failed to persist quickTitles (update):', error)
            )
            return normalized
        })
    }, [setQuickTitles])

    const setAllQuickTitles = useCallback(async (titles: string[]) => {
        const safe = normalizeAndDeduplicateQuickTitles(Array.isArray(titles) ? titles : [])
        setQuickTitles(safe)
        await persistQuickTitles(safe)
    }, [setQuickTitles])

    const clearQuickTitles = useCallback(async () => {
        setQuickTitles([])
        const result = await clearQuickTitlesCsv()
        if (!result.ok) {
            throw new Error(result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR')
        }
        mirrorLegacyQuickTitles([]).catch((error) =>
            console.error('Failed to mirror quickTitles legacy cache:', error)
        )
    }, [setQuickTitles])

    return {
        quickTitles,
        isLoaded: isLoadedRef.current,

        addQuickTitle,
        removeQuickTitle,
        updateQuickTitle,
        setAllQuickTitles,

        clearQuickTitles,
        reloadQuickTitles,
    }
}
