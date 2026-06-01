type TedUnsavedChangesDialogProps = {
    open: boolean
    onCancel: () => void
    onExitWithoutSaving: () => void
    onSaveAndExit: () => void
    isSaving?: boolean
    error?: string
}

export function TedUnsavedChangesDialog({
    open,
    onCancel,
    onExitWithoutSaving,
    onSaveAndExit,
    isSaving = false,
    error,
}: TedUnsavedChangesDialogProps) {
    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ted-unsaved-dialog-title"
                className="w-full max-w-md rounded border bg-white p-4 shadow-lg"
            >
                <h2 id="ted-unsaved-dialog-title" className="font-semibold text-gray-900">
                    Ai modificări nesalvate în template.
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Vrei să salvezi modificările înainte de a ieși din Template Editor?
                </p>
                {error && (
                    <div
                        role="alert"
                        className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                        Anulează
                    </button>
                    <button
                        type="button"
                        onClick={onExitWithoutSaving}
                        disabled={isSaving}
                        className="rounded border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                        Ieși fără salvare
                    </button>
                    <button
                        type="button"
                        onClick={onSaveAndExit}
                        disabled={isSaving}
                        className="rounded bg-blue-700 px-3 py-1 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                        {isSaving ? 'Se salvează...' : 'Salvează și ieși'}
                    </button>
                </div>
            </div>
        </div>
    )
}
