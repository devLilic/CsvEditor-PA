// File: src/features/csv-editor/hooks/useActiveEntityType.ts
import { useCallback } from 'react'
import { useCsvContext } from '../context/CsvContext'
import type { EditorViewType } from '../domain/editorViewTypes'
import { isEditorViewType } from '../domain/editorViewTypes'
import type { EntityType } from '../domain/entities'
import { isSupportedEntityType } from '../domain/supportedEntityTypes'

/**
 * Single source of truth pentru Tabs ↔ Lists ↔ Editor
 */
export function useActiveEntityType() {
    const { state, dispatch } = useCsvContext()

    const setActiveViewType = useCallback(
        (type: EditorViewType) => {
            if (!isEditorViewType(type)) return

            dispatch({
                type: 'SET_ACTIVE_VIEW_TYPE',
                payload: type,
            })
        },
        [dispatch]
    )

    const activeViewType = isEditorViewType(state.activeViewType)
        ? state.activeViewType
        : isEditorViewType(state.activeEntityType)
            ? state.activeEntityType
            : 'titles'

    const setActiveEntityType = useCallback(
        (type: EntityType) => {
            if (!isSupportedEntityType(type)) return

            dispatch({
                type: 'SET_ACTIVE_ENTITY_TYPE',
                payload: type,
            })
        },
        [dispatch]
    )

    return {
        activeViewType,
        setActiveViewType,
        // Legacy names kept while components migrate.
        activeEntityType: state.activeEntityType,
        setActiveEntityType,
    }
}
