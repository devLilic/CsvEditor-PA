import {
    TED_ENTITY_LABELS,
    TED_ENTITY_TYPES,
    type TedEntityType,
} from '@/features/template-editor/domain/tedTypes'

type TedEntityTabsProps = {
    activeEntityType: TedEntityType
    onChange: (entityType: TedEntityType) => void
}

export function TedEntityTabs({
    activeEntityType,
    onChange,
}: TedEntityTabsProps) {
    return (
        <div
            role="tablist"
            aria-label="Template entity type"
            className="flex shrink-0 items-center gap-1 rounded border bg-gray-50 p-1"
        >
            {TED_ENTITY_TYPES.map((entityType) => (
                <button
                    key={entityType}
                    type="button"
                    role="tab"
                    aria-selected={activeEntityType === entityType}
                    onClick={() => onChange(entityType)}
                    className={`flex-1 rounded px-2 py-1 text-sm font-medium ${
                        activeEntityType === entityType
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-white'
                    }`}
                >
                    {TED_ENTITY_LABELS[entityType]}
                </button>
            ))}
        </div>
    )
}
