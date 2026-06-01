type BackupFailedDialogProps = {
    open: boolean
    error?: string
    onCancel: () => void
    onContinueWithoutBackup: () => void
}

export function BackupFailedDialog({
    open,
    error,
    onCancel,
    onContinueWithoutBackup,
}: BackupFailedDialogProps) {
    if (!open) {
        return null
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-failed-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="w-full max-w-md rounded bg-white p-5 shadow-lg">
                <h2 id="backup-failed-title" className="text-lg font-semibold text-gray-900">
                    Backup CSV nu a putut fi creat.
                </h2>

                <p className="mt-3 text-sm text-gray-700">
                    Proiectul curent nu a fost resetat încă.
                    Poți reveni pentru a verifica setările folderului de backup sau poți continua fără backup.
                </p>

                {error && (
                    <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {error}
                    </p>
                )}

                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Revino
                    </button>

                    <button
                        type="button"
                        onClick={onContinueWithoutBackup}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Continuă fără backup
                    </button>
                </div>
            </div>
        </div>
    )
}
