// src/features/csv-editor/state/csv.types.ts
import type { EntitiesState, EntityType } from '../domain/entities'
import type { SelectedEntity } from '../domain/csv.types'
import type { EditorViewType } from '../domain/editorViewTypes'

export type OnAirMap = Partial<Record<EntityType, string>>

export interface CsvState {
    entities: EntitiesState
    isLoaded: boolean

    // selection now needs sectionId
    selected: SelectedEntity | null

    // Canonical active UI view; phoneCalls maps to the CSV persons entity.
    activeViewType: EditorViewType

    // PA entity selection. phoneCalls remains a UI/storage alias over persons.
    activeEntityType: EntityType

    // active section for Tabs (BETA/INVITATI)
    activeSectionId: string | null

    // ON AIR state (kept, still per EntityType global)
    onAir: OnAirMap
}

export const initialCsvState: CsvState = {
    entities: {
        sections: [], // will be created on load/fallback
    },
    isLoaded: false,
    selected: null,
    activeViewType: 'titles',
    activeEntityType: 'titles',
    activeSectionId: null,
    onAir: {},
}

export type CsvAction =
    | { type: 'CSV_LOADED'; payload: EntitiesState }

    // sections ops
    | { type: 'SECTION_ADD_BETA'; payload: { betaTitle: string } }
    | { type: 'SECTION_RENAME_BETA'; payload: { sectionId: string; betaTitle: string } }
    | { type: 'SECTION_DELETE_BETA'; payload: { sectionId: string } }
    | { type: 'SECTION_SET_ACTIVE'; payload: { sectionId: string } }

    // entity ops (scoped to a section)
    | { type: 'ENTITY_ADD'; payload: { sectionId: string; entityType: EntityType; data: Record<string, unknown> } }
    | { type: 'ENTITY_UPDATE'; payload: { sectionId: string; entityType: EntityType; id: string; data: Record<string, unknown> } }
    | { type: 'ENTITY_DELETE'; payload: { sectionId: string; entityType: EntityType; id: string } }

    | { type: 'ENTITY_CLEAR_ALL'; payload: EntitiesState }

    // selection + active type
    | { type: 'SET_SELECTED'; payload: SelectedEntity | null }
    | { type: 'SET_ACTIVE_ENTITY_TYPE'; payload: EntityType }
    | { type: 'SET_ACTIVE_VIEW_TYPE'; payload: EditorViewType }

    // ON AIR
    | { type: 'SET_ON_AIR'; payload: { type: EntityType; id: string } }
    | { type: 'CLEAR_ON_AIR'; payload: { type: EntityType } }
