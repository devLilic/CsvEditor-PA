// features/csv-editor/hooks/useCsvAutosave.ts

import { useEffect, useRef, useCallback, useState } from 'react'
import { useCsvContext } from '../context/CsvContext'
import { csvService } from '../services/csvService'
import { phoneImageSettingsService } from '../services/phoneImageSettingsService'
import { serializeCsv } from '../utils/csvSerializer'
import type { EntitiesState } from '../domain/entities'

/**
 * Autosave sigur, debounced.
 * - NU rulează la init
 * - NU face backup automat
 * - Scrie doar când entities se schimbă
 */
export function useCsvAutosave(options?: { debounceMs?: number }) {
    const debounceMs = options?.debounceMs ?? 600

    const { state, dispatch } = useCsvContext()

    const isFirstRunRef = useRef(true)
    const debounceTimerRef = useRef<number | null>(null)
    const lastSerializedRef = useRef<string>('')
    const phoneImageWorkPathRef = useRef('')
    const [phoneImageWorkPath, setPhoneImageWorkPath] = useState('')

    const serializeForDisk = useCallback(
        (entities: EntitiesState) => serializeCsv(entities, {
            phoneImageWorkPath: phoneImageWorkPathRef.current,
        }),
        [phoneImageWorkPath]
    )

    useEffect(() => {
        let isMounted = true

        phoneImageSettingsService.getPhoneImageSettings().then((settings) => {
            if (isMounted) {
                phoneImageWorkPathRef.current = settings.workPath
                setPhoneImageWorkPath(settings.workPath)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    // ---- AUTOSAVE ----
    useEffect(() => {
        if (!state.isLoaded) return

        // Evită autosave imediat după CSV_LOADED
        if (isFirstRunRef.current) {
            isFirstRunRef.current = false
            lastSerializedRef.current = serializeForDisk(state.entities)
            return
        }

        // debounce
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = window.setTimeout(async () => {
            const csv = serializeForDisk(state.entities)

            // evită write dacă nu s-a schimbat nimic real
            if (csv === lastSerializedRef.current) return

            const res = await csvService.write(csv)
            if (res.ok) {
                lastSerializedRef.current = csv
            } else {
                console.error('Autosave failed:', res.error)
            }
        }, debounceMs)

        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = null
            }
        }
    }, [state.entities, state.isLoaded, debounceMs, serializeForDisk])

    // ---- OPERAȚII DESTRUCTIVE SIGURE ----

    /**
     * Clear total:
     * 1) backup CSV curent
     * 2) reset state
     * 3) scrie CSV gol
     */
    const clearAllSafely = useCallback(
        async (nextEmptyEntities: EntitiesState) => {
            const currentCsv = serializeForDisk(state.entities)

            // 1️⃣ backup
            const backupRes = await csvService.backup(currentCsv)
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

            // 3️⃣ scriere CSV gol
            const emptyCsv = serializeForDisk(nextEmptyEntities)
            const writeRes = await csvService.write(emptyCsv)
            if (!writeRes.ok) {
                console.error('Failed to write empty CSV:', writeRes.error)
            }

            lastSerializedRef.current = emptyCsv
        },
        [dispatch, serializeForDisk, state.entities]
    )

    return {
        clearAllSafely,
    }
}
