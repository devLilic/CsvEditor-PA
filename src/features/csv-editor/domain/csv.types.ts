// src/features/csv-editor/domain/csv.types.ts
import type { EntityType } from './entities'

export type SectionKind = 'beta' | 'invited'

export interface CsvSectionMeta {
    id: string
    kind: SectionKind

    // beta only
    betaIndex?: number
    betaTitle?: string
}

export interface SelectedEntity {
    sectionId: string
    entityType: EntityType
    id: string
}