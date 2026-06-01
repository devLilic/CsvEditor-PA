import type { EntityType } from './entities'

export const EditorViewTypes = {
    TITLES: 'titles',
    PERSONS: 'persons',
    LOCATIONS: 'locations',
    PHONE_CALLS: 'phoneCalls',
} as const

export type EditorViewType =
    | 'titles'
    | 'persons'
    | 'locations'
    | 'phoneCalls'

export function isEditorViewType(value: string): value is EditorViewType {
    return Object.values(EditorViewTypes).includes(value as EditorViewType)
}

export function getCsvEntityTypeForEditorView(viewType: EditorViewType): EntityType {
    return viewType === EditorViewTypes.PHONE_CALLS
        ? 'persons'
        : viewType
}
