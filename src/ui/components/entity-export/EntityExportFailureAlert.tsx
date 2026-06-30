import { useEffect, useState } from 'react'
import type { EntityExportFailureNotification, RendererApi } from '@/shared/ipc-types'

const EXPORT_FAILURE_MESSAGE = [
    'Nu s-a putut actualiza fisierul CSV pentru emisie.',
    'Verifica folderul de export sau conexiunea la disc.',
].join('\n')

const QUICK_TITLES_FAILURE_MESSAGE = [
    'Quick Titles nu au putut fi salvate in PA_quickTitles.csv.',
    'Verifica folderul de export si accesul la fisier.',
].join('\n')

function getElectronApi(): RendererApi | undefined {
    return (window as Window & { electronAPI?: RendererApi }).electronAPI
}

function getFailureMessage(notification: EntityExportFailureNotification): string {
    return notification.kind === 'quickTitles'
        ? QUICK_TITLES_FAILURE_MESSAGE
        : EXPORT_FAILURE_MESSAGE
}

export function EntityExportFailureAlert() {
    const [notification, setNotification] = useState<EntityExportFailureNotification | null>(null)

    useEffect(() => {
        const unsubscribe = getElectronApi()?.onEntityExportError?.((nextNotification) => {
            setNotification(nextNotification)
        })

        return () => {
            unsubscribe?.()
        }
    }, [])

    if (!notification) {
        return null
    }

    return (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
            <div
                role="alert"
                className="w-full max-w-2xl rounded border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="whitespace-pre-line font-semibold">{getFailureMessage(notification)}</p>
                        <p className="break-all text-xs text-red-800">
                            Fisier: {notification.filePath}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                    >
                        Inchide
                    </button>
                </div>
            </div>
        </div>
    )
}
