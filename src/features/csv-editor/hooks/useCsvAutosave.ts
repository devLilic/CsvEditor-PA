// features/csv-editor/hooks/useCsvAutosave.ts

import { useEffect, useRef, useCallback } from 'react'
import { useCsvContext } from '../context/CsvContext'
import { csvService } from '../services/csvService'
import { phoneImageSettingsService } from '../services/phoneImageSettingsService'
import { serializeCsv } from '../utils/csvSerializer'
import type { EntitiesState } from '../domain/entities'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'

/**
 * Autosave JSON sigur, debounced.
 * - NU rulează la init
 * - NU face backup automat
 * - Scrie doar când entities se schimbă
 */
export function useCsvAutosave(options?: { debounceMs?: number }) {
    const debounceMs = options?.debounceMs ?? 600

    const { state, dispatch } = useCsvContext()
    const { activeProjectId, activeProject, registerWorkingCopyFlusher } = useTemplateDocument()

    const isFirstRunRef = useRef(true)
    const debounceTimerRef = useRef<number | null>(null)
    const lastSerializedRef = useRef<string>('')
    const lastEntitiesSnapshotRef = useRef('')
    const phoneImageWorkPathRef = useRef('')
    const activeProjectIdRef = useRef(activeProjectId)
    activeProjectIdRef.current = activeProjectId

    const serializeForDisk = useCallback(
        (entities: EntitiesState) => serializeCsv(entities, {
            phoneImageWorkPath: phoneImageWorkPathRef.current,
        }),
        []
    )

    useEffect(() => {
        let isMounted = true

        phoneImageSettingsService.getPhoneImageSettings(activeProjectId).then((settings) => {
            if (isMounted) {
                phoneImageWorkPathRef.current = settings.workPath
            }
        })

        return () => {
            isMounted = false
        }
    }, [activeProjectId])

    const flush = useCallback(async (projectId = activeProjectIdRef.current): Promise<{
        ok: boolean
        error?: string
        snapshot?: { content: string; entities: EntitiesState }
    }> => {
        if (!projectId || !state.isLoaded) return { ok: true }
        const entities = state.entities
        const content = serializeForDisk(entities)
        const snapshot = { content, entities }
        const entitiesSnapshot = JSON.stringify(entities)
        if (content === lastSerializedRef.current && entitiesSnapshot === lastEntitiesSnapshotRef.current) {
            return { ok: true, snapshot }
        }

        const projectTypes = (activeProject as any)?.id === projectId
            ? (activeProject as any)?.lowerThirdTypes
            : undefined
        const lowerThirdTypes = Array.isArray(projectTypes) ? projectTypes : DEFAULT_LOWER_THIRD_TYPES
        const res = await csvService.write(content, entities, lowerThirdTypes, projectId)
        if (!res.ok) return { ok: false, error: res.error ?? 'CSV_WRITE_FAILED' }
        lastSerializedRef.current = content
        lastEntitiesSnapshotRef.current = entitiesSnapshot
        return { ok: true, snapshot }
    }, [activeProject, serializeForDisk, state.entities, state.isLoaded])

    useEffect(() => registerWorkingCopyFlusher((projectId) => flush(projectId)), [flush, registerWorkingCopyFlusher])

    // ---- AUTOSAVE ----
    useEffect(() => {
        if (!state.isLoaded) return

        // Evită autosave imediat după CSV_LOADED
        if (isFirstRunRef.current) {
            isFirstRunRef.current = false
            lastSerializedRef.current = serializeForDisk(state.entities)
            lastEntitiesSnapshotRef.current = JSON.stringify(state.entities)
            return
        }

        // debounce
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current)
        }

        const capturedProjectId = activeProjectId
        debounceTimerRef.current = window.setTimeout(async () => {
            const result = await flush(capturedProjectId)
            if (!result.ok) console.error('Autosave failed:', result.error)
        }, debounceMs)

        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
        }
    }, [activeProjectId, state.entities, state.isLoaded, debounceMs, flush])

    // ---- OPERAȚII DESTRUCTIVE SIGURE ----

    /**
     * Clear total:
     * 1) backup JSON curent
     * 2) reset state
     * 3) persistă proiectul gol și actualizează exporturile
     */
    const clearAllSafely = useCallback(
        async (nextEmptyEntities: EntitiesState) => {
            const currentSnapshot = JSON.stringify({ version: 1, entities: state.entities }, null, 2)

            // 1️⃣ backup JSON
            const projectId = activeProjectIdRef.current
            const backupRes = await csvService.backup(currentSnapshot, projectId)
            if (!backupRes.ok) {
                console.error('Backup failed:', backupRes.error)
                // decizie: continuăm sau nu
                // aici continuăm, dar UI poate cere confirmare
            }

            // 2️⃣ reset state
            dispatch({
                type: 'ENTITY_CLEAR_ALL',
                payload: nextEmptyEntities,
            })

            // 3️⃣ persistă proiectul gol
            const emptyCsv = serializeForDisk(nextEmptyEntities)
            const lowerThirdTypes = (activeProject as any)?.lowerThirdTypes ?? DEFAULT_LOWER_THIRD_TYPES
            const writeRes = await csvService.write(emptyCsv, nextEmptyEntities, lowerThirdTypes, projectId)
            if (!writeRes.ok) {
                console.error('Failed to write empty CSV:', writeRes.error)
            }

            lastSerializedRef.current = emptyCsv
            lastEntitiesSnapshotRef.current = JSON.stringify(nextEmptyEntities)
        },
        [activeProject, dispatch, serializeForDisk, state.entities]
    )

    return {
        clearAllSafely,
        flush,
    }
}
