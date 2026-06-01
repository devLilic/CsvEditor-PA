import { useState } from 'react'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import {
    type EditableTemplateEntityType,
    useTemplateDocument,
} from '@/features/template-editor/state/TemplateDocumentProvider'
import { useTedMode } from '@/ui/context/TedModeContext'
import { TemplateLayerAccordion } from './TemplateLayerAccordion'
import { TedEntityTabs } from './TedEntityTabs'
import { TedSampleDataPanel } from './TedSampleDataPanel'

type TemplateEditorPanelProps = {
    isTedMode: boolean
}

export function TemplateEditorPanel({ isTedMode }: TemplateEditorPanelProps) {
    const {
        document,
        isLoaded,
        isDirty,
        updateTemplate,
        resetTemplateToDefault,
        saveTemplates,
    } = useTemplateDocument()
    const {
        activeTedEntityType: activeEntityType,
        setActiveTedEntityType: setActiveEntityType,
        tedSampleOverrides: sampleOverrides,
        setTedSampleOverrides: setSampleOverrides,
    } = useTedMode()
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveWarning, setSaveWarning] = useState<string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const template = document.templates[activeEntityType]
    if (!isTedMode) return null

    const applyTemplateUpdate = (nextTemplate: BroadcastTemplate) => {
        updateTemplate(activeEntityType as EditableTemplateEntityType, nextTemplate)
        setSaveStatus('idle')
        setSaveError(null)
    }

    const handleSave = async () => {
        setSaveStatus('saving')
        setSaveError(null)
        setSaveWarning(null)
        const result = await saveTemplates()

        if (!result.ok) {
            setSaveStatus('idle')
            setSaveError(result.error ?? 'SAVE_FAILED')
            return
        }

        setSaveWarning(result.warning ?? null)
        setSaveStatus('saved')
    }

    const handleReset = () => {
        resetTemplateToDefault(activeEntityType)
        setSaveStatus('idle')
        setSaveError(null)
        setSaveWarning(null)
    }

    return (
        <div
            data-testid="template-editor-panel"
            className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"
        >
            <TedEntityTabs
                activeEntityType={activeEntityType}
                onChange={(entityType) => {
                    setActiveEntityType(entityType)
                    setSampleOverrides({})
                    setSaveStatus('idle')
                    setSaveError(null)
                    setSaveWarning(null)
                }}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {!isLoaded && (
                    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Loading templates...
                    </div>
                )}

                <TedSampleDataPanel
                    entityType={activeEntityType}
                    overrides={sampleOverrides}
                    onOverridesChange={setSampleOverrides}
                />

                <TemplateLayerAccordion
                    template={template}
                    onTemplateChange={applyTemplateUpdate}
                />
            </div>

            <div className="shrink-0 rounded border bg-white p-3">
                {saveError && (
                    <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                        {saveError}
                    </div>
                )}
                {saveWarning && (
                    <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        {saveWarning}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className={`rounded px-3 py-2 text-sm font-semibold text-white ${
                            isDirty && saveStatus !== 'saving'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-400'
                        }`}
                    >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save templates'}
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Reset to default
                    </button>
                    <span className="text-xs font-medium text-gray-600">
                        {isDirty ? 'Unsaved changes' : saveStatus === 'saved' ? 'Saved' : 'Clean'}
                    </span>
                </div>
            </div>
        </div>
    )
}
