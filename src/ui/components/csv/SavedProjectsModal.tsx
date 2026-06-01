import { useEffect, useState } from 'react'
import type { CsvProjectFileInfo } from '@/shared/ipc-types'
import { savedProjectsService } from '@/features/csv-editor/services/savedProjectsService'
import { ConfirmDialog } from '@/ui/components/common/ConfirmDialog'

type SavedProjectsModalProps = {
    open: boolean
    currentCsvContent: string
    onClose: () => void
    onProjectLoaded: (content: string) => void
}

export function SavedProjectsModal({
    open,
    currentCsvContent,
    onClose,
    onProjectLoaded,
}: SavedProjectsModalProps) {
    const [files, setFiles] = useState<CsvProjectFileInfo[]>([])
    const [projectName, setProjectName] = useState('')
    const [status, setStatus] = useState<string | null>(null)
    const [isBusy, setIsBusy] = useState(false)

    const loadProjects = async () => {
        setStatus(null)
        const result = await savedProjectsService.listSavedProjects()
        if (result.ok) {
            setFiles(result.files)
            return
        }

        setFiles([])
        setStatus(result.error ?? 'Nu s-au putut încărca proiectele salvate.')
    }

    useEffect(() => {
        if (!open) return

        void loadProjects()
    }, [open])

    if (!open) {
        return null
    }

    const handleSave = async () => {
        setIsBusy(true)
        setStatus(null)

        const result = await savedProjectsService.saveCurrentAsProject({
            filename: projectName,
            content: currentCsvContent,
        })

        setIsBusy(false)

        if (!result.ok) {
            setStatus(result.error === 'FILE_EXISTS'
                ? 'Există deja un proiect salvat cu acest nume.'
                : result.error ?? 'Proiectul nu a putut fi salvat.')
            return
        }

        setProjectName('')
        await loadProjects()
    }

    const handleLoad = async (filename: string) => {
        setIsBusy(true)
        setStatus(null)

        const result = await savedProjectsService.loadProjectIntoWorkingCsv({ filename })

        setIsBusy(false)

        if (!result.ok || typeof result.content !== 'string') {
            setStatus(result.error === 'BACKUP_FAILED'
                ? 'Backup CSV nu a putut fi creat. Proiectul salvat nu a fost încărcat în CSV-ul de lucru. Verifică folderul de backup din Setări.'
                : result.error ?? 'Proiectul nu a putut fi încărcat.')
            return
        }

        onProjectLoaded(result.content)
        onClose()
    }

    const handleDelete = async (filename: string) => {
        if (!window.confirm(`Ștergi proiectul salvat ${filename}?`)) {
            return
        }

        setIsBusy(true)
        setStatus(null)

        const result = await savedProjectsService.deleteSavedProject({ filename })

        setIsBusy(false)

        if (!result.ok) {
            setStatus(result.error ?? 'Proiectul salvat nu a putut fi șters.')
            return
        }

        await loadProjects()
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-projects-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded bg-white p-5 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                    <h2 id="saved-projects-title" className="text-lg font-semibold text-gray-900">
                        Proiecte salvate
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Închide
                    </button>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-700">Salvează proiectul curent ca...</span>
                        <input
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isBusy}
                        className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Salvează
                    </button>
                </div>

                {status && (
                    <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {status}
                    </div>
                )}

                <div className="mt-5 min-h-0 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-900">Listă proiecte salvate</h3>

                    {files.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-600">Nu există proiecte salvate.</p>
                    ) : (
                        <ul className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
                            {files.map((file) => (
                                <li key={file.fullPath} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                                    <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                                        {file.filename}
                                    </span>

                                    <div className="flex shrink-0 gap-2">
                                        <ConfirmDialog
                                            title="Încarci acest proiect în CSV-ul de lucru?"
                                            description="Se va crea automat backup pentru CSV-ul curent. Apoi conținutul proiectului selectat va fi copiat în fișierul CSV de lucru."
                                            confirmLabel="Încarcă"
                                            cancelLabel="Anulează"
                                            onConfirm={() => handleLoad(file.filename)}
                                        >
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Încarcă în CSV-ul de lucru
                                            </button>
                                        </ConfirmDialog>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(file.filename)}
                                            disabled={isBusy}
                                            className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
