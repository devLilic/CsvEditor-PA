// src/features/csv-editor/hooks/useEntities.ts
import { useCallback, useMemo } from 'react'
import { useCsvContext } from '../context/CsvContext'
import type { EntityType, CsvSection, SimpleTitle, Person, Location, SectionRow } from '../domain/entities'
import type { SelectedEntity } from '../domain/csv.types'
import { isSupportedEntityType } from '../domain/supportedEntityTypes'
import { isPhoneCallPerson } from '../domain/phoneCall'
import { createDefaultProjectEntities } from '../domain/defaultProject'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../domain/defaultProjectSettings'
import { csvService } from '../services/csvService'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { settingsService } from '../services/settingsService'
import { serializeCsv } from '../utils/csvSerializer'

type BlockItem =
    | { entityType: 'titles'; id: string; rowId: string; data: SimpleTitle }
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

function rowsToBlockItems(section: CsvSection, entityType: EntityType): BlockItem[] {
    const out: BlockItem[] = []

    for (const r of section.rows) {
        if (entityType === 'titles' && r.title) out.push({ entityType: 'titles', id: r.title.id, rowId: r.id, data: r.title })
        if (entityType === 'persons' && r.person && !isPhoneCallPerson(r.person)) out.push({ entityType: 'persons', id: r.person.id, rowId: r.id, data: r.person })
        if (section.kind === 'invited' && entityType === 'phoneCalls' && r.person && isPhoneCallPerson(r.person)) out.push({ entityType: 'persons', id: r.person.id, rowId: r.id, data: r.person })
        if (section.kind === 'invited' && entityType === 'locations' && r.location) out.push({ entityType: 'locations', id: r.location.id, rowId: r.id, data: r.location })
        if (section.kind === 'invited' && entityType === 'hotTitles' && r.hotTitle) out.push({ entityType: 'hotTitles', id: r.hotTitle.id, rowId: r.id, data: r.hotTitle })
        if (section.kind === 'invited' && entityType === 'waitTitles' && r.waitTitle) out.push({ entityType: 'waitTitles', id: r.waitTitle.id, rowId: r.id, data: r.waitTitle })
        if (section.kind === 'invited' && entityType === 'waitLocations' && r.waitLocation) out.push({ entityType: 'waitLocations', id: r.waitLocation.id, rowId: r.id, data: r.waitLocation })
    }

    return out
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

    // -------- DELETE --------
    const deleteEntity = useCallback(
        (sectionId: string, entityType: EntityType, id: string) => {
            if (!isSupportedEntityType(entityType)) return
            dispatch({ type: 'ENTITY_DELETE', payload: { sectionId, entityType, id } })
        },
        [dispatch]
    )

    const resetToDefaultProject = useCallback(async (): Promise<ForceStartNewProjectWithoutBackupResult> => {
        const defaultProjectSettings = await defaultProjectSettingsService
            .getDefaultProjectSettings()
            .catch((error) => {
                console.error('Failed to read default project settings:', error)
                return FALLBACK_DEFAULT_PROJECT_SETTINGS
            })
        const nextEntities = createDefaultProjectEntities(defaultProjectSettings)

        // QuickTitles belong to the current project workflow; clear them after backup succeeds or explicit override.
        await settingsService.setQuickTitles([])

        dispatch({ type: 'ENTITY_CLEAR_ALL', payload: nextEntities })

        const defaultProjectCsv = serializeCsv(nextEntities)
        const writeRes = await csvService.write(defaultProjectCsv)
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
     * 1) serialize current CSV
     * 2) backup current CSV
     * 3) if backup succeeds, reset entities -> default project seed
     * 4) write default project CSV (so disk matches state)
     */
    const startNewProject = useCallback(async (): Promise<StartNewProjectResult> => {
        // 1) serialize and 2) backup current CSV before any reset/write.
        const currentCsv = serializeCsv(state.entities)
        const backupRes = await csvService.createBackup(currentCsv)
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
        deleteEntity,

        // global ops
        startNewProject,
        forceStartNewProjectWithoutBackup,
        // Legacy alias kept temporarily for old consumers. New code should use startNewProject.
        clearAll: startNewProject,
    }
}
