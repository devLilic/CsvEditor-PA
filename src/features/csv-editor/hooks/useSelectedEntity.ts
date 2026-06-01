// src/features/csv-editor/hooks/useSelectedEntity.ts
import { useCallback } from 'react'
import { useCsvContext } from '../context/CsvContext'
import type { EntityType } from '../domain/entities'
import type { SelectedEntity } from '../domain/csv.types'
import type { EditorViewType } from '../domain/editorViewTypes'
import { isEditorViewType } from '../domain/editorViewTypes'
import { isSupportedEntityType } from '../domain/supportedEntityTypes'

type SelectEntityInput = SelectedEntity & {
    viewType?: EditorViewType
}

type NormalizedSelectInput = {
    sectionId: string
    entityType?: EntityType
    id?: string
    viewType?: EditorViewType
}

type SelectEntity = {
    (sectionId: string, entityType: EntityType, id: string): void
    (input: SelectEntityInput): void
}

export function useSelectedEntity() {
    const { state, dispatch } = useCsvContext()
    const selected = state.selected && isSupportedEntityType(state.selected.entityType)
        ? state.selected
        : null

    const select = useCallback(
        (sectionOrInput: string | SelectEntityInput, entityType?: EntityType, id?: string) => {
            const next: NormalizedSelectInput =
                typeof sectionOrInput === 'string'
                    ? { sectionId: sectionOrInput, entityType, id }
                    : sectionOrInput

            if (!next.entityType || !next.id) return
            if (!isSupportedEntityType(next.entityType)) return

            const payload: SelectedEntity = {
                sectionId: next.sectionId,
                entityType: next.entityType,
                id: next.id,
            }

            if (next.viewType && isEditorViewType(next.viewType)) {
                dispatch({ type: 'SET_ACTIVE_VIEW_TYPE', payload: next.viewType })
            }

            dispatch({ type: 'SET_SELECTED', payload })
        },
        [dispatch]
    ) as SelectEntity

    const clearSelection = useCallback(() => {
        dispatch({ type: 'SET_SELECTED', payload: null })
    }, [dispatch])

    const isSelected = useCallback(
        (sectionId: string, entityType: EntityType, id: string) => {
            if (!isSupportedEntityType(entityType)) return false

            return selected?.sectionId === sectionId && selected?.entityType === entityType && selected?.id === id
        },
        [selected]
    )

    return { selected, select, clearSelection, isSelected }
}
