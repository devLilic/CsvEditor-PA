// src/features/csv-editor/hooks/useQuickTitles.ts
import { useEffect, useState, useCallback, useRef } from 'react'
import { settingsService } from '../services/settingsService'
import {
    clearQuickTitlesCsv,
    loadQuickTitlesFromCsv,
    saveQuickTitlesToCsv,
} from '../../quick-titles/services/quickTitlesCsvStorageService'
import { normalizeAndDeduplicateQuickTitles } from '../../quick-titles/domain/quickTitle'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

async function mirrorLegacyQuickTitles(list: string[], projectId: string): Promise<void> {
    await settingsService.setQuickTitles(list, projectId)
}

async function persistQuickTitles(list: string[], projectId: string): Promise<void> {
    const normalized = normalizeAndDeduplicateQuickTitles(list)
    const result = await saveQuickTitlesToCsv(normalized, projectId)
    if (!result.ok) {
        throw new Error(result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR')
    }

    mirrorLegacyQuickTitles(normalized, projectId).catch((error) =>
        console.error('Failed to mirror quickTitles legacy cache:', error)
    )
}

export function useQuickTitles() {
    const { activeProjectId } = useTemplateDocument()
    const [quickTitles, setQuickTitlesState] = useState<string[]>([])
    const [isLoaded, setIsLoaded] = useState(false)
    const [loadedProjectId, setLoadedProjectId] = useState(activeProjectId)
    const quickTitlesRef = useRef<string[]>([])
    const projectIdRef = useRef(activeProjectId)
    projectIdRef.current = activeProjectId

    const commitQuickTitles = useCallback((titles: string[]) => {
        const normalized = normalizeAndDeduplicateQuickTitles(titles)
        quickTitlesRef.current = normalized
        setQuickTitlesState(normalized)
        return normalized
    }, [])

    const reloadQuickTitles = useCallback(async () => {
        const capturedProjectId = projectIdRef.current
        if (!capturedProjectId) return
        setIsLoaded(false)
        const result = await loadQuickTitlesFromCsv(capturedProjectId)
        // The CSV read may finish after the active show changed. Do not copy its data into
        // this hook's current state or mirror it under a different project.
        if (projectIdRef.current !== capturedProjectId) return
        const list = result.ok ? normalizeAndDeduplicateQuickTitles(result.quickTitles) : []
        commitQuickTitles(list)
        setLoadedProjectId(capturedProjectId)
        setIsLoaded(true)
        mirrorLegacyQuickTitles(list, capturedProjectId).catch((error) =>
            console.error('Failed to mirror quickTitles legacy cache:', error)
        )
    }, [commitQuickTitles])

    useEffect(() => {
        quickTitlesRef.current = []
        setQuickTitlesState([])
        setIsLoaded(false)
        setLoadedProjectId(activeProjectId)
        const unsubscribeQuickTitles = settingsService.subscribeQuickTitles((titles, showProjectId) => {
            if (!showProjectId || showProjectId !== projectIdRef.current) return
            commitQuickTitles(titles)
            setLoadedProjectId(showProjectId)
            setIsLoaded(true)
        })
        void reloadQuickTitles()
        return unsubscribeQuickTitles
    }, [activeProjectId, commitQuickTitles, reloadQuickTitles])

    const addQuickTitle = useCallback(async (title: string) => {
        const trimmed = title.trim()
        const projectId = projectIdRef.current
        if (!trimmed || !projectId) return
        const next = normalizeAndDeduplicateQuickTitles([...quickTitlesRef.current, trimmed])
        commitQuickTitles(next)
        await persistQuickTitles(next, projectId).catch((error) =>
            console.error('Failed to persist quickTitles (add):', error)
        )
    }, [commitQuickTitles])

    const removeQuickTitle = useCallback(async (title: string) => {
        const projectId = projectIdRef.current
        if (!projectId) return
        const next = normalizeAndDeduplicateQuickTitles(quickTitlesRef.current.filter((item) => item !== title))
        commitQuickTitles(next)
        await persistQuickTitles(next, projectId).catch((error) =>
            console.error('Failed to persist quickTitles (remove):', error)
        )
    }, [commitQuickTitles])

    const updateQuickTitle = useCallback(async (currentTitle: string, nextTitle: string) => {
        const current = currentTitle.trim()
        const nextValue = nextTitle.trim()
        const projectId = projectIdRef.current
        if (!current || !nextValue || !projectId) return
        const index = quickTitlesRef.current.findIndex((title) => title === currentTitle)
        if (index < 0) return
        const next = [...quickTitlesRef.current]
        next[index] = nextValue
        const normalized = normalizeAndDeduplicateQuickTitles(next)
        commitQuickTitles(normalized)
        await persistQuickTitles(normalized, projectId).catch((error) =>
            console.error('Failed to persist quickTitles (update):', error)
        )
    }, [commitQuickTitles])

    const setAllQuickTitles = useCallback(async (titles: string[]) => {
        const projectId = projectIdRef.current
        if (!projectId) return
        const safe = normalizeAndDeduplicateQuickTitles(Array.isArray(titles) ? titles : [])
        commitQuickTitles(safe)
        await persistQuickTitles(safe, projectId)
    }, [commitQuickTitles])

    const clearQuickTitles = useCallback(async () => {
        const projectId = projectIdRef.current
        if (!projectId) return
        commitQuickTitles([])
        const result = await clearQuickTitlesCsv(projectId)
        if (!result.ok) {
            throw new Error(result.error ?? 'UNKNOWN_QUICK_TITLES_CSV_ERROR')
        }
        mirrorLegacyQuickTitles([], projectId).catch((error) =>
            console.error('Failed to mirror quickTitles legacy cache:', error)
        )
    }, [commitQuickTitles])

    return {
        quickTitles: loadedProjectId === activeProjectId ? quickTitles : [],
        isLoaded: loadedProjectId === activeProjectId && isLoaded,
        addQuickTitle,
        removeQuickTitle,
        updateQuickTitle,
        setAllQuickTitles,
        clearQuickTitles,
        reloadQuickTitles,
    }
}
