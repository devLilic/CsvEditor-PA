// features/csv-editor/hooks/useCsvInitialization.ts

import { useEffect, useRef } from 'react'

import { csvService } from '../services/csvService'
import { parseCsv } from '../utils/csvParser'
import { useCsvContext } from '../context/CsvContext'
import { createDefaultProjectEntities } from '../domain/defaultProject'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../domain/defaultProjectSettings'
import { titleBackupReservationService } from '@/features/title-backup/services/titleBackupReservationService'
import { restoreLowerThirdAssignments, migrateHotTitlesToUrgent } from '@/features/lower-thirds/domain/lowerThirdAssignments'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { applyTemplateTextTransformsToEntities } from '@/features/entity-export/domain/entityTemplateFieldValues'

/**
 * Hook responsabil exclusiv de initializarea CSV:
 * - citește proiectul din folderul de lucru configurat (sau din workingCsvPath legacy)
 * - dacă există o cale configurată, încearcă getWorkingCsv()
 * - parse CSV
 * - dispatch CSV_LOADED
 *
 * NU autosave
 * NU UI logic
 * NU Electron direct
 */
export function useCsvInitialization() {
    const { dispatch, state, workingCopyError, setWorkingCopyError, initializationAttempt } = useCsvContext()
    const { activeProjectId, activeProject, workspaces, isLoaded: areShowsLoaded } = useTemplateDocument()
    const hasInitializedRef = useRef(false)

    useEffect(() => {
        if (state.isLoaded || !areShowsLoaded || !activeProjectId) return
        if (hasInitializedRef.current) return
        const workspacePath = workspaces[activeProjectId]
        if (!workspacePath) return

        hasInitializedRef.current = true
        let isCurrent = true

        ;(async () => {
            const workingCsv = await csvService.getWorkingCsv(activeProjectId)
            if (!isCurrent) return

            let entities: ReturnType<typeof parseCsv> | null = null
            if (workingCsv.ok && workingCsv.entities) {
                // JSON edition metadata is authoritative. Reconstructing assignments from
                // exports here would overwrite IDs when a show disables a variant.
                entities = workingCsv.entities
            } else if (workingCsv.ok && typeof workingCsv.content === 'string') {
                // Legacy CSV has no assignment metadata, so recover it from prior exports.
                const lowerThirdTypes = (activeProject as any)?.lowerThirdTypes ?? DEFAULT_LOWER_THIRD_TYPES
                entities = restoreLowerThirdAssignments({
                    entities: migrateHotTitlesToUrgent(parseCsv(workingCsv.content)),
                    titlesExport: workingCsv.previousExports?.titles,
                    personsExport: workingCsv.previousExports?.persons,
                    types: lowerThirdTypes,
                    exportPrefix: (activeProject as any)?.exportPrefix ?? '',
                    onWarning: (message) => console.warn('[lower-thirds]', message),
                })
            } else if (!workingCsv.ok && workingCsv.error !== 'NO_SAVED_PROJECT_STATE'
                && workingCsv.error !== 'No saved project state found') {
                hasInitializedRef.current = false
                setWorkingCopyError(workingCsv.error ?? 'WORKING_COPY_READ_FAILED')
                return
            }

            if (!entities) {
                const defaultProjectSettings = (activeProject as any)?.defaultProjectSettings
                    ?? FALLBACK_DEFAULT_PROJECT_SETTINGS
                entities = createDefaultProjectEntities(defaultProjectSettings)
            }

            if (activeProject?.document) {
                entities = applyTemplateTextTransformsToEntities(entities, {
                    ...activeProject.document,
                    lowerThirdTypesEnabled: activeProject.lowerThirdTypesEnabled,
                })
            }

            const titleBackupReservation = await titleBackupReservationService.reserveActiveTitleBackup(false, activeProjectId)
            if (!titleBackupReservation.ok) {
                console.error('Failed to reserve title backup:', titleBackupReservation.error)
            }
            if (!isCurrent) return
            setWorkingCopyError(null)
            dispatch({ type: 'CSV_LOADED', payload: entities })
        })()
        return () => {
            isCurrent = false
            hasInitializedRef.current = false
        }
    }, [activeProject, activeProjectId, areShowsLoaded, dispatch, initializationAttempt, setWorkingCopyError, state.isLoaded, workspaces])
}
