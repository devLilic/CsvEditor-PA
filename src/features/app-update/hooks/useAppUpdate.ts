import { useCallback, useEffect, useState } from 'react'
import type { UpdateStatus } from '../../../shared/ipc-types'
import { appUpdateService } from '../services/appUpdateService'

export interface AppUpdateProgress {
    percent: number
    transferred?: number
    total?: number
}

export interface UseAppUpdateResult {
    currentVersion: string
    status: UpdateStatus
    availableVersion?: string
    error?: string
    progress?: AppUpdateProgress
    checkForUpdates(): Promise<void>
    downloadUpdate(): Promise<void>
    installUpdate(): Promise<void>
}

function getInitialStatus(currentVersion: string): UpdateStatus {
    return {
        type: 'idle',
        currentVersion,
    }
}

export function useAppUpdate(): UseAppUpdateResult {
    const [currentVersion, setCurrentVersion] = useState('')
    const [status, setStatus] = useState<UpdateStatus>(getInitialStatus(''))
    const [availableVersion, setAvailableVersion] = useState<string | undefined>()
    const [error, setError] = useState<string | undefined>()
    const [progress, setProgress] = useState<AppUpdateProgress | undefined>()

    const applyStatus = useCallback((nextStatus: UpdateStatus) => {
        setStatus(nextStatus)

        if ('currentVersion' in nextStatus) {
            setCurrentVersion(nextStatus.currentVersion)
        }

        if (nextStatus.type === 'available') {
            setAvailableVersion(nextStatus.newVersion)
            setError(undefined)
            setProgress(undefined)
            return
        }

        if (nextStatus.type === 'downloading') {
            setProgress({
                percent: nextStatus.percent,
                transferred: nextStatus.transferred,
                total: nextStatus.total,
            })
            setError(undefined)
            return
        }

        if (nextStatus.type === 'downloaded') {
            setAvailableVersion(nextStatus.newVersion)
            setProgress(undefined)
            setError(undefined)
            return
        }

        if (nextStatus.type === 'error') {
            setError(nextStatus.message)
            setProgress(undefined)
            return
        }

        if (nextStatus.type === 'not-available') {
            setAvailableVersion(undefined)
            setProgress(undefined)
            setError(undefined)
        }
    }, [])

    useEffect(() => {
        let isMounted = true

        appUpdateService.getCurrentVersion()
            .then((version) => {
                if (!isMounted) return

                setCurrentVersion(version)
                setStatus(getInitialStatus(version))
            })
            .catch((caughtError: unknown) => {
                if (!isMounted) return

                setError(caughtError instanceof Error ? caughtError.message : 'UNKNOWN_UPDATE_ERROR')
            })

        const unsubscribe = appUpdateService.onUpdateStatus((nextStatus) => {
            if (isMounted) {
                applyStatus(nextStatus)
            }
        })

        return () => {
            isMounted = false
            unsubscribe()
        }
    }, [applyStatus])

    const checkForUpdates = useCallback(async () => {
        applyStatus({
            type: 'checking',
            currentVersion,
        })

        const result = await appUpdateService.checkForUpdates()

        if (!result.ok) {
            applyStatus({
                type: 'error',
                message: result.error,
            })
            return
        }

        if (result.status === 'available') {
            applyStatus({
                type: 'available',
                currentVersion: result.currentVersion,
                newVersion: result.newVersion,
                releaseNotes: result.releaseNotes,
            })
            return
        }

        applyStatus({
            type: 'not-available',
            currentVersion: result.currentVersion,
        })
    }, [applyStatus, currentVersion])

    const downloadUpdate = useCallback(async () => {
        const result = await appUpdateService.downloadUpdate()

        if (!result.ok) {
            applyStatus({
                type: 'error',
                message: result.error,
            })
        }
    }, [applyStatus])

    const installUpdate = useCallback(async () => {
        try {
            await appUpdateService.installUpdate()
        } catch (caughtError) {
            applyStatus({
                type: 'error',
                message: caughtError instanceof Error ? caughtError.message : 'UNKNOWN_UPDATE_ERROR',
            })
        }
    }, [applyStatus])

    return {
        currentVersion,
        status,
        availableVersion,
        error,
        progress,
        checkForUpdates,
        downloadUpdate,
        installUpdate,
    }
}
