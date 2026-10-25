// src/features/csv-editor/hooks/useEntities.ts
import { useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useCsvContext } from '../context/CsvContext'
import { csvReducer } from '../state/csv.reducer'
import type { EntityType, CsvSection, SimpleTitle, Person, Location, SectionRow } from '../domain/entities'
import type { SelectedEntity } from '../domain/csv.types'
import { canInsertDividerAt, type PlateauTitleListItem } from '../domain/plateauTitleList'
import { isSupportedEntityType } from '../domain/supportedEntityTypes'
import { isPhoneCallPerson } from '../domain/phoneCall'
import { createDefaultProjectEntities } from '../domain/defaultProject'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../domain/defaultProjectSettings'
import { csvService } from '../services/csvService'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { settingsService } from '../services/settingsService'
import { reorderPlateauTitlesService } from '../services/reorderPlateauTitlesService'
import { serializeCsv } from '../utils/csvSerializer'
import * as quickTitlesCsvStorageService from '../../quick-titles/services/quickTitlesCsvStorageService'
import type { TitleBackupListItem } from '@/features/title-backup/domain/titleBackupCsv'
import { importPlateauTitles } from '@/features/title-backup/services/importPlateauTitlesService'
import { titleBackupReservationService } from '@/features/title-backup/services/titleBackupReservationService'

type BlockItem =
    | { type: 'title'; entityType: 'titles'; id: string; rowId: string; data: SimpleTitle }
    | { type: 'divider'; id: string }
    | { entityType: 'persons'; id: string; rowId: string; data: Person }
    | { entityType: 'locations'; id: string; rowId: string; data: Location }
    | { entityType: 'hotTitles'; id: string; rowId: string; data: SimpleTitle }
    | { entityType: 'waitTitles'; id: string; rowId: string; data: SimpleTitle }
    | { entityType: 'waitLocations'; id: string; rowId: string; data: Location }

export type StartNewProjectResult =
    | { ok: true }
    | { ok: false; reason: 'BACKUP_FAILED'; error?: string }
    | { ok: false; error?: string }

export type ForceStartNewProjectWithoutBackupResult =
    | { ok: true }
    | { ok: false; error?: string }

export type SavePersonResult =
    | { ok: true }
    | { ok: false; error?: string }

export type PlateauTitleDividerResult =
    | { ok: true; dividerId?: string }
    | { ok: false; error?: string }

export type PlateauTitleReorderResult =
    | { ok: true }
    | { ok: false; error?: string }

const CONSECUTIVE_TITLE_DIVIDERS_ERROR = 'Nu pot fi adăugate două separatoare consecutive.'

function rowsToBlockItems(section: CsvSection, entityType: EntityType): BlockItem[] {
    const out: BlockItem[] = []

    for (const r of section.rows) {
        if (entityType === 'titles' && r.title) out.push({ type: 'title', entityType: 'titles', id: r.title.id, rowId: r.id, data: r.title })
        if (section.kind === 'invited' && entityType === 'titles' && r.titleDivider) out.push({ type: 'divider', id: r.titleDivider.id })
        if (entityType === 'persons' && r.person && !isPhoneCallPerson(r.person)) out.push({ entityType: 'persons', id: r.person.id, rowId: r.id, data: r.person })
        if (section.kind === 'invited' && entityType === 'phoneCalls' && r.person && isPhoneCallPerson(r.person)) out.push({ entityType: 'persons', id: r.person.id, rowId: r.id, data: r.person })
        if (section.kind === 'invited' && entityType === 'locations' && r.location) out.push({ entityType: 'locations', id: r.location.id, rowId: r.id, data: r.location })
        if (section.kind === 'invited' && entityType === 'hotTitles' && r.hotTitle) out.push({ entityType: 'hotTitles', id: r.hotTitle.id, rowId: r.id, data: r.hotTitle })
        if (section.kind === 'invited' && entityType === 'waitTitles' && r.waitTitle) out.push({ entityType: 'waitTitles', id: r.waitTitle.id, rowId: r.id, data: r.waitTitle })
        if (section.kind === 'invited' && entityType === 'waitLocations' && r.waitLocation) out.push({ entityType: 'waitLocations', id: r.waitLocation.id, rowId: r.id, data: r.waitLocation })
    }

    return out
}

function rowsToPlateauTitleListItems(rows: SectionRow[]): PlateauTitleListItem[] {
    return rows.flatMap<PlateauTitleListItem>((row) => {
        if (row.title) return [{ type: 'title', rowId: row.id } satisfies PlateauTitleListItem]
        if (row.titleDivider) return [row.titleDivider]
        return []
    })
}

function matchesPlateauTitleListItem(row: SectionRow, item: PlateauTitleListItem, itemId: string): boolean {
    if (item.type === 'title') {
        return item.rowId === itemId || row.id === itemId || row.title?.id === itemId
    }

    return item.id === itemId || row.id === itemId
}

function getDividerInsertIndex(rows: SectionRow[], afterItemId?: string): number {
    const items = rowsToPlateauTitleListItems(rows)

    if (!afterItemId) {
        return items.length
    }

    const insertIndex = items.findIndex((item) => {
        const row = item.type === 'title'
            ? rows.find((candidate) => candidate.id === item.rowId)
            : rows.find((candidate) => candidate.titleDivider?.id === item.id)

        return row ? matchesPlateauTitleListItem(row, item, afterItemId) : false
    })

    return insertIndex < 0 ? items.length : insertIndex + 1
}

export function useEntities() {
    const { state, dispatch } = useCsvContext()

    const sections = state.entities.sections

    const getSectionById = useCallback(
        (sectionId: string) => sections.find((s) => s.id === sectionId) ?? null,
        [sections]
    )

    const activeSectionId = state.activeSectionId
    const activeSection = useMemo(
        () => (activeSectionId ? sections.find((s) => s.id === activeSectionId) ?? null : sections[0] ?? null),
        [activeSectionId, sections]
    )

    // -------- Sections ops --------
    const setActiveSection = useCallback(
        (sectionId: string) => dispatch({ type: 'SECTION_SET_ACTIVE', payload: { sectionId } }),
        [dispatch]
    )

    const addBetaSection = useCallback(
        (betaTitle: string) => dispatch({ type: 'SECTION_ADD_BETA', payload: { betaTitle } }),
        [dispatch]
    )

    const renameBetaSection = useCallback(
        (sectionId: string, betaTitle: string) =>
            dispatch({ type: 'SECTION_RENAME_BETA', payload: { sectionId, betaTitle } }),
        [dispatch]
    )

    const deleteBetaSection = useCallback(
        (sectionId: string) => dispatch({ type: 'SECTION_DELETE_BETA', payload: { sectionId } }),
        [dispatch]
    )

    // -------- READ block items --------
    const getBlockItems = useCallback(
        (sectionId: string, entityType: EntityType): BlockItem[] => {
            if (!isSupportedEntityType(entityType)) return []
            const s = sections.find((x) => x.id === sectionId)
            if (!s) return []
            return rowsToBlockItems(s, entityType)
        },
        [sections]
    )

    // -------- SELECT --------
    const selected = state.selected

    const setSelected = useCallback(
        (sel: SelectedEntity | null) => dispatch({ type: 'SET_SELECTED', payload: sel }),
        [dispatch]
    )

    // -------- CREATE --------
    const addEntity = useCallback(
        (sectionId: string, entityType: EntityType, data: Record<string, unknown>) => {
            if (!isSupportedEntityType(entityType)) return
            dispatch({ type: 'ENTITY_ADD', payload: { sectionId, entityType, data } })
        },
        [dispatch]
    )

    // -------- UPDATE --------
    const updateEntity = useCallback(
        (sectionId: string, entityType: EntityType, id: string, data: Record<string, unknown>) => {
            if (!isSupportedEntityType(entityType)) return
            dispatch({ type: 'ENTITY_UPDATE', payload: { sectionId, entityType, id, data } })
        },
        [dispatch]
    )

    const savePersonEntity = useCallback(async (input: {
        sectionId: string
        id?: string
        data: Record<string, unknown>
    }): Promise<SavePersonResult> => {
        const name = String(input.data.name ?? '').trim()
        if (!name) {
            return { ok: false, error: 'INVALID_PERSON' }
        }

        const action = input.id
            ? {
                type: 'ENTITY_UPDATE' as const,
                payload: {
                    sectionId: input.sectionId,
                    entityType: 'persons' as const,
                    id: input.id,
                    data: input.data,
                },
            }
            : {
                type: 'ENTITY_ADD' as const,
                payload: {
                    sectionId: input.sectionId,
                    entityType: 'persons' as const,
                    data: input.data,
                },
            }
        const nextState = csvReducer(state, action)

        if (nextState === state) {
            return { ok: false, error: 'PERSON_NOT_SAVED' }
        }

        dispatch(action)

        const lowerThirdTypes = await lowerThirdTypesService.get()
        const writeRes = await csvService.write(serializeCsv(nextState.entities), nextState.entities, lowerThirdTypes)
        if (!writeRes.ok) {
            console.error('Failed to save person:', writeRes.error)
            return { ok: false, error: writeRes.error ?? 'WRITE_FAILED' }
        }

        return { ok: true }
    }, [dispatch, state])

    // -------- DELETE --------
    const deleteEntity = useCallback(
        (sectionId: string, entityType: EntityType, id: string) => {
            if (!isSupportedEntityType(entityType)) return
            dispatch({ type: 'ENTITY_DELETE', payload: { sectionId, entityType, id } })
        },
        [dispatch]
    )

    const canModifyPlateauTitleDividers = useCallback(() => {
        if (state.activeViewType !== 'titles') return null

        const sectionId = state.activeSectionId
        if (!sectionId) return null

        const section = state.entities.sections.find((candidate) => candidate.id === sectionId)
        if (!section || section.kind !== 'invited') return null

        return section
    }, [state.activeSectionId, state.activeViewType, state.entities.sections])

    const writeDividerChange = useCallback(async (
        nextState: typeof state,
        errorPrefix: string
    ): Promise<PlateauTitleDividerResult> => {
        const lowerThirdTypes = await lowerThirdTypesService.get()
        const writeRes = await csvService.write(serializeCsv(nextState.entities), nextState.entities, lowerThirdTypes)
        if (!writeRes.ok) {
            console.error(errorPrefix, writeRes.error)
            return { ok: false, error: writeRes.error ?? 'WRITE_FAILED' }
        }

        return { ok: true }
    }, [])

    const addPlateauTitleDivider = useCallback(async (options?: {
        afterItemId?: string
    }): Promise<PlateauTitleDividerResult> => {
        const section = canModifyPlateauTitleDividers()
        if (!section) {
            return { ok: false, error: 'TITLE_DIVIDER_NOT_ALLOWED' }
        }

        const insertIndex = getDividerInsertIndex(section.rows, options?.afterItemId)
        const currentItems = rowsToPlateauTitleListItems(section.rows)
        if (!canInsertDividerAt(currentItems, insertIndex)) {
            return { ok: false, error: CONSECUTIVE_TITLE_DIVIDERS_ERROR }
        }

        const dividerId = uuidv4()
        const addAction = {
            type: 'TITLE_DIVIDER_ADD' as const,
            payload: { sectionId: section.id, id: dividerId, insertIndex },
        }
        const nextState = csvReducer(state, addAction)
        if (nextState === state) {
            return { ok: false, error: 'TITLE_DIVIDER_NOT_SAVED' }
        }

        const writeResult = await writeDividerChange(nextState, 'Failed to save title divider:')
        if (!writeResult.ok) return writeResult

        dispatch(addAction)

        return { ok: true, dividerId }
    }, [canModifyPlateauTitleDividers, dispatch, state, writeDividerChange])

    const deletePlateauTitleDivider = useCallback(async (
        dividerId: string
    ): Promise<PlateauTitleDividerResult> => {
        const section = canModifyPlateauTitleDividers()
        if (!section) {
            return { ok: false, error: 'TITLE_DIVIDER_NOT_ALLOWED' }
        }

        if (!section.rows.some((row) => row.titleDivider?.id === dividerId)) {
            return { ok: false, error: 'TITLE_DIVIDER_NOT_FOUND' }
        }

        const action = {
            type: 'TITLE_DIVIDER_DELETE' as const,
            payload: { sectionId: section.id, id: dividerId },
        }
        const nextState = csvReducer(state, action)

        const writeResult = await writeDividerChange(nextState, 'Failed to delete title divider:')
        if (!writeResult.ok) return writeResult

        dispatch(action)

        return { ok: true }
    }, [canModifyPlateauTitleDividers, dispatch, state, writeDividerChange])

    const reorderPlateauTitleItems = useCallback(async (
        activeId: string,
        overId: string
    ): Promise<PlateauTitleReorderResult> => {
        const section = canModifyPlateauTitleDividers()
        if (!section) {
            return { ok: false, error: 'TITLE_REORDER_NOT_ALLOWED' }
        }

        return reorderPlateauTitlesService.reorder({
            state,
            sectionId: section.id,
            activeId,
            overId,
            dispatch,
        })
    }, [canModifyPlateauTitleDividers, dispatch, state])

    const resetToDefaultProject = useCallback(async (): Promise<ForceStartNewProjectWithoutBackupResult> => {
        const defaultProjectSettings = await defaultProjectSettingsService
            .getDefaultProjectSettings()
            .catch((error) => {
                console.error('Failed to read default project settings:', error)
                return FALLBACK_DEFAULT_PROJECT_SETTINGS
            })
        const nextEntities = createDefaultProjectEntities(defaultProjectSettings)

        const titleBackupReservation = await titleBackupReservationService.reserveActiveTitleBackup(true)
        if (!titleBackupReservation.ok) {
            console.error('Failed to reserve title backup for new project:', titleBackupReservation.error)
            return {
                ok: false,
                error: `Title backup reserve failed: ${titleBackupReservation.error ?? 'UNKNOWN_ERROR'}`,
            }
        }

        // QuickTitles belong to the current project workflow; clear the authoritative CSV after backup succeeds or explicit override.
        const quickTitlesClearResult = await quickTitlesCsvStorageService.clearQuickTitlesCsv()
        if (!quickTitlesClearResult.ok) {
            console.error('Failed to clear quick titles CSV:', quickTitlesClearResult.error)
            return {
                ok: false,
                error: `QuickTitles clear failed: ${quickTitlesClearResult.error ?? 'UNKNOWN_ERROR'}`,
            }
        }

        await settingsService.setQuickTitles([])

        dispatch({ type: 'ENTITY_CLEAR_ALL', payload: nextEntities })

        const defaultProjectCsv = serializeCsv(nextEntities)
        const lowerThirdTypes = await lowerThirdTypesService.get()
        const writeRes = await csvService.write(defaultProjectCsv, nextEntities, lowerThirdTypes)
        if (!writeRes.ok) {
            console.error('Failed to write empty CSV:', writeRes.error)
            return {
                ok: false,
                error: `Write failed: ${writeRes.error ?? 'UNKNOWN_ERROR'}`,
            }
        }

        return { ok: true }
    }, [dispatch])

    // -------- START NEW PROJECT (CANONICAL) --------
    /**
     * Start a new project:
     * 1) serialize current state as JSON
     * 2) backup the current state
     * 3) if backup succeeds, reset entities -> default project seed
     * 4) persist default project state (so disk matches state)
     */
    const startNewProject = useCallback(async (): Promise<StartNewProjectResult> => {
        // 1) serialize and 2) back up the current state before reset.
        const currentSnapshot = JSON.stringify({ version: 1, entities: state.entities }, null, 2)
        const backupRes = await csvService.createBackup(currentSnapshot)
        if (!backupRes.ok) {
            console.error('Backup failed:', backupRes.error)
            return {
                ok: false,
                reason: 'BACKUP_FAILED',
                error: backupRes.error ?? 'UNKNOWN_ERROR',
            }
        }

        const resetRes = await resetToDefaultProject()
        if (!resetRes.ok) {
            return resetRes
        }

        return { ok: true }
    }, [resetToDefaultProject, state.entities])

    const forceStartNewProjectWithoutBackup = useCallback(
        async (): Promise<ForceStartNewProjectWithoutBackupResult> => resetToDefaultProject(),
        [resetToDefaultProject]
    )

    const importPlateauTitlesFromBackup = useCallback(async (
        selectedItems: TitleBackupListItem[]
    ) => importPlateauTitles({
        state,
        selectedItems,
        dispatch,
        deps: {
            createId: uuidv4,
            // csv:write in Electron already persists the full CSV and all derived export files in order.
            writeFullCsv: (content) => csvService.write(content),
            getActiveTitleBackupFile: async () => null,
            writeTitleBackup: async () => ({ ok: true }),
        },
    }), [dispatch, state])

    return {
        // state
        sections,
        activeSectionId,
        activeSection,
        activeViewType: state.activeViewType,
        // Legacy alias kept while UI consumers migrate to activeViewType.
        activeEntityType: state.activeEntityType,
        selected,

        // section ops
        getSectionById,
        setActiveSection,
        addBetaSection,
        renameBetaSection,
        deleteBetaSection,

        // entities ops
        getBlockItems,
        setSelected,
        addEntity,
        updateEntity,
        savePersonEntity,
        deleteEntity,
        addPlateauTitleDivider,
        deletePlateauTitleDivider,
        reorderPlateauTitleItems,

        // global ops
        startNewProject,
        forceStartNewProjectWithoutBackup,
        importPlateauTitlesFromBackup,
        // Legacy alias kept temporarily for old consumers. New code should use startNewProject.
        clearAll: startNewProject,
    }
}
