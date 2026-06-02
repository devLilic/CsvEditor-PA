// src/ui/components/layout/EditorHeader.tsx
import { useState } from 'react'
import { useEntities } from '@/features/csv-editor'
import { useCsvContext } from '@/features/csv-editor/context/CsvContext'
import { parseCsv } from '@/features/csv-editor/utils/csvParser'
import { serializeCsv } from '@/features/csv-editor/utils/csvSerializer'
import { EditModeToggle } from '@/ui/components/EditModeToggle'
import { useEditMode } from '@/ui/context/EditModeContext'
import { useTedMode } from '@/ui/context/TedModeContext'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { useTitleFilter } from '@/ui/context/TitleFilterContext'
import { SectionsTabs } from '@/ui/components/SectionsTabs'
import { useWorkingCsvInfo } from '@/features/csv-editor/hooks/useWorkingCsvInfo'
import { BackupFailedDialog } from '@/ui/components/csv/BackupFailedDialog'
import { SavedProjectsModal } from '@/ui/components/csv/SavedProjectsModal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { TedUnsavedChangesDialog } from '../template-editor/TedUnsavedChangesDialog'

function TrashIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6h18"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 6V4h8v2"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 6l-1 14H6L5 6"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 11v6"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 11v6"
            />
        </svg>
    )
}

export function EditorHeader() {
    const { editMode } = useEditMode()
    const { isTedMode, setTedMode } = useTedMode()
    const {
        isDirty: isTemplateDirty,
        discardUnsavedChanges,
        saveTemplates,
    } = useTemplateDocument()
    const { startNewProject, forceStartNewProjectWithoutBackup } = useEntities()
    const { state, dispatch } = useCsvContext()
    const { titleFilter, setTitleFilter } = useTitleFilter()
    const [newProjectError, setNewProjectError] = useState<string | null>(null)
    const [backupFailedError, setBackupFailedError] = useState<string | undefined>()
    const [isBackupFailedDialogOpen, setIsBackupFailedDialogOpen] = useState(false)
    const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState(false)
    const [isTedExitDialogOpen, setIsTedExitDialogOpen] = useState(false)
    const [isSavingTemplates, setIsSavingTemplates] = useState(false)
    const [templateSaveError, setTemplateSaveError] = useState<string | undefined>()
    const [templateSaveWarning, setTemplateSaveWarning] = useState<string | undefined>()
    const workingCsvInfo = useWorkingCsvInfo()

    const handleStartNewProject = async () => {
        setNewProjectError(null)
        setBackupFailedError(undefined)
        setIsBackupFailedDialogOpen(false)
        const result = await startNewProject()
        if (!result.ok) {
            if ('reason' in result && result.reason === 'BACKUP_FAILED') {
                setBackupFailedError(result.error)
                setIsBackupFailedDialogOpen(true)
            }
        }
    }

    const handleCancelBackupFailed = () => {
        setIsBackupFailedDialogOpen(false)
    }

    const handleContinueWithoutBackup = async () => {
        setNewProjectError(null)
        setIsBackupFailedDialogOpen(false)

        const result = await forceStartNewProjectWithoutBackup()
        if (!result.ok) {
            setNewProjectError(`Nu s-a putut porni proiectul nou: ${result.error ?? 'UNKNOWN_ERROR'}`)
        }
    }

    const handleProjectLoaded = (content: string) => {
        dispatch({
            type: 'CSV_LOADED',
            payload: parseCsv(content),
        })
    }

    const handleToggleTedMode = () => {
        if (!isTedMode) {
            setTedMode(true)
            return
        }

        if (!isTemplateDirty) {
            setTedMode(false)
            return
        }

        setTemplateSaveError(undefined)
        setTemplateSaveWarning(undefined)
        setIsTedExitDialogOpen(true)
    }

    const handleExitTedWithoutSaving = () => {
        discardUnsavedChanges()
        setIsTedExitDialogOpen(false)
        setTedMode(false)
    }

    const handleSaveTemplatesAndExit = async () => {
        setIsSavingTemplates(true)
        setTemplateSaveError(undefined)
        setTemplateSaveWarning(undefined)
        const result = await saveTemplates()
        setIsSavingTemplates(false)

        if (!result.ok) {
            setTemplateSaveError(result.error ?? 'SAVE_FAILED')
            return
        }

        setTemplateSaveWarning(result.warning)
        setIsTedExitDialogOpen(false)
        setTedMode(false)
    }

    return (
        <div className="relative flex items-center justify-between gap-4 border-b bg-white px-4 py-2">
            <span className="shrink-0 rounded bg-red-700 px-3 py-1 text-sm font-bold text-white">
                Punctul pe Azi
            </span>
            <SectionsTabs />

            <div className="relative flex items-center">
                <input
                    type="text"
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                    placeholder="Cauta titlul"
                    className="w-64 rounded border border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={() => setTitleFilter('')}
                    className="absolute right-1 bg-transparent px-2 py-2 text-sm text-gray-500 hover:bg-gray-100"
                    aria-label="Curata filtrul"
                >
                    <TrashIcon />
                </button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
                {editMode && (
                    <button
                        type="button"
                        onClick={handleToggleTedMode}
                        className={`rounded border px-3 py-1 text-sm font-medium ${
                            isTedMode
                                ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                                : 'border-blue-600 bg-white text-blue-700 hover:bg-blue-50'
                        }`}
                    >
                        {isTedMode ? 'Exit Templates' : 'EDIT Templates'}
                    </button>
                )}

                <span className="max-w-48 truncate rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
                    CSV: {workingCsvInfo.filename}
                </span>

                <EditModeToggle />

                <button
                    type="button"
                    onClick={() => setIsSavedProjectsModalOpen(true)}
                    className="rounded border border-gray-300 bg-white px-4 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                    Proiecte salvate
                </button>

                <ConfirmDialog
                    title="Incepi un proiect nou?"
                    description="Se va crea un backup CSV in folderul setat in Setari. Doar dupa backup, fisierul de lucru va fi resetat cu continutul standard. Daca backup-ul esueaza, resetarea nu se face."
                    onConfirm={handleStartNewProject}
                >
                    <button className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-1 text-white">
                        <TrashIcon />
                        Proiect nou
                    </button>
                </ConfirmDialog>
            </div>

            {newProjectError && (
                <div
                    role="alert"
                    className="absolute right-4 top-14 max-w-md rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-sm"
                >
                    {newProjectError}
                </div>
            )}

            {templateSaveWarning && (
                <div
                    role="status"
                    className="absolute right-4 top-14 max-w-md rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-sm"
                >
                    {templateSaveWarning}
                </div>
            )}

            <BackupFailedDialog
                open={isBackupFailedDialogOpen}
                error={backupFailedError}
                onCancel={handleCancelBackupFailed}
                onContinueWithoutBackup={handleContinueWithoutBackup}
            />

            <SavedProjectsModal
                open={isSavedProjectsModalOpen}
                currentCsvContent={serializeCsv(state.entities)}
                onClose={() => setIsSavedProjectsModalOpen(false)}
                onProjectLoaded={handleProjectLoaded}
            />

            <TedUnsavedChangesDialog
                open={isTedExitDialogOpen}
                onCancel={() => setIsTedExitDialogOpen(false)}
                onExitWithoutSaving={handleExitTedWithoutSaving}
                onSaveAndExit={() => void handleSaveTemplatesAndExit()}
                isSaving={isSavingTemplates}
                error={templateSaveError}
            />
        </div>
    )
}
