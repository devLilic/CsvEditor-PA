// src/ui/components/EntityList.tsx
import { Fragment, type ButtonHTMLAttributes, type DOMAttributes, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    useEntities,
    useSelectedEntity,
    useActiveEntityType,
    isSupportedEntityType,
} from '@/features/csv-editor'
import type { EntityType, PlateauTitleListItem } from '@/features/csv-editor'
import { findDuplicateTitleIds } from '@/features/csv-editor/domain/findDuplicateTitles'
import { reorderPlateauTitleItems as previewPlateauTitleReorder } from '@/features/csv-editor/domain/reorderPlateauTitleItems'
import { settingsService } from '@/features/csv-editor/services/settingsService'
import { EmptyState } from './common/EmptyState'
import { PlateauTitleDivider } from './titles/PlateauTitleDivider'
import { useEditMode } from '@/ui/context/EditModeContext'
import { useTitleFilter } from '@/ui/context/TitleFilterContext'
import { showErrorToast } from './common/toast'
import {
    DEFAULT_LOWER_THIRD_TYPE_ID,
    DEFAULT_LOWER_THIRD_TYPES,
} from '@/features/lower-thirds/domain/lowerThirdTypes'
import { useLowerThirdTypes } from '@/ui/hooks/useLowerThirdTypes'
import { useOptionalTemplateDocument } from '@/features/template-editor/state/TemplateDocumentProvider'
import { applyEntityTemplateTextTransforms } from '@/features/entity-export/domain/entityTemplateFieldValues'
import type { RepeatSupratitleRequest } from './repeatSupratitle'

const CONSECUTIVE_TITLE_DIVIDERS_DROP_ERROR = 'Nu pot exista două separatoare consecutive.'

function getPlateauItemId(item: any): string {
    return item.type === 'divider' ? item.id : item.rowId ?? item.id
}

function getPlateauTitleListItems(items: any[]): PlateauTitleListItem[] {
    return items.flatMap<PlateauTitleListItem>((item) => {
        if (item.type === 'divider') return [{ type: 'divider', id: item.id } satisfies PlateauTitleListItem]
        if (item.entityType === 'titles' && item.rowId) return [{ type: 'title', rowId: item.rowId } satisfies PlateauTitleListItem]
        return []
    })
}

function DragHandle({ attributes, listeners }: {
    attributes?: ButtonHTMLAttributes<HTMLButtonElement>
    listeners?: DOMAttributes<HTMLButtonElement>
}) {
    return (
        <button
            type="button"
            aria-label="Muta elementul"
            title="Muta elementul"
            {...attributes}
            {...listeners}
            className="app-drag-handle flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 active:cursor-grabbing"
        >
            <span aria-hidden="true" className="text-lg leading-none">=</span>
        </button>
    )
}

function SortableRow({ id, children }: { id: string; children: (dragHandle: ReactNode) => ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })
    const verticalTransform = transform
        ? { ...transform, x: 0 }
        : transform

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(verticalTransform),
                transition,
            }}
            className={isDragging ? 'opacity-60' : undefined}
        >
            {children(<DragHandle attributes={attributes} listeners={listeners} />)}
        </div>
    )
}

export function EntityList({ onRepeatSupratitle }: {
    onRepeatSupratitle?: (request: RepeatSupratitleRequest) => void
} = {}) {
    const {
        activeSectionId,
        activeSection,
        getBlockItems,
        deleteEntity,
        deletePlateauTitleDivider,
        reorderPlateauTitleItems,
    } = useEntities()

    const { activeEntityType, setActiveEntityType } = useActiveEntityType()
    const { select, isSelected } = useSelectedEntity()
    const { editMode } = useEditMode()
    const { titleFilter } = useTitleFilter()
    const { types: lowerThirdTypes } = useLowerThirdTypes()
    const templateDocumentState = useOptionalTemplateDocument()
    const { lowerThirdTypesEnabled = true, activeProject } = templateDocumentState ?? {}
    const [deletingDividerId, setDeletingDividerId] = useState<string | null>(null)
    const [enablePlateauTitleDragDrop, setEnablePlateauTitleDragDrop] = useState<boolean | null>(null)
    const [recentlyChangedTitleId, setRecentlyChangedTitleId] = useState<string | null>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const repeatRequestIdRef = useRef(0)
    const previousListStateRef = useRef<{
        contextKey: string
        itemCount: number
    } | null>(null)
    const previousTitleValuesRef = useRef<{
        contextKey: string
        titleById: Map<string, string>
    } | null>(null)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const sectionId = activeSectionId ?? activeSection?.id ?? ''
    const supportedEntityType = isSupportedEntityType(activeEntityType)
        ? activeEntityType
        : null
    const isWaitTitlesLocationsList = supportedEntityType === 'waitTitles' || supportedEntityType === 'waitLocations'
    const normalizedTitleFilter = titleFilter.trim().toLocaleLowerCase()
    const items = useMemo(() => {
        if (!sectionId || !supportedEntityType) {
            return []
        }

        return getBlockItems(sectionId, supportedEntityType)
    }, [getBlockItems, sectionId, supportedEntityType])

    useEffect(() => {
        let isMounted = true

        settingsService.getPlateauTitleDragDropEnabled().then((enabled) => {
            if (isMounted) {
                setEnablePlateauTitleDragDrop(enabled)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    const filteredItems = useMemo(() => {
        if (supportedEntityType !== 'titles' || !normalizedTitleFilter) {
            return items
        }

        return items.filter((item: any) =>
            item.type !== 'divider' &&
            (item.data?.title ?? '')
                .toLocaleLowerCase()
                .includes(normalizedTitleFilter)
        )
    }, [items, normalizedTitleFilter, supportedEntityType])

    useEffect(() => {
        const contextKey = `${sectionId}:${supportedEntityType ?? ''}:${normalizedTitleFilter}`
        const previousListState = previousListStateRef.current
        const lastItem = items[items.length - 1] as any
        const shouldScrollToNewTitle =
            previousListState?.contextKey === contextKey &&
            supportedEntityType === 'titles' &&
            !normalizedTitleFilter &&
            items.length > previousListState.itemCount &&
            lastItem?.type !== 'divider' &&
            lastItem?.entityType === 'titles'

        previousListStateRef.current = {
            contextKey,
            itemCount: items.length,
        }

        if (!shouldScrollToNewTitle) return

        requestAnimationFrame(() => {
            const list = listRef.current
            if (!list) return

            list.scrollTop = list.scrollHeight
        })
    }, [items, normalizedTitleFilter, sectionId, supportedEntityType])

    useEffect(() => {
        const contextKey = `${sectionId}:${supportedEntityType ?? ''}`
        const titleById = new Map<string, string>()

        for (const item of items as any[]) {
            if (item.type === 'divider' || item.entityType !== 'titles') continue
            titleById.set(item.id, item.data?.title ?? '')
        }

        const previousTitleValues = previousTitleValuesRef.current
        let changedTitleId: string | null = null

        if (previousTitleValues?.contextKey === contextKey) {
            for (const [id, title] of titleById) {
                const previousTitle = previousTitleValues.titleById.get(id)
                if (previousTitle === undefined || previousTitle !== title) {
                    changedTitleId = id
                    break
                }
            }
        }

        previousTitleValuesRef.current = {
            contextKey,
            titleById,
        }

        if (!changedTitleId || supportedEntityType !== 'titles') return

        setRecentlyChangedTitleId(changedTitleId)
        const timeoutId = window.setTimeout(() => {
            setRecentlyChangedTitleId((currentId) => currentId === changedTitleId ? null : currentId)
        }, 900)

        return () => window.clearTimeout(timeoutId)
    }, [items, sectionId, supportedEntityType])

    const duplicatePlateauTitleIds = useMemo(() => {
        if (activeSection?.kind !== 'invited' || supportedEntityType !== 'titles') {
            return new Set<string>()
        }

        return findDuplicateTitleIds(
            items.flatMap((item: any) => {
                if (item.type === 'divider' || item.entityType !== 'titles') return []

                return [{
                    id: item.id,
                    title: item.data?.title ?? '',
                }]
            })
        )
    }, [activeSection?.kind, items, supportedEntityType])

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
    const canDragPlateauTitles =
        activeSection?.kind === 'invited' &&
        supportedEntityType === 'titles' &&
        editMode &&
        enablePlateauTitleDragDrop === true
    const sortableItemIds = items.map((item: any) => getPlateauItemId(item))
    const titleNumberById = new Map<string, number>()
    items.forEach((item: any) => {
        if (item.type === 'divider' || item.entityType !== 'titles') return
        titleNumberById.set(item.id, titleNumberById.size + 1)
    })

    const handleDeleteDivider = async (dividerId: string) => {
        setDeletingDividerId(dividerId)

        const result = await deletePlateauTitleDivider(dividerId)

        setDeletingDividerId(null)
        if (!result.ok) {
            showErrorToast(result.error ?? 'TITLE_DIVIDER_DELETE_FAILED')
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const activeId = String(event.active.id)
        const overId = event.over?.id ? String(event.over.id) : ''
        if (!activeId || !overId || activeId === overId) return

        const previewResult = previewPlateauTitleReorder(
            getPlateauTitleListItems(items),
            activeId,
            overId
        )

        if (!previewResult.ok) {
            if (previewResult.reason === 'consecutive-dividers') {
                showErrorToast(CONSECUTIVE_TITLE_DIVIDERS_DROP_ERROR)
            }
            return
        }

        const result = await reorderPlateauTitleItems(activeId, overId)
        if (!result.ok) {
            showErrorToast(result.error ?? 'TITLE_REORDER_FAILED')
        }
    }

    if (isWaitTitlesLocationsList) {
        const disabledTypes = activeProject?.document.disabledEntityTypes ?? []
        const showWaitLocations = !disabledTypes.includes('waitLocations')
        const showWaitTitles = !disabledTypes.includes('waitTitles')
        const waitLocations = activeSection?.kind === 'invited' && showWaitLocations
            ? activeSection.rows.flatMap((row) => row.waitLocation ? [row.waitLocation] : [])
            : []
        const waitTitles = activeSection?.kind === 'invited' && showWaitTitles
            ? activeSection.rows.flatMap((row) => row.waitTitle ? [row.waitTitle] : [])
            : []
        const groupCount = Math.max(waitLocations.length, waitTitles.length)

        if (!groupCount) return <EmptyState text="Nu exista elemente in aceasta sectiune." />

        const selectWaitEntity = (entityType: 'waitLocations' | 'waitTitles', id: string) => {
            if (entityType !== activeEntityType) setActiveEntityType(entityType)
            select({ sectionId, entityType, id, viewType: entityType })
        }

        const renderWaitValue = (
            entityType: 'waitLocations' | 'waitTitles',
            entity: any,
            value: string,
            displayValueOverride?: string,
            textStyle: 'supratitle' | 'title' = 'title',
            canDelete = true,
        ) => {
            const displayData = activeProject
                ? applyEntityTemplateTextTransforms(
                    entityType,
                    entity,
                    { ...activeProject.document, lowerThirdTypesEnabled: activeProject.lowerThirdTypesEnabled },
                )
                : entity
            const displayValue = displayValueOverride
                ?? (entityType === 'waitLocations' ? displayData.location : displayData.title)

            return (
                <div key={`${entityType}:${entity.id}:${textStyle}`} className="flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => selectWaitEntity(entityType, entity.id)}
                        className={`min-w-0 flex-1 truncate rounded px-2 py-0.5 text-left ${textStyle === 'supratitle' ? 'text-xs font-bold text-gray-600' : 'font-bold'}`}
                    >
                        {displayValue || value}
                    </button>
                    {editMode && canDelete && (
                        <button
                            type="button"
                            title="Sterge"
                            aria-label={`Sterge ${entityType === 'waitLocations' ? 'locatia' : 'titlul'}`}
                            onClick={() => deleteEntity(sectionId, entityType, entity.id)}
                            className="app-button app-button-danger rounded border border-red-700 bg-red-500 px-2 text-xs text-white hover:bg-red-800"
                        >
                            x
                        </button>
                    )}
                </div>
            )
        }

        return (
            <div ref={listRef} className="app-list h-full min-h-0 overflow-y-auto">
                <div className="app-list-panel rounded border bg-white">
                    {Array.from({ length: groupCount }, (_, index) => {
                        const location = waitLocations[index]
                        const title = waitTitles[index]
                        const titleLocationField = title
                            ? Object.keys(title.customFields ?? {}).find((fieldId) => (
                                ['location', 'locatie'].includes(fieldId.trim().toLocaleLowerCase())
                            ))
                            : undefined
                        const transformedTitle = title && activeProject
                            ? applyEntityTemplateTextTransforms(
                                'waitTitles',
                                title,
                                { ...activeProject.document, lowerThirdTypesEnabled: activeProject.lowerThirdTypesEnabled },
                            )
                            : title
                        const titleLocation = titleLocationField
                            ? transformedTitle?.customFields?.[titleLocationField]
                            : undefined
                        const selected = Boolean(
                            (location && isSelected(sectionId, 'waitLocations', location.id))
                            || (title && isSelected(sectionId, 'waitTitles', title.id))
                        )
                        return (
                            <div key={`${location?.id ?? ''}:${title?.id ?? ''}`} className={`app-list-row group flex cursor-pointer items-center gap-3 border-b border-l-4 px-3 py-2 hover:bg-gray-100 ${selected ? 'border-l-blue-600 bg-blue-100' : 'border-l-transparent'}`}>
                                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                                {location
                                    ? renderWaitValue('waitLocations', location, location.location, undefined, 'supratitle')
                                    : title && titleLocation && renderWaitValue('waitTitles', title, titleLocation, titleLocation, 'supratitle', false)}
                                {title && renderWaitValue('waitTitles', title, title.title, undefined, 'title')}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderItem = (item: any, dragHandle?: ReactNode) => {
        let renderedItem: ReactNode

        if (item.type === 'divider') {
            renderedItem = (
                <PlateauTitleDivider
                    dividerId={item.id}
                    canDelete
                    isDeleting={deletingDividerId === item.id}
                    dragHandle={dragHandle}
                    onDelete={handleDeleteDivider}
                />
            )
        } else {
            const selected = isSelected(
                sectionId,
                item.entityType as EntityType,
                item.id
            )

            const isTitle = item.entityType === 'titles'
            const isPersons = item.entityType === 'persons'
            const displayData = activeProject && supportedEntityType
                ? applyEntityTemplateTextTransforms(
                    supportedEntityType,
                    item.data,
                    { ...activeProject.document, lowerThirdTypesEnabled: activeProject.lowerThirdTypesEnabled },
                )
                : item.data
            const storedLowerThirdTypeId = item.data?.lowerThirdTypeId ?? DEFAULT_LOWER_THIRD_TYPE_ID
            const lowerThirdTypeId = lowerThirdTypes.some((type) => type.id === storedLowerThirdTypeId)
                ? storedLowerThirdTypeId
                : DEFAULT_LOWER_THIRD_TYPE_ID
            const lowerThirdType = lowerThirdTypes.find((type) => type.id === lowerThirdTypeId)
                ?? lowerThirdTypes.find((type) => type.id === DEFAULT_LOWER_THIRD_TYPE_ID)
                ?? DEFAULT_LOWER_THIRD_TYPES[0]
            const isDuplicatePlateauTitle = isTitle && duplicatePlateauTitleIds.has(item.id)
            const isRecentlyChangedTitle = isTitle && recentlyChangedTitleId === item.id
            const displayNr = isTitle ? titleNumberById.get(item.id) ?? null : null
            const mainText = isPersons
                ? displayData?.name ?? ''
                : displayData?.title ?? displayData?.location ?? ''
            const subText = isPersons ? displayData?.occupation ?? '' : ''
            const supratitle = isTitle ? displayData?.supratitle?.trim() ?? '' : ''

            renderedItem = (
                <div
                    onClick={() =>
                        select({
                            sectionId,
                            entityType: item.entityType,
                            id: item.id,
                            viewType: supportedEntityType ?? undefined,
                        })
                    }
                    className={`app-list-row group px-3 py-2 cursor-pointer flex justify-between items-center gap-3 border-b border-l-4
                        ${
                            selected
                                ? 'bg-blue-100 border-l-blue-600'
                                : isDuplicatePlateauTitle
                                    ? 'bg-[var(--duplicate-title-bg)] hover:bg-[var(--duplicate-title-bg)] border-l-[var(--duplicate-title-border)] text-[var(--duplicate-title-text)]'
                                : 'hover:bg-gray-100 border-l-transparent'
                        }
                        ${isRecentlyChangedTitle ? 'app-list-row-blink' : ''}
                    `}
                >
                    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                        {dragHandle}
                        <div className="min-w-0 overflow-hidden">
                            {showNr && displayNr !== null ? (
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="flex shrink-0 items-center gap-2">
                                        <span className="app-title-number font-semibold text-gray-500">
                                            {displayNr}.
                                        </span>
                                        {lowerThirdTypesEnabled && <span
                                            aria-label={lowerThirdType.name}
                                            title={lowerThirdType.name}
                                            className="h-3 w-3 shrink-0 rounded-full border border-black/20"
                                            style={{ backgroundColor: lowerThirdType.palette.indicatorColor }}
                                        />}
                                    </span>
                                    <span className="flex min-w-0 flex-col">
                                        {supratitle && (
                                            <span className="truncate text-xs font-bold text-gray-600">
                                                {supratitle}
                                            </span>
                                        )}
                                        <span className="truncate font-bold">{mainText}</span>
                                    </span>
                                </div>
                            ) : isPersons ? (
                                <div className="flex min-w-0 flex-col">
                                    <span className="flex min-w-0 items-center gap-2">
                                        {lowerThirdTypesEnabled && <span
                                            aria-label={lowerThirdType.name}
                                            title={lowerThirdType.name}
                                            className="h-3 w-3 shrink-0 rounded-full border border-black/20"
                                            style={{ backgroundColor: lowerThirdType.palette.indicatorColor }}
                                        />}
                                        <span className="truncate font-bold">{mainText}</span>
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

                    <div className="app-row-actions app-repeat-row-actions flex shrink-0 items-center gap-2">
                        {isTitle && supratitle && onRepeatSupratitle && (
                            <button
                                type="button"
                                title="Repetă supratitlu"
                                aria-label={`Repetă supratitlu: ${supratitle}`}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onRepeatSupratitle({
                                        requestId: ++repeatRequestIdRef.current,
                                        supratitle,
                                        lowerThirdTypeId: lowerThirdTypesEnabled ? lowerThirdType.id : DEFAULT_LOWER_THIRD_TYPE_ID,
                                    })
                                }}
                                className="app-button border border-blue-300 bg-white px-2 py-1 text-xs text-blue-800 rounded hover:bg-blue-50"
                            >
                                Repetă supratitlu
                            </button>
                        )}
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
                                className="app-button app-button-danger border border-red-700 bg-red-500 px-2 text-xs text-white rounded hover:bg-red-800"
                            >
                                x
                            </button>
                        )}
                    </div>
                </div>
            )
        }

        const itemId = getPlateauItemId(item)
        if (!canDragPlateauTitles || dragHandle) {
            return <Fragment key={itemId}>{renderedItem}</Fragment>
        }

        return (
            <SortableRow key={itemId} id={itemId}>
                {(dragHandle) => renderItem(item, dragHandle)}
            </SortableRow>
        )
    }

    return (
        <div ref={listRef} className="app-list h-full min-h-0 overflow-y-auto">
            {canDragPlateauTitles ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                        <div className="app-list-panel rounded border bg-white">
                            {filteredItems.map((item) => renderItem(item))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="app-list-panel rounded border bg-white">
                    {filteredItems.map((item) => renderItem(item))}
                </div>
            )}
        </div>
    )
}
