import { useEffect, useState } from 'react'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

/** One-time prompt to bind the legacy workspace to a show without moving it. */
export function LegacyWorkspaceMigrationDialog() {
    const {
        projects,
        activeProjectId,
        legacyWorkspaceMigration,
        assignLegacyWorkspace,
        activateProject,
    } = useTemplateDocument()
    const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId)
    const [dismissed, setDismissed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const reopen = () => setDismissed(false)
        window.addEventListener('open-legacy-workspace-migration', reopen)
        return () => window.removeEventListener('open-legacy-workspace-migration', reopen)
    }, [])

    useEffect(() => {
        if (activeProjectId) setSelectedProjectId(activeProjectId)
    }, [activeProjectId])

    if (!legacyWorkspaceMigration || dismissed) return null

    const bindWorkspace = async () => {
        if (!selectedProjectId || busy) return
        setBusy(true)
        setError(null)
        try {
            const result = await assignLegacyWorkspace(selectedProjectId)
            if (!result.ok) {
                setError(result.error ?? 'Nu s-a putut asocia folderul existent.')
                return
            }
            if (selectedProjectId !== activeProjectId) {
                const activated = await activateProject(selectedProjectId)
                if (!activated.ok) {
                    setError(activated.error ?? 'Folderul a fost asociat, dar emisiunea nu a putut fi selectată.')
                }
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="legacy-workspace-title" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <h2 id="legacy-workspace-title" className="text-lg font-semibold">Asociază folderul Tales existent</h2>
                <p className="mt-2 text-sm text-slate-600">
                    Am găsit folderul vechi <strong className="break-all">{legacyWorkspaceMigration.projectFolderPath}</strong>. Alege emisiunea căreia îi aparține. Conținutul rămâne în folderul actual.
                </p>
                <label className="mt-4 block text-sm font-medium">
                    Emisiune
                    <select
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                        value={selectedProjectId}
                        onChange={(event) => setSelectedProjectId(event.target.value)}
                        disabled={busy}
                    >
                        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                </label>
                {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" className="rounded border px-4 py-2 text-sm" disabled={busy} onClick={() => setDismissed(true)}>Mai târziu</button>
                    <button type="button" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy || !selectedProjectId} onClick={() => void bindWorkspace()}>
                        {busy ? 'Se asociază…' : selectedProjectId === activeProjectId ? 'Asociază folderul' : 'Asociază și deschide emisiunea'}
                    </button>
                </div>
            </section>
        </div>
    )
}
