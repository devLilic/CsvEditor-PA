// features/csv-editor/hooks/useCsvInitialization.ts

import { useEffect, useRef } from 'react'

import { csvService } from '../services/csvService'
import { parseCsv } from '../utils/csvParser'
import { useCsvContext } from '../context/CsvContext'
import { createDefaultProjectEntities } from '../domain/defaultProject'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { csvFileSettingsService } from '../services/csvFileSettingsService'

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
            if (csvFileSettings.workingCsvPath) {
                const workingCsv = await csvService.getWorkingCsv()
                if (workingCsv.ok && workingCsv.content) {
                    const entities = parseCsv(workingCsv.content)
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
