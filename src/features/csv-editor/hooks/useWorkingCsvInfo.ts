import { useEffect, useState } from 'react'
import { getFilenameFromPath } from '../domain/pathUtils'
import { csvFileSettingsService } from '../services/csvFileSettingsService'

export type WorkingCsvInfo = {
    filename: string
    path: string
    isConfigured: boolean
}

const UNSET_FILENAME = 'nesetat'

function createWorkingCsvInfo(filePath: string): WorkingCsvInfo {
    const path = filePath.trim()
    const filename = getFilenameFromPath(path)

    return {
        filename: filename || UNSET_FILENAME,
        path,
        isConfigured: Boolean(path),
    }
}

export function useWorkingCsvInfo(): WorkingCsvInfo {
    const [info, setInfo] = useState<WorkingCsvInfo>(() => createWorkingCsvInfo(''))

    useEffect(() => {
        let isMounted = true

        csvFileSettingsService.getCsvFileSettings().then((settings) => {
            if (!isMounted) return
            setInfo(createWorkingCsvInfo(settings.workingCsvPath))
        })

        return () => {
            isMounted = false
        }
    }, [])

    return info
}
