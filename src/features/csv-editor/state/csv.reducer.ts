// src/features/csv-editor/state/csv.reducer.ts
import { v4 as uuidv4 } from 'uuid'
import type { CsvState, CsvAction } from './csv.types'
import { EntityTypes } from '../domain/entities'
import type { CsvSection, SectionRow, Person, SimpleTitle, Location, EntityType } from '../domain/entities'
import { createBetaSection, createInvitedSection } from '../domain/entities'
import { isEditorViewType } from '../domain/editorViewTypes'

function getActiveViewType(state: CsvState) {
    return isEditorViewType(state.activeViewType)
        ? state.activeViewType
        : isEditorViewType(state.activeEntityType)
            ? state.activeEntityType
            : 'titles'
}

function withActiveViewType(state: CsvState, activeViewType: CsvState['activeViewType']): CsvState {
    return {
        ...state,
        activeViewType,
        activeEntityType: activeViewType,
    }
}

function isInvited(section: CsvSection) {
    return section.kind === 'invited'
}

function getStorageEntityType(entityType: EntityType): EntityType {
    return entityType === EntityTypes.PHONE_CALLS
        ? EntityTypes.PERSONS
        : entityType
}

function canUseEntityType(kind: CsvSection['kind'], entityType: EntityType): boolean {
    if (kind === 'invited') return true

    return entityType === EntityTypes.TITLES || entityType === EntityTypes.PERSONS
}

function slotIsEmpty(row: SectionRow, entityType: EntityType): boolean {
    switch (getStorageEntityType(entityType)) {
        case EntityTypes.TITLES:
            return !row.title
        case EntityTypes.PERSONS:
            return !row.person
        case EntityTypes.LOCATIONS:
            return !row.location
        case EntityTypes.HOT_TITLES:
            return !row.hotTitle
        case EntityTypes.WAIT_TITLES:
            return !row.waitTitle
        case EntityTypes.WAIT_LOCATIONS:
            return !row.waitLocation
        default:
            return true
    }
}

function setSlot(row: SectionRow, entityType: EntityType, value: any): SectionRow {
    switch (getStorageEntityType(entityType)) {
        case EntityTypes.TITLES:
            return { ...row, title: value as SimpleTitle }
        case EntityTypes.PERSONS:
            return { ...row, person: value as Person }
        case EntityTypes.LOCATIONS:
            return { ...row, location: value as Location }
        case EntityTypes.HOT_TITLES:
            return { ...row, hotTitle: value as SimpleTitle }
        case EntityTypes.WAIT_TITLES:
            return { ...row, waitTitle: value as SimpleTitle }
        case EntityTypes.WAIT_LOCATIONS:
            return { ...row, waitLocation: value as Location }
        default:
            return row
    }
}

function createEmptyRow(): SectionRow {
    return { id: uuidv4() }
}

function makeEntity(entityType: EntityType, data: Record<string, unknown>, allowPersonImage = true) {
    const storageEntityType = getStorageEntityType(entityType)

    if (storageEntityType === EntityTypes.PERSONS) {
        return {
            id: uuidv4(),
            name: String((data as any).name ?? ''),
            occupation: String((data as any).occupation ?? ''),
            image: allowPersonImage && typeof (data as any).image === 'string' && (data as any).image.trim() !== ''
                ? String((data as any).image)
                : undefined,
        } satisfies Person
    }

    if (storageEntityType === EntityTypes.LOCATIONS || storageEntityType === EntityTypes.WAIT_LOCATIONS) {
        return {
            id: uuidv4(),
            location: String((data as any).location ?? ''),
        } satisfies Location
    }

    // titles / hotTitles / waitTitles
    return {
        id: uuidv4(),
        title: String((data as any).title ?? ''),
    } satisfies SimpleTitle
}
function ensureInvitedLast(sections: CsvSection[]): CsvSection[] {
    const invited = sections.find((s) => s.kind === 'invited')
    if (!invited) {
        return [...sections, createInvitedSection(uuidv4(), [])]
    }
    const rest = sections.filter((s) => s.id !== invited.id)
    return [...rest, invited]
}

function reindexBetas(sections: CsvSection[]): CsvSection[] {
    const invited = sections.find((s) => s.kind === 'invited') ?? null
    const betas = sections.filter((s) => s.kind === 'beta')

    const re = betas.map((b, idx) => ({
        ...b,
        betaIndex: idx + 1,   // 🔥 începe de la 1
    }))

    return invited ? [...re, invited] : re
}

function findSection(sections: CsvSection[], sectionId: string): CsvSection | null {
    return sections.find((s) => s.id === sectionId) ?? null
}

function canUseWait(kind: CsvSection['kind'], entityType: EntityType): boolean {
    return canUseEntityType(kind, entityType)
}

function addRowWithEntity(section: CsvSection, entityType: EntityType, data: Record<string, unknown>): CsvSection {
    // append-only row model
    const row: SectionRow = { id: uuidv4() }

    switch (entityType) {
        case EntityTypes.TITLES: {
            const title = String((data as any).title ?? '').trim()
            row.title = { id: uuidv4(), title }
            break
        }
        case EntityTypes.PERSONS: {
            const name = String((data as any).name ?? '')
            const occupation = String((data as any).occupation ?? '')
            const image = String((data as any).image ?? '').trim()
            row.person = {
                id: uuidv4(),
                name,
                occupation,
                ...(image ? { image } : {}),
            }
            break
        }
        case EntityTypes.LOCATIONS: {
            const location = String((data as any).location ?? '')
            row.location = { id: uuidv4(), location }
            break
        }
        case EntityTypes.HOT_TITLES: {
            const title = String((data as any).title ?? '')
            row.hotTitle = { id: uuidv4(), title }
            break
        }
        case EntityTypes.WAIT_TITLES: {
            const title = String((data as any).title ?? '')
            row.waitTitle = { id: uuidv4(), title }
            break
        }
        case EntityTypes.WAIT_LOCATIONS: {
            const location = String((data as any).location ?? '')
            row.waitLocation = { id: uuidv4(), location }
            break
        }
        default:
            return section
    }

    return {
        ...section,
        rows: [...section.rows, row],
    }
}

function updateEntityInSection(section: CsvSection, entityType: EntityType, id: string, data: Record<string, unknown>): CsvSection {
    const storageEntityType = getStorageEntityType(entityType)
    const rows = section.rows.map((r) => {
        if (storageEntityType === EntityTypes.TITLES && r.title?.id === id) {
            return { ...r, title: { ...r.title, title: String((data as any).title ?? r.title.title) } }
        }
        if (storageEntityType === EntityTypes.PERSONS && r.person?.id === id) {
            const next: Person = {
                ...r.person,
                name: String((data as any).name ?? r.person.name),
                occupation: String((data as any).occupation ?? r.person.occupation),
                image: typeof (data as any).image === 'string'
                    ? ((data as any).image.trim() ? String((data as any).image) : undefined)
                    : r.person.image,
            }
            return { ...r, person: next }
        }
        if (storageEntityType === EntityTypes.LOCATIONS && r.location?.id === id) {
            const next: Location = { ...r.location, location: String((data as any).location ?? r.location.location) }
            return { ...r, location: next }
        }
        if (storageEntityType === EntityTypes.HOT_TITLES && r.hotTitle?.id === id) {
            const next: SimpleTitle = { ...r.hotTitle, title: String((data as any).title ?? r.hotTitle.title) }
            return { ...r, hotTitle: next }
        }
        if (storageEntityType === EntityTypes.WAIT_TITLES && r.waitTitle?.id === id) {
            const next: SimpleTitle = { ...r.waitTitle, title: String((data as any).title ?? r.waitTitle.title) }
            return { ...r, waitTitle: next }
        }
        if (storageEntityType === EntityTypes.WAIT_LOCATIONS && r.waitLocation?.id === id) {
            const next: Location = { ...r.waitLocation, location: String((data as any).location ?? r.waitLocation.location) }
            return { ...r, waitLocation: next }
        }
        return r
    })

    return { ...section, rows }
}

function isSlotOccupied(row: SectionRow, entityType: EntityType): boolean {
    switch (getStorageEntityType(entityType)) {
        case EntityTypes.TITLES: return Boolean(row.title)
        case EntityTypes.PERSONS: return Boolean(row.person)
        case EntityTypes.LOCATIONS: return Boolean(row.location)
        case EntityTypes.HOT_TITLES: return Boolean(row.hotTitle)
        case EntityTypes.WAIT_TITLES: return Boolean(row.waitTitle)
        case EntityTypes.WAIT_LOCATIONS: return Boolean(row.waitLocation)
        default: return false
    }
}

function getInsertIndexAfterLastOccupied(rows: SectionRow[], entityType: EntityType): number {
    let last = -1
    for (let i = 0; i < rows.length; i++) {
        if (isSlotOccupied(rows[i], entityType)) last = i
    }
    return last + 1
}

function ensureRowExists(rows: SectionRow[], index: number): SectionRow[] {
    if (index < rows.length) return rows
    const next = [...rows]
    while (next.length <= index) next.push({ id: uuidv4() })
    return next
}

function deleteEntityInSection(section: CsvSection, entityType: EntityType, id: string): CsvSection {
    const storageEntityType = getStorageEntityType(entityType)
    const rows = section.rows
        .map((r) => {
            if (storageEntityType === EntityTypes.TITLES && r.title?.id === id) return { ...r, title: undefined }
            if (storageEntityType === EntityTypes.PERSONS && r.person?.id === id) return { ...r, person: undefined }
            if (storageEntityType === EntityTypes.LOCATIONS && r.location?.id === id) return { ...r, location: undefined }
            if (storageEntityType === EntityTypes.HOT_TITLES && r.hotTitle?.id === id) return { ...r, hotTitle: undefined }
            if (storageEntityType === EntityTypes.WAIT_TITLES && r.waitTitle?.id === id) return { ...r, waitTitle: undefined }
            if (storageEntityType === EntityTypes.WAIT_LOCATIONS && r.waitLocation?.id === id) return { ...r, waitLocation: undefined }
            return r
        })
        // optional cleanup: remove rows that became empty
        .filter((r) => Boolean(r.title || r.person || r.location || r.hotTitle || r.waitTitle || r.waitLocation))

    return { ...section, rows }
}

export function csvReducer(state: CsvState, action: CsvAction): CsvState {
    switch (action.type) {
        case 'CSV_LOADED': {
            const sections = ensureInvitedLast(action.payload.sections ?? [])
            const previousActiveSectionExists = sections.some((section) => section.id === state.activeSectionId)
            const invitedSection = sections.find((section) => section.kind === 'invited')
            const activeSectionId = previousActiveSectionExists
                ? state.activeSectionId
                : invitedSection?.id ?? sections[0]?.id ?? null
            return {
                ...state,
                entities: { sections },
                isLoaded: true,
                activeSectionId,
            }
        }

        // ---------------- Sections ----------------
        case 'SECTION_SET_ACTIVE':
            return {
                ...state,
                activeSectionId: action.payload.sectionId,
            }

        case 'SECTION_ADD_BETA': {
            const betas = state.entities.sections.filter((s) => s.kind === 'beta')
            const betaIndex = betas.length + 1

            const betaTitle = String(action.payload.betaTitle ?? '').trim() || 'Titlu'

            const newBeta = createBetaSection(uuidv4(), betaIndex, betaTitle, [])

            const nextSections = reindexBetas([
                ...state.entities.sections.filter((s) => s.kind === 'beta'),
                newBeta,
                state.entities.sections.find((s) => s.kind === 'invited')!,
            ])

            return {
                ...state,
                entities: { ...state.entities, sections: nextSections },
                activeSectionId: newBeta.id,
            }
        }

        case 'SECTION_RENAME_BETA': {
            const next = state.entities.sections.map((s) => {
                if (s.id !== action.payload.sectionId) return s
                if (s.kind !== 'beta') return s
                return { ...s, betaTitle: action.payload.betaTitle }
            })
            return { ...state, entities: { sections: next } }
        }

        case 'SECTION_DELETE_BETA': {
            const target = state.entities.sections.find((s) => s.id === action.payload.sectionId)
            if (!target || target.kind !== 'beta') return state

            const next = reindexBetas(state.entities.sections.filter((s) => s.id !== target.id))
            const activeSectionId =
                state.activeSectionId === target.id
                    ? (next[0]?.id ?? null)
                    : state.activeSectionId

            return {
                ...state,
                entities: { sections: next },
                activeSectionId,
                selected: state.selected?.sectionId === target.id ? null : state.selected,
            }
        }

        // ---------------- Entity ops scoped to section ----------------
        case 'ENTITY_ADD': {
            const { sectionId, entityType, data } = action.payload

            const sections = state.entities.sections
            const sIdx = sections.findIndex((s) => s.id === sectionId)
            if (sIdx === -1) return state

            const section = sections[sIdx]

            // blocăm wait* în beta
            if (!canUseEntityType(section.kind, entityType)) return state

            const entity = makeEntity(entityType, data, section.kind === 'invited')

            // ✅ CANONICAL INSERT RULE:
            // insert AFTER last occupied slot for this entityType
            const insertIndex = getInsertIndexAfterLastOccupied(section.rows, entityType)
            const rowsEnsured = ensureRowExists(section.rows, insertIndex)

            const nextRows = rowsEnsured.map((r, i) =>
                i === insertIndex ? setSlot(r, entityType, entity) : r
            )

            const nextSections = sections.map((s, i) =>
                i === sIdx ? { ...section, rows: nextRows } : s
            )

            return {
                ...state,
                entities: { ...state.entities, sections: nextSections },
                activeSectionId: sectionId,
                activeViewType: getActiveViewType(state),
                activeEntityType: getActiveViewType(state),
            }
        }

        case 'ENTITY_UPDATE': {
            const { sectionId, entityType, id, data } = action.payload
            const sections = state.entities.sections.map((s) => {
                if (s.id !== sectionId) return s
                if (!canUseWait(s.kind, entityType)) return s
                return updateEntityInSection(s, entityType, id, data)
            })
            return { ...state, entities: { sections } }
        }

        case 'ENTITY_DELETE': {
            const { sectionId, entityType, id } = action.payload

            const nextOnAir = { ...state.onAir }
            if (nextOnAir[entityType] === id) delete nextOnAir[entityType]

            const sections = state.entities.sections.map((s) => {
                if (s.id !== sectionId) return s
                if (!canUseWait(s.kind, entityType)) return s
                return deleteEntityInSection(s, entityType, id)
            })

            const selected =
                state.selected?.id === id ? null : state.selected

            return {
                ...state,
                entities: { sections },
                selected,
                onAir: nextOnAir,
            }
        }

        case 'ENTITY_CLEAR_ALL':
            return {
                ...state,
                entities: action.payload,
                selected: null,
                onAir: {},
                activeSectionId: action.payload.sections[0]?.id ?? null,
            }

        // ---------------- Active/Selected ----------------
        case 'SET_ACTIVE_ENTITY_TYPE':
            return isEditorViewType(action.payload)
                ? withActiveViewType(state, action.payload)
                : { ...state, activeEntityType: action.payload }

        case 'SET_ACTIVE_VIEW_TYPE':
            return withActiveViewType(state, action.payload)

        case 'SET_SELECTED':
            return {
                ...state,
                selected: action.payload,
                activeSectionId: action.payload?.sectionId ?? state.activeSectionId,
            }

        // ---------------- ON AIR (kept) ----------------
        case 'SET_ON_AIR':
            return {
                ...state,
                onAir: {
                    ...state.onAir,
                    [action.payload.type]: action.payload.id,
                },
            }

        case 'CLEAR_ON_AIR': {
            const next = { ...state.onAir }
            delete next[action.payload.type]
            return { ...state, onAir: next }
        }

        default:
            return state
    }
}
