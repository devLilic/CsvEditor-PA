// src/ui/pages/CsvEditorPage.tsx
import {
    useCsvInitialization,
    useCsvAutosave,
} from '@/features/csv-editor'

import {EditorLayout} from '../components/layout/EditorLayout'
import {EditorHeader} from '../components/layout/EditorHeader'
import {EditorBody} from '../components/layout/EditorBody'
import {EditModeProvider} from "@/ui/context/EditModeContext";
import { TedModeProvider } from '@/ui/context/TedModeContext'
import { TitleFilterProvider } from '@/ui/context/TitleFilterContext'
import { TemplateDocumentProvider } from '@/features/template-editor/state/TemplateDocumentProvider'

export function CsvEditorPage() {
    useCsvInitialization()
    useCsvAutosave({debounceMs: 800})

    return (
        <EditModeProvider>
            <TedModeProvider>
                <TemplateDocumentProvider>
                    <TitleFilterProvider>
                        <EditorLayout>
                            <EditorHeader/>
                            <EditorBody/>
                        </EditorLayout>
                    </TitleFilterProvider>
                </TemplateDocumentProvider>
            </TedModeProvider>
        </EditModeProvider>
    )
}
