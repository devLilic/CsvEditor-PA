// src/App.tsx

import {HashRouter, Routes, Route, Navigate} from 'react-router-dom'
import { CsvProvider, useCsvAutosave, useCsvInitialization } from '@/features/csv-editor'
import {AppMenuNavigationListener} from '@/ui/components/AppMenuNavigationListener'
import {EntityExportFailureAlert} from '@/ui/components/entity-export/EntityExportFailureAlert'
import {CsvEditorPage} from '@/ui/pages/CsvEditorPage'
import {DefaultProjectSettingsPage} from '@/ui/pages/DefaultProjectSettingsPage'
import {TemplateDocumentProvider} from '@/features/template-editor/state/TemplateDocumentProvider'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { ShowProjectsPage } from '@/ui/pages/ShowProjectsPage'
import { LegacyWorkspaceMigrationDialog } from '@/ui/components/LegacyWorkspaceMigrationDialog'

function CsvRuntime() {
    useCsvInitialization()
    useCsvAutosave({ debounceMs: 800 })
    return null
}

function ApplicationRoutes() {
    const { activeProjectId, workspaces } = useTemplateDocument()
    const workspace = workspaces[activeProjectId] ?? ''

    return (
        <CsvProvider key={`${activeProjectId || 'loading'}:${workspace}`}>
            <CsvRuntime />
            <AppMenuNavigationListener/>
            <EntityExportFailureAlert/>
            <LegacyWorkspaceMigrationDialog />
            <Routes>
                <Route path="/" element={<Navigate to="/csv-editor" replace/>}/>
                <Route path="/csv-editor" element={<CsvEditorPage/>}/>
                <Route path="/settings/default-project" element={<DefaultProjectSettingsPage/>}/>
                <Route path="/settings/lower-thirds" element={<Navigate to="/shows" replace/>}/>
                <Route path="/settings/application" element={<DefaultProjectSettingsPage/>}/>
                <Route path="/shows" element={<ShowProjectsPage/>}/>
            </Routes>
        </CsvProvider>
    )
}

export default function App() {
    return (
        <HashRouter>
            <TemplateDocumentProvider>
                <ApplicationRoutes />
            </TemplateDocumentProvider>
        </HashRouter>
    )
}
