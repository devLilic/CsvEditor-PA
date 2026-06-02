// src/ui/components/EntityTypeTabsLeft.tsx
import type { EditorViewType } from '@/features/csv-editor'
import { useActiveEntityType, useEntities, useSelectedEntity } from '@/features/csv-editor'

const BETA_TABS: { type: EditorViewType; label: string }[] = [
    { type: 'titles', label: 'Titluri' },
    { type: 'persons', label: 'Persoane' },
]

const PLATOU_TABS: { type: EditorViewType; label: string }[] = [
    ...BETA_TABS,
    { type: 'locations', label: 'Locații' },
    { type: 'phoneCalls', label: 'Phones' },
    { type: 'hotTitles', label: 'Ultima oră' },
    { type: 'waitTitles', label: 'Titluri așteptare' },
    { type: 'waitLocations', label: 'Locații așteptare' },
]

export function EntityTypeTabsLeft() {
    const { activeSection } = useEntities()
    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { clearSelection } = useSelectedEntity()
    const tabs = activeSection?.kind === 'beta' ? BETA_TABS : PLATOU_TABS

    const handleChange = (type: EditorViewType) => {
        if (type === activeEntityType) return
        clearSelection()
        setActiveEntityType(type)
    }

    return (
        <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
                <button
                    key={tab.type}
                    onClick={() => handleChange(tab.type)}
                    className={`px-3 py-1 rounded text-sm ${
                        activeEntityType === tab.type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
