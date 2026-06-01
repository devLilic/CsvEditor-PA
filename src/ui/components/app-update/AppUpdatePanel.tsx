import { getUpdateStatusMessage, isBusyUpdateStatus } from '@/features/app-update/domain/updateStatus'
import { useAppUpdate } from '@/features/app-update/hooks/useAppUpdate'

function getErrorMessage(error: string): string {
    if (error === 'UPDATE_ONLY_AVAILABLE_IN_PACKAGED_APP') {
        return 'Actualizarile sunt disponibile doar in aplicatia instalata, nu in modul development.'
    }

    if (/publisher|sign|signature|certificate|certificat|semn/i.test(error)) {
        return 'Actualizarea nu a putut fi instalata. Verifica daca installerul poate rula pe acest calculator.'
    }

    return error
}

export function AppUpdatePanel() {
    const {
        currentVersion,
        status,
        availableVersion,
        error,
        progress,
        checkForUpdates,
        downloadUpdate,
        installUpdate,
    } = useAppUpdate()
    const isBusy = isBusyUpdateStatus(status)
    const canDownload = status.type === 'available' && Boolean(availableVersion)
    const canInstall = status.type === 'downloaded'

    return (
        <section className="flex flex-col gap-4 rounded bg-white p-5 shadow-sm">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    Actualizari aplicatie
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    Versiune curenta: {currentVersion || 'se incarca...'}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={checkForUpdates}
                    disabled={isBusy}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Verifica actualizari
                </button>

                {canDownload && (
                    <button
                        type="button"
                        onClick={downloadUpdate}
                        disabled={isBusy}
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Descarca update
                    </button>
                )}

                {canInstall && (
                    <button
                        type="button"
                        onClick={installUpdate}
                        className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        Instaleaza si reporneste
                    </button>
                )}
            </div>

            {availableVersion && status.type === 'available' && (
                <p className="text-sm text-gray-700">
                    Versiune noua disponibila: {availableVersion}
                </p>
            )}

            {status.type === 'downloading' && (
                <p className="text-sm text-gray-700">
                    Se descarca actualizarea: {Math.round(progress?.percent ?? status.percent)}%
                </p>
            )}

            {status.type === 'downloaded' && (
                <p className="text-sm text-green-700">
                    Actualizarea este descarcata.
                </p>
            )}

            {status.type !== 'idle' && status.type !== 'downloading' && status.type !== 'downloaded' && (
                <p className="text-sm text-gray-600">
                    {getUpdateStatusMessage(status)}
                </p>
            )}

            {error && (
                <p className="text-sm text-red-700">
                    Eroare: {getErrorMessage(error)}
                </p>
            )}
        </section>
    )
}
