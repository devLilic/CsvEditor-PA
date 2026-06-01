// src/App.tsx

import {HashRouter, Routes, Route, Navigate} from 'react-router-dom'
import {AppMenuNavigationListener} from '@/ui/components/AppMenuNavigationListener'
import {EntityExportFailureAlert} from '@/ui/components/entity-export/EntityExportFailureAlert'
import {CsvEditorPage} from '@/ui/pages/CsvEditorPage'
import {DefaultProjectSettingsPage} from '@/ui/pages/DefaultProjectSettingsPage'

export default function App() {
    return (
        <HashRouter>
            <AppMenuNavigationListener/>
            <EntityExportFailureAlert/>
            <Routes>
                <Route path="/" element={<Navigate to="/csv-editor" replace/>}/>

                <Route path="/csv-editor" element={<CsvEditorPage/>}/>
                <Route path="/settings/default-project" element={<DefaultProjectSettingsPage/>}/>
            </Routes>
        </HashRouter>
    )
}
