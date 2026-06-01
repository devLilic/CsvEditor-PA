// src/ui/components/EntityTypeTabsLeft.tsx
import type { EditorViewType } from '@/features/csv-editor'
import { useActiveEntityType, useSelectedEntity } from '@/features/csv-editor'

const SUPPORTED_TABS: { type: EditorViewType; label: string }[] = [
    { type: 'titles', label: 'Titluri' },
    { type: 'persons', label: 'Persoane' },
    { type: 'locations', label: 'Locații' },
    { type: 'phoneCalls', label: 'Apeluri telefonice' },
]

export function EntityTypeTabsLeft() {
    const { activeViewType, setActiveViewType } = useActiveEntityType()
    const { clearSelection } = useSelectedEntity()

    const handleChange = (type: EditorViewType) => {
        if (type === activeViewType) return
        clearSelection()
        setActiveViewType(type)
    }

    return (
        <div className="flex gap-2 flex-wrap">
            {SUPPORTED_TABS.map((t) => (
                <button
                    key={t.type}
                    onClick={() => handleChange(t.type)}
                    className={`px-3 py-1 rounded text-sm ${
                        activeViewType === t.type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
