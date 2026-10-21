// src/ui/components/EntityTypeTabsLeft.tsx
import type { EditorViewType } from '@/features/csv-editor'
import { useActiveEntityType, useEntities, useSelectedEntity } from '@/features/csv-editor'
import { useTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'

const BETA_TABS: { type: EditorViewType; label: string }[] = [
    { type: 'titles', label: 'Titluri' },
    { type: 'persons', label: 'Persoane' },
]

const PLATOU_TABS: { type: EditorViewType; label: string }[] = [
    ...BETA_TABS,
    { type: 'locations', label: 'Locații' },
    { type: 'phoneCalls', label: 'Phones' },
    { type: 'waitTitles', label: 'Titluri așteptare' },
    { type: 'waitLocations', label: 'Locații așteptare' },
]

export function EntityTypeTabsLeft() {
    const { activeSection } = useEntities()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { clearSelection } = useSelectedEntity()
    const { document } = useTemplateDocument()
    const tabs = activeSection?.kind === 'beta' ? BETA_TABS : PLATOU_TABS
    const availableTabs = tabs.filter((tab) => (
        !(document.disabledEntityTypes ?? []).includes(tab.type)
    ))

    const handleChange = (type: EditorViewType) => {
        if (type === activeEntityType) return
        clearSelection()
        setActiveEntityType(type)
    }

    return (
        <div className="app-entity-tabs flex gap-2 flex-wrap">
            {availableTabs.map((tab) => (
                <button
                    key={tab.type}
                    onClick={() => handleChange(tab.type)}
                    className={`app-tab app-entity-tab inline-flex items-center gap-2 px-3 py-1 rounded text-sm ${
                        activeEntityType === tab.type
                            ? 'app-tab-active bg-blue-600 text-white'
                            : 'app-tab-inactive bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                    <span className="app-entity-tab-icon" aria-hidden="true" />
                    <span>{tab.label}</span>
                </button>
            ))}
            {availableTabs.length === 0 && (
                <span className="px-2 py-1 text-sm text-gray-500">
                    No enabled types for this section. Re-enable one in Edit Templates.
                </span>
            )}
        </div>
    )
}
