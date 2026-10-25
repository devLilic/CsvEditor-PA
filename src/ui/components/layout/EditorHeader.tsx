// src/ui/components/layout/EditorHeader.tsx
import { useEffect, useState } from 'react'
import { useEntities } from '@/features/csv-editor'
import { useCsvContext } from '@/features/csv-editor/context/CsvContext'
import { parseCsv } from '@/features/csv-editor/utils/csvParser'
import type { EntitiesState } from '@/features/csv-editor/domain/entities'
import { EditModeToggle } from '@/ui/components/EditModeToggle'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { useTitleFilter } from '@/ui/context/TitleFilterContext'
import { SectionsTabs } from '@/ui/components/SectionsTabs'
import { BackupFailedDialog } from '@/ui/components/csv/BackupFailedDialog'
import { SavedProjectsModal } from '@/ui/components/csv/SavedProjectsModal'
import { TextPromptDialog } from '@/ui/components/common/TextPromptDialog'
import { savedProjectsService } from '@/features/csv-editor/services/savedProjectsService'
import { showErrorToast } from '@/ui/components/common/toast'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { settingsService } from '@/features/csv-editor/services/settingsService'

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
    const {
        projects: showProjects,
        activeProjectId,
        workspaces,
        activateProject,
        isLoaded: areShowProjectsLoaded,
        flushWorkingCopy,
    } = useTemplateDocument()
    const { startNewProject, forceStartNewProjectWithoutBackup } = useEntities()
    const { state, dispatch } = useCsvContext()
    const { titleFilter, setTitleFilter } = useTitleFilter()
    const [newProjectError, setNewProjectError] = useState<string | null>(null)
    const [backupFailedError, setBackupFailedError] = useState<string | undefined>()
    const [isBackupFailedDialogOpen, setIsBackupFailedDialogOpen] = useState(false)
    const [isSavedProjectsModalOpen, setIsSavedProjectsModalOpen] = useState(false)
    const [isSaveEditionPromptOpen, setIsSaveEditionPromptOpen] = useState(false)
    const [isSwitchingShow, setIsSwitchingShow] = useState(false)
    const [showProjectError, setShowProjectError] = useState<string | undefined>()
    const [showProjectSelector, setShowProjectSelector] = useState(false)
    const [projectSelectorSettingLoaded, setProjectSelectorSettingLoaded] = useState(false)
    const canEditEdition = Boolean(areShowProjectsLoaded && activeProjectId && workspaces[activeProjectId] && state.isLoaded)
    const showAddBetaButton = showProjects.find((project) => project.id === activeProjectId)?.betaSectionButtonEnabled !== false

    useEffect(() => {
        let isMounted = true
        settingsService.getShowProjectSelectorEnabled().then((enabled) => {
            if (!isMounted) return
            setShowProjectSelector(enabled)
            setProjectSelectorSettingLoaded(true)
        }).catch(() => {
            // Keep multi-show access available if reading the local preference fails.
            if (!isMounted) return
            setShowProjectSelector(true)
            setProjectSelectorSettingLoaded(true)
        })
        return () => { isMounted = false }
    }, [])

    useEffect(() => {
        const openSavedEditions = () => setIsSavedProjectsModalOpen(true)
        const saveEdition = () => setIsSaveEditionPromptOpen(true)
        window.addEventListener('tales:open-saved-editions', openSavedEditions)
        window.addEventListener('tales:save-edition', saveEdition)
        return () => {
            window.removeEventListener('tales:open-saved-editions', openSavedEditions)
            window.removeEventListener('tales:save-edition', saveEdition)
        }
    }, [])

    const handleSaveEdition = async (name: string) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
            showErrorToast('Introdu un nume pentru ediția salvată.')
            return
        }
        if (!activeProjectId || !canEditEdition) {
            showErrorToast('Nu există o ediție activă care poate fi salvată.')
            return
        }

        const flushed = await flushWorkingCopy()
        if (!flushed.ok) {
            showErrorToast(flushed.error ?? 'Ediția curentă nu a putut fi salvată.')
            return
        }
        const content = flushed.snapshot?.content
            ?? JSON.stringify({ version: 1, entities: state.entities }, null, 2)
        const result = await savedProjectsService.saveCurrentAsProject({ filename: trimmedName, content }, activeProjectId)
        if (!result.ok) {
            showErrorToast(result.error === 'FILE_EXISTS'
                ? 'Există deja o ediție salvată cu acest nume.'
                : result.error ?? 'Ediția nu a putut fi salvată.')
            return
        }
        setIsSavedProjectsModalOpen(true)
    }

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
            setNewProjectError(`Nu s-a putut porni ediția nouă: ${result.error ?? 'UNKNOWN_ERROR'}`)
        }
    }

    const handleProjectLoaded = (content: string) => {
        dispatch({
            type: 'CSV_LOADED',
            payload: (() => {
                try {
                    const saved = JSON.parse(content) as { entities?: unknown }
                    if (saved.entities && typeof saved.entities === 'object' && Array.isArray((saved.entities as EntitiesState).sections)) {
                        return saved.entities as EntitiesState
                    }
                } catch { /* Legacy saved projects are CSV. */ }
                return parseCsv(content)
            })(),
        })
    }

    const handleShowChange = async (projectId: string) => {
        if (isSwitchingShow) return
        setIsSwitchingShow(true)
        setShowProjectError(undefined)
        try {
            const flushed = await flushWorkingCopy()
            if (!flushed.ok) {
                setShowProjectError(flushed.error ?? 'Nu s-a putut salva ediția curentă.')
                return
            }
            const result = await activateProject(projectId)
            if (!result.ok) setShowProjectError(result.error ?? 'Nu s-a putut schimba emisiunea.')
        } finally {
            setIsSwitchingShow(false)
        }
    }

    return (
        <div className="app-header relative flex items-center justify-between gap-4 border-b bg-white px-4 py-2">
            <div className="app-header-primary flex min-w-0 items-center gap-3">
                <SectionsTabs showAddBetaButton={showAddBetaButton} />
            </div>

            <div className="relative flex items-center">
                <input
                    type="text"
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                    placeholder="Cauta titlul"
                    className="app-input w-64 rounded border border-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={() => setTitleFilter('')}
                    className="app-icon-button absolute right-1 bg-transparent px-2 py-2 text-sm text-gray-500 hover:bg-gray-100"
                    aria-label="Curata filtrul"
                >
                    <TrashIcon />
                </button>
            </div>

            <div className="flex min-w-0 items-center gap-2">
                {projectSelectorSettingLoaded && showProjectSelector && <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <select
                        aria-label="Proiect de emisiune"
                        value={activeProjectId}
                        disabled={!areShowProjectsLoaded || isSwitchingShow}
                        onChange={(event) => void handleShowChange(event.target.value)}
                        className="app-input max-w-40 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 disabled:opacity-60"
                    >
                        {showProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                </label>}

                <EditModeToggle />

                <ConfirmDialog
                    title="Începi o ediție nouă?"
                    description="Se va crea un backup al ediției curente. După backup, lista de valori va fi resetată pentru emisiunea selectată."
                    onConfirm={handleStartNewProject}
                >
                    <button disabled={!canEditEdition} className="app-button app-button-primary inline-flex items-center rounded border border-blue-700 bg-blue-600 px-4 py-1 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                        Ediție nouă
                    </button>
                </ConfirmDialog>
            </div>

            {newProjectError && (
                <div
                    role="alert"
                    className="app-notification app-notification-danger absolute right-4 top-14 max-w-md rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-sm"
                >
                    {newProjectError}
                </div>
            )}

            {showProjectError && (
                <div role="alert" className="app-notification app-notification-danger absolute right-4 top-14 max-w-md rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-sm">
                    {showProjectError}
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
                onClose={() => setIsSavedProjectsModalOpen(false)}
                onProjectLoaded={handleProjectLoaded}
            />

            <TextPromptDialog
                open={isSaveEditionPromptOpen}
                title="Salvează ediția"
                description="Introdu un nume pentru ediția curentă."
                placeholder="Numele ediției"
                confirmText="Salvează"
                onConfirm={(name) => { void handleSaveEdition(name) }}
                onClose={() => setIsSaveEditionPromptOpen(false)}
            />

        </div>
    )
}
