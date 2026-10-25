import { csvReducer } from '../state/csv.reducer'
import type { CsvAction, CsvState } from '../state/csv.types'
import type { SectionRow } from '../domain/entities'
import type { PlateauTitleListItem } from '../domain/plateauTitleList'
import { reorderPlateauTitleItems } from '../domain/reorderPlateauTitleItems'
import { serializeCsv } from '../utils/csvSerializer'
import { csvService } from './csvService'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import type { LowerThirdTypeDefinition } from '@/features/lower-thirds/domain/lowerThirdTypes'

export type ReorderPlateauTitlesResult =
    | { ok: true }
    | { ok: false; error?: string }

type ReorderPlateauTitlesInput = {
    state: CsvState
    sectionId: string
    activeId: string
    overId: string
    dispatch: (action: CsvAction) => void
    projectId?: string
    lowerThirdTypes?: LowerThirdTypeDefinition[]
}

const CONSECUTIVE_TITLE_DIVIDERS_DROP_ERROR = 'Nu pot exista două separatoare consecutive.'

function rowsToPlateauTitleListItems(rows: SectionRow[]): PlateauTitleListItem[] {
    return rows.flatMap<PlateauTitleListItem>((row) => {
        if (row.title) return [{ type: 'title', rowId: row.id } satisfies PlateauTitleListItem]
        if (row.titleDivider) return [row.titleDivider]
        return []
    })
}

function getReorderError(reason: string): string {
    return reason === 'consecutive-dividers'
        ? CONSECUTIVE_TITLE_DIVIDERS_DROP_ERROR
        : 'TITLE_REORDER_FAILED'
}

export const reorderPlateauTitlesService = {
    async reorder(input: ReorderPlateauTitlesInput): Promise<ReorderPlateauTitlesResult> {
        const section = input.state.entities.sections.find((candidate) => candidate.id === input.sectionId)
        if (!section || section.kind !== 'invited') {
            return { ok: false, error: 'TITLE_REORDER_NOT_ALLOWED' }
        }

        const snapshotItems = rowsToPlateauTitleListItems(section.rows)
        const reorderResult = reorderPlateauTitleItems(snapshotItems, input.activeId, input.overId)
        if (!reorderResult.ok) {
            return { ok: false, error: getReorderError(reorderResult.reason) }
        }

        const reorderAction = {
            type: 'TITLE_LIST_REORDER',
            payload: { sectionId: section.id, items: reorderResult.items },
        } satisfies CsvAction
        const nextState = csvReducer(input.state, reorderAction)
        if (nextState === input.state) {
            return { ok: false, error: 'TITLE_REORDER_FAILED' }
        }

        input.dispatch(reorderAction)

        const lowerThirdTypes = input.lowerThirdTypes ?? await lowerThirdTypesService.get()
        const writeResult = await csvService.write(serializeCsv(nextState.entities), nextState.entities, lowerThirdTypes, input.projectId)
        if (!writeResult.ok) {
            console.error('Failed to reorder title list:', writeResult.error)
            input.dispatch({
                type: 'TITLE_LIST_REORDER',
                payload: { sectionId: section.id, items: snapshotItems },
            })
            return { ok: false, error: writeResult.error ?? 'WRITE_FAILED' }
        }

        return { ok: true }
    },
}
