import type { EntitiesState, SectionRow, SimpleTitle } from '@/features/csv-editor/domain/entities'
import type { CsvAction, CsvState } from '@/features/csv-editor/state/csv.types'
import { serializeCsv } from '@/features/csv-editor/utils/csvSerializer'
import type { TitleBackupListItem } from '../domain/titleBackupCsv'
import { serializeTitleBackup } from '../domain/titleBackupCsv'
import { mapPlateauItemsToTitleBackupItems } from './writeActiveTitleBackup'

export type ImportPlateauTitlesDeps = {
    createId(): string
    writeFullCsv(content: string): Promise<{ ok: boolean; error?: string }>
    getActiveTitleBackupFile(): Promise<string | null>
    writeTitleBackup(input: { filename: string; content: string }): Promise<{ ok: boolean; error?: string }>
}

export type ImportPlateauTitlesResult =
    | { ok: true; state: CsvState }
    | { ok: false; error: string; state: CsvState }

export type ImportPlateauTitlesInput = {
    state: CsvState
    selectedItems: TitleBackupListItem[]
    dispatch: (action: CsvAction) => void
    deps: ImportPlateauTitlesDeps
}

function createImportedTitleRow(title: string, createId: () => string): SectionRow {
    const rowId = createId()
    const titleEntity: SimpleTitle = {
        id: createId(),
        title,
    }

    return {
        id: rowId,
        title: titleEntity,
    }
}

function renumberPlateauTitles(rows: SectionRow[]): SectionRow[] {
    let nextNr = 1

    return rows.map((row) => {
        if (!row.title) {
            return row
        }

        const nextRow = {
            ...row,
            title: {
                ...row.title,
                nr: String(nextNr),
            },
        }
        nextNr += 1

        return nextRow
    })
}

export function appendSelectedPlateauTitles(input: {
    state: CsvState
    selectedItems: TitleBackupListItem[]
    createId: () => string
}): CsvState {
    const selectedTitles = input.selectedItems.flatMap((item) =>
        item.type === 'title' ? [item.title] : []
    )

    if (selectedTitles.length === 0) {
        return input.state
    }

    const sections = input.state.entities.sections.map((section) => {
        if (section.kind !== 'invited') {
            return section
        }

        const importedRows = selectedTitles.map((title) =>
            createImportedTitleRow(title, input.createId)
        )

        return {
            ...section,
            rows: renumberPlateauTitles([
                ...section.rows,
                ...importedRows,
            ]),
        }
    })

    return {
        ...input.state,
        entities: {
            sections,
        },
    }
}

function restoreState(dispatch: (action: CsvAction) => void, entities: EntitiesState): void {
    dispatch({
        type: 'ENTITY_CLEAR_ALL',
        payload: entities,
    })
}

export async function importPlateauTitles(
    input: ImportPlateauTitlesInput,
): Promise<ImportPlateauTitlesResult> {
    const previousEntities = input.state.entities
    const nextState = appendSelectedPlateauTitles({
        state: input.state,
        selectedItems: input.selectedItems,
        createId: input.deps.createId,
    })

    if (nextState === input.state) {
        return { ok: true, state: input.state }
    }

    input.dispatch({
        type: 'ENTITY_CLEAR_ALL',
        payload: nextState.entities,
    })

    const fullCsv = serializeCsv(nextState.entities)
    const fullCsvResult = await input.deps.writeFullCsv(fullCsv)
    if (!fullCsvResult.ok) {
        restoreState(input.dispatch, previousEntities)
        return {
            ok: false,
            error: fullCsvResult.error ?? 'FULL_CSV_WRITE_FAILED',
            state: input.state,
        }
    }

    const activeTitleBackupFile = await input.deps.getActiveTitleBackupFile()
    if (activeTitleBackupFile) {
        await input.deps.writeTitleBackup({
            filename: activeTitleBackupFile,
            content: serializeTitleBackup(mapPlateauItemsToTitleBackupItems(nextState.entities)),
        })
    }

    return {
        ok: true,
        state: nextState,
    }
}
