import { useState } from 'react'
import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { DEFAULT_LOWER_THIRD_TYPE_ID } from '@/features/lower-thirds/domain/lowerThirdTypes'
import { useLowerThirdTypes } from '@/ui/hooks/useLowerThirdTypes'
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
        lowerThirdTypesEnabled = true,
        isLoaded,
        isDirty,
        updateTemplate,
        updateLowerThirdVariant,
        setTemplateEntityEnabled,
        resetTemplateToDefault,
        resetLowerThirdVariantToDefault,
        saveTemplates,
    } = useTemplateDocument()
    const { types: lowerThirdTypes } = useLowerThirdTypes()
    const {
        activeTedEntityType: activeEntityType,
        setActiveTedEntityType: setActiveEntityType,
        activeLowerThirdTypeId,
        setActiveLowerThirdTypeId: setSelectedLowerThirdTypeId,
        tedSampleOverrides: sampleOverrides,
        setTedSampleOverrides: setSampleOverrides,
    } = useTedMode()
    const [saveError, setSaveError] = useState<string | null>(null)
    const [saveWarning, setSaveWarning] = useState<string | null>(null)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const lowerThirdKind = activeEntityType === 'titles' || activeEntityType === 'persons'
        ? activeEntityType
        : null
    const selectedLowerThirdTypeId = lowerThirdTypesEnabled
        ? activeLowerThirdTypeId
        : DEFAULT_LOWER_THIRD_TYPE_ID
    const selectedLowerThirdType = lowerThirdTypes.find((type) => type.id === selectedLowerThirdTypeId)
        ?? lowerThirdTypes.find((type) => type.id === DEFAULT_LOWER_THIRD_TYPE_ID)
        ?? lowerThirdTypes[0]
    const template = lowerThirdKind && selectedLowerThirdType
        ? document.lowerThirdVariants[lowerThirdKind][selectedLowerThirdType.id]
            ?? document.lowerThirdVariants[lowerThirdKind][DEFAULT_LOWER_THIRD_TYPE_ID]
        : document.templates[activeEntityType]
    const associatedTemplateName = lowerThirdKind && selectedLowerThirdType
        ? selectedLowerThirdType.templates[lowerThirdKind].name
        : null
    if (!isTedMode) return null

    const applyTemplateUpdate = (nextTemplate: BroadcastTemplate) => {
        if (lowerThirdKind && selectedLowerThirdType) {
            updateLowerThirdVariant(lowerThirdKind, selectedLowerThirdType.id, nextTemplate)
        } else {
            updateTemplate(activeEntityType as EditableTemplateEntityType, nextTemplate)
        }
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
        if (lowerThirdKind && selectedLowerThirdType) {
            resetLowerThirdVariantToDefault(lowerThirdKind, selectedLowerThirdType.id)
        } else {
            resetTemplateToDefault(activeEntityType)
        }
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

                {lowerThirdKind && lowerThirdTypesEnabled && (
                    <fieldset className="rounded border bg-white p-3">
                        <legend className="px-1 text-xs font-semibold text-gray-700">
                            Lower-third variant
                        </legend>
                        <label className="flex flex-col gap-1 text-xs text-gray-700">
                            Variant
                            <select
                                aria-label="Lower-third variant"
                                value={selectedLowerThirdType?.id ?? DEFAULT_LOWER_THIRD_TYPE_ID}
                                onChange={(event) => {
                                    setSelectedLowerThirdTypeId(event.target.value)
                                    setSaveStatus('idle')
                                    setSaveError(null)
                                    setSaveWarning(null)
                                }}
                                className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                            >
                                {lowerThirdTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {selectedLowerThirdType && (
                            <p className="mt-2 text-xs text-gray-500">
                                Associated template: {associatedTemplateName}
                            </p>
                        )}
                    </fieldset>
                )}

                <fieldset className="rounded border bg-white p-3">
                    <legend className="px-1 text-xs font-semibold text-gray-700">
                        Main screen availability
                    </legend>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {(['titles', 'persons', 'locations', 'phoneCalls', 'waitTitles', 'waitLocations'] as const).map((entityType) => {
                            const enabled = !(document.disabledEntityTypes ?? []).includes(entityType)
                            return (
                                <label key={entityType} className="flex items-center gap-2 text-xs text-gray-700">
                                    <input
                                        type="checkbox"
                                        aria-label={`Show ${entityType} in main screen`}
                                        checked={enabled}
                                        onChange={(event) => {
                                            setTemplateEntityEnabled(entityType, event.target.checked)
                                            setSaveStatus('idle')
                                            setSaveError(null)
                                            setSaveWarning(null)
                                        }}
                                    />
                                    {entityType === 'phoneCalls' ? 'Phones' : entityType === 'waitTitles' ? 'Wait Titles' : entityType === 'waitLocations' ? 'Wait Locations' : entityType[0].toUpperCase() + entityType.slice(1)}
                                </label>
                            )
                        })}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        Hidden types stay saved and can be enabled here at any time.
                    </p>
                </fieldset>

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
