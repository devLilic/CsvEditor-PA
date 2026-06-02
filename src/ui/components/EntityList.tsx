// src/ui/components/EntityList.tsx
import { useMemo } from 'react'
import {
    useEntities,
    useSelectedEntity,
    useActiveEntityType,
    useOnAir,
    isSupportedEntityType,
} from '@/features/csv-editor'
import type { EntityType } from '@/features/csv-editor'
import { EmptyState } from './common/EmptyState'
import { useEditMode } from '@/ui/context/EditModeContext'
import { useTitleFilter } from '@/ui/context/TitleFilterContext'

export function EntityList() {
    const { activeSectionId, activeSection, getBlockItems, deleteEntity } =
        useEntities()

    const { activeEntityType } = useActiveEntityType()
    const { select, isSelected } = useSelectedEntity()
    const { isOnAir, setOnAir, clearOnAir } = useOnAir()
    const { editMode } = useEditMode()
    const { titleFilter } = useTitleFilter()

    const sectionId = activeSectionId ?? activeSection?.id ?? ''
    const supportedEntityType = isSupportedEntityType(activeEntityType)
        ? activeEntityType
        : null
    const normalizedTitleFilter = titleFilter.trim().toLocaleLowerCase()
    const items = useMemo(() => {
        if (!sectionId || !supportedEntityType) {
            return []
        }

        return getBlockItems(sectionId, supportedEntityType)
    }, [getBlockItems, sectionId, supportedEntityType])
    const filteredItems = useMemo(() => {
        if (supportedEntityType !== 'titles' || !normalizedTitleFilter) {
            return items
        }

        return items.filter((item: any) =>
            (item.data?.title ?? '')
                .toLocaleLowerCase()
                .includes(normalizedTitleFilter)
        )
    }, [items, normalizedTitleFilter, supportedEntityType])

    if (!sectionId) {
        return <EmptyState text="Nu exista sectiune activa." />
    }

    if (!filteredItems.length) {
        if (supportedEntityType === 'titles' && normalizedTitleFilter) {
            return (
                <EmptyState text="Nu exista titluri care contin sintagma cautata." />
            )
        }

        return <EmptyState text="Nu exista elemente in aceasta sectiune." />
    }

    const showNr = supportedEntityType === 'titles'

    return (
        <div className="h-full min-h-0 overflow-y-auto">
            <div className="rounded border bg-white">
                {filteredItems.map((item: any) => {
                    const selected = isSelected(
                        sectionId,
                        item.entityType as EntityType,
                        item.id
                    )

                    const active = isOnAir(item.entityType, item.id)

                    const isTitle = item.entityType === 'titles'
                    const isPersons = item.entityType === 'persons'

                    const displayNr = isTitle
                        ? items.findIndex((listItem: any) => listItem.id === item.id) + 1
                        : null

                    const mainText = isPersons
                        ? item.data?.name ?? ''
                        : item.data?.title ?? item.data?.location ?? ''

                    const subText = isPersons ? item.data?.occupation ?? '' : ''

                    return (
                        <div
                            key={item.id}
                            onClick={() =>
                                select({
                                    sectionId,
                                    entityType: item.entityType,
                                    id: item.id,
                                    viewType: supportedEntityType ?? undefined,
                                })
                            }
                            className={`group px-3 py-2 cursor-pointer flex justify-between items-center gap-3 border-b border-l-4
                                ${
                                    selected
                                        ? 'bg-blue-100 border-l-blue-600'
                                        : 'hover:bg-gray-100 border-l-transparent'
                                }
                                ${
                                    active ? 'border-l-red-600 bg-red-50' : ''
                                }
                            `}
                        >
                            <div className="flex min-w-0 gap-2 overflow-hidden">
                                {editMode && (
                                    <button
                                        title="Sterge"
                                        aria-label="Sterge"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteEntity(
                                                sectionId,
                                                item.entityType,
                                                item.id
                                            )
                                        }}
                                        className="border border-red-700 bg-red-500 px-2 text-xs text-white rounded hover:bg-red-800"
                                    >
                                        ×
                                    </button>
                                )}

                                <div className="min-w-0 overflow-hidden">
                                    {showNr && displayNr !== null ? (
                                        <div className="flex min-w-0 gap-2">
                                            <span className="shrink-0 font-semibold text-gray-500">
                                                {displayNr}.
                                            </span>
                                            <span className="truncate font-bold">
                                                {mainText}
                                            </span>
                                        </div>
                                    ) : isPersons ? (
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate font-bold">
                                                {mainText}
                                            </span>
                                            <span className="truncate text-sm text-gray-600">
                                                {subText}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="truncate font-bold">
                                            {mainText}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {active ? (
                                    <>
                                        <span className="text-xs font-semibold text-red-600">
                                            ON AIR
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                clearOnAir(item.entityType)
                                            }}
                                            className="rounded border border-gray-500 bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                                        >
                                            STOP
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setOnAir(item.entityType, item.id)
                                        }}
                                        className="rounded border border-red-500 px-2 py-1 text-xs text-red-500 opacity-0 transition-opacity duration-150 hover:bg-red-700 hover:text-white group-hover:opacity-100"
                                    >
                                        ON AIR
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
