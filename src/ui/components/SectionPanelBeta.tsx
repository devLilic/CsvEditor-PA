// src/ui/components/SectionPanelBeta.tsx
import { EntityList } from './EntityList'
import { useEntities } from '@/features/csv-editor'

export function SectionPanelBeta() {
    const { activeSectionId, activeSection } = useEntities()
    if (!activeSectionId || !activeSection) return null

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white rounded border">
                <div className="px-3 py-2 text-sm font-semibold border-b bg-gray-50">Titluri</div>
                <div className="p-2">
                    <EntityList  />
                </div>
            </div>

            <div className="bg-white rounded border">
                <div className="px-3 py-2 text-sm font-semibold border-b bg-gray-50">Persoane</div>
                <div className="p-2">
                    <EntityList  />
                </div>
            </div>
        </div>
    )
}