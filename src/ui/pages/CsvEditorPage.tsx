// src/ui/pages/CsvEditorPage.tsx
import { useNavigate } from 'react-router-dom'
import {EditorLayout} from '../components/layout/EditorLayout'
import {EditorHeader} from '../components/layout/EditorHeader'
import {EditorBody} from '../components/layout/EditorBody'
import {EditModeProvider} from "@/ui/context/EditModeContext";
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { useCsvContext } from '@/features/csv-editor/context/CsvContext'

export function CsvEditorPage() {
    const navigate = useNavigate()
    const { activeProjectId, activeProject, workspaces, legacyWorkspaceMigration, isLoaded } = useTemplateDocument()
    const { state: csvState, workingCopyError, retryInitialization } = useCsvContext()

    return (
        <EditModeProvider>
            <TitleFilterProvider>
                <EditorLayout>
                    <EditorHeader/>
                    {!isLoaded ? (
                        <main className="flex flex-1 items-center justify-center bg-slate-100 p-6 text-sm text-slate-600">Se încarcă emisiunea…</main>
                    ) : !workspaces[activeProjectId] ? (
                        <main className="flex flex-1 items-center justify-center bg-slate-100 p-6">
                            <section className="max-w-xl rounded-lg border bg-white p-6 shadow-sm">
                                <h1 className="text-xl font-semibold">Folderul emisiunii nu este configurat</h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    Configurează un folder pentru {activeProject?.name ?? 'emisiunea selectată'} înainte să deschizi o ediție. Poți selecta o emisiune configurată în meniul de sus.
                                </p>
                                <button type="button" onClick={() => navigate('/shows')} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white">
                                    Configurează emisiuni
                                </button>
                                {legacyWorkspaceMigration && (
                                    <button type="button" onClick={() => window.dispatchEvent(new Event('open-legacy-workspace-migration'))} className="ml-2 mt-5 rounded border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">
                                        Asociază folderul vechi
                                    </button>
                                )}
                            </section>
                        </main>
                    ) : workingCopyError ? (
                        <main className="flex flex-1 items-center justify-center bg-slate-100 p-6">
                            <section role="alert" className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
                                <h1 className="text-xl font-semibold">Ediția nu a putut fi încărcată</h1>
                                <p className="mt-2 text-sm text-slate-600">{workingCopyError}</p>
                                <button type="button" onClick={retryInitialization} className="mt-5 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white">Reîncearcă</button>
                            </section>
                        </main>
                    ) : workspaces[activeProjectId] && !csvState.isLoaded ? (
                        <main className="flex flex-1 items-center justify-center bg-slate-100 p-6 text-sm text-slate-600">Se încarcă ediția…</main>
                    ) : <EditorBody/>}
                </EditorLayout>
            </TitleFilterProvider>
        </EditModeProvider>
    )
}
