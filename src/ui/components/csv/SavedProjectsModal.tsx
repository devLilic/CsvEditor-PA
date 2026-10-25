import { useEffect, useState } from 'react'
import type { CsvProjectFileInfo } from '@/shared/ipc-types'
import { savedProjectsService } from '@/features/csv-editor/services/savedProjectsService'
import { ConfirmDialog } from '@/ui/components/common/ConfirmDialog'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

type SavedProjectsModalProps = {
    open: boolean
    onClose: () => void
    onProjectLoaded: (content: string) => void
}

export function SavedProjectsModal({
    open,
    onClose,
    onProjectLoaded,
}: SavedProjectsModalProps) {
    const { flushWorkingCopy, activeProjectId } = useTemplateDocument()
    const [files, setFiles] = useState<CsvProjectFileInfo[]>([])
    const [status, setStatus] = useState<string | null>(null)
    const [isBusy, setIsBusy] = useState(false)

    const loadProjects = async () => {
        setStatus(null)
        const result = await savedProjectsService.listSavedProjects(activeProjectId || undefined)
        if (result.ok) {
            setFiles(result.files)
            return
        }

        setFiles([])
        setStatus(result.error ?? 'Nu s-au putut încărca edițiile salvate.')
    }

    useEffect(() => {
        if (!open) return

        void loadProjects()
    }, [open])

    if (!open) {
        return null
    }

    const handleLoad = async (filename: string) => {
        const capturedProjectId = activeProjectId
        setIsBusy(true)
        setStatus(null)

        const flushed = await flushWorkingCopy()
        if (!flushed.ok) {
            setIsBusy(false)
            setStatus(flushed.error ?? 'Ediția curentă nu a putut fi salvată înainte de încărcare.')
            return
        }

        const result = capturedProjectId
            ? await savedProjectsService.loadProjectIntoWorkingCsv({ filename }, capturedProjectId)
            : await savedProjectsService.loadProjectIntoWorkingCsv({ filename })

        setIsBusy(false)

        if (!result.ok || typeof result.content !== 'string') {
            setStatus(result.error === 'BACKUP_FAILED'
                ? 'Backupul ediției curente nu a putut fi creat. Ediția salvată nu a fost încărcată. Verifică folderul Backup din Setări.'
                : result.error ?? 'Ediția nu a putut fi încărcată.')
            return
        }

        onProjectLoaded(result.content)
        onClose()
    }

    const handleDelete = async (filename: string) => {
        if (!window.confirm(`Ștergi ediția salvată ${filename}?`)) {
            return
        }

        setIsBusy(true)
        setStatus(null)

        const result = activeProjectId
            ? await savedProjectsService.deleteSavedProject({ filename }, activeProjectId)
            : await savedProjectsService.deleteSavedProject({ filename })

        setIsBusy(false)

        if (!result.ok) {
            setStatus(result.error ?? 'Ediția salvată nu a putut fi ștearsă.')
            return
        }

        await loadProjects()
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-projects-title"
            className="app-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="app-modal flex max-h-[85vh] w-full max-w-2xl flex-col rounded bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                    <h2 id="saved-projects-title" className="text-lg font-semibold text-gray-900">
                        Ediții salvate
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="app-button rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Închide
                    </button>
                </div>

                {status && (
                    <div role="alert" className="app-notification app-notification-danger mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {status}
                    </div>
                )}

                <div className="mt-5 min-h-0 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-900">Listă ediții salvate</h3>

                    {files.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">Nu există ediții salvate.</p>
                    ) : (
                        <ul className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
                            {files.map((file) => (
                                <li key={file.fullPath} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                                    <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                                        {file.filename}
                                    </span>

                                    <div className="flex shrink-0 gap-2">
                                        <ConfirmDialog
                                            title="Încarci această ediție?"
                                            description="Ediția curentă va fi salvată în Backup, apoi ediția selectată va deveni activă."
                                            confirmLabel="Încarcă"
                                            cancelLabel="Anulează"
                                            onConfirm={() => handleLoad(file.filename)}
                                        >
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                className="app-button rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Încarcă ediția
                                            </button>
                                        </ConfirmDialog>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(file.filename)}
                                            disabled={isBusy}
                                            className="app-button app-button-danger rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Șterge
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
