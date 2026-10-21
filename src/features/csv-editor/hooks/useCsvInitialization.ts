// features/csv-editor/hooks/useCsvInitialization.ts

import { useEffect, useRef } from 'react'

import { csvService } from '../services/csvService'
import { parseCsv } from '../utils/csvParser'
import { useCsvContext } from '../context/CsvContext'
import { createDefaultProjectEntities } from '../domain/defaultProject'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { csvFileSettingsService } from '../services/csvFileSettingsService'
import { titleBackupReservationService } from '@/features/title-backup/services/titleBackupReservationService'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import { restoreLowerThirdAssignments, migrateHotTitlesToUrgent } from '@/features/lower-thirds/domain/lowerThirdAssignments'

/**
 * Hook responsabil exclusiv de initializarea CSV:
 * - citeste workingCsvPath din setari
 * - daca este configurat, incearca getWorkingCsv()
 * - parse CSV
 * - dispatch CSV_LOADED
 *
 * NU autosave
 * NU UI logic
 * NU Electron direct
 */
export function useCsvInitialization() {
    const { dispatch, state } = useCsvContext()
    const hasInitializedRef = useRef(false)

    useEffect(() => {
        if (state.isLoaded) return
        if (hasInitializedRef.current) return

        hasInitializedRef.current = true

        ;(async () => {
            const csvFileSettings = await csvFileSettingsService.getCsvFileSettings()
            const titleBackupReservation = await titleBackupReservationService.reserveActiveTitleBackup(false)
            if (!titleBackupReservation.ok) {
                console.error('Failed to reserve title backup:', titleBackupReservation.error)
            }

            if (csvFileSettings.workingCsvPath) {
                const workingCsv = await csvService.getWorkingCsv()
                if (workingCsv.ok && workingCsv.content) {
                    const lowerThirdTypes = await lowerThirdTypesService.get()
                    const entities = restoreLowerThirdAssignments({
                        entities: migrateHotTitlesToUrgent(parseCsv(workingCsv.content)),
                        titlesExport: workingCsv.previousExports?.titles,
                        personsExport: workingCsv.previousExports?.persons,
                        types: lowerThirdTypes,
                        onWarning: (message) => console.warn('[lower-thirds]', message),
                    })
                    dispatch({
                        type: 'CSV_LOADED',
                        payload: entities,
                    })
                    return
                }
            }

            const defaultProjectSettings = await defaultProjectSettingsService.getDefaultProjectSettings()

            dispatch({
                type: 'CSV_LOADED',
                payload: createDefaultProjectEntities(defaultProjectSettings),
            })
        })()
    }, [dispatch, state.isLoaded])
}
