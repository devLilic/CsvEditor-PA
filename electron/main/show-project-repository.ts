import * as fs from 'node:fs'
import * as path from 'node:path'
import { writeFile as writeFileAtomically, writeFileSync as writeFileSyncAtomically } from 'atomically'
import { app } from 'electron'
import { isShowProjectsState, migrateShowProjectsState, type LegacyShowSettingsSnapshot, type ShowProjectsState } from '../../src/features/show-projects/domain/showProject'

const FILE = 'broadcast-projects.json'
let cachedState: ShowProjectsState | null = null
let initialized = false
let initialization: Promise<ShowProjectsState | null> | null = null

export function getShowProjectsStateSync(): ShowProjectsState | null {
    return cachedState
}

export function getShowProjectsFilePath() {
    return path.join(app.getPath('userData'), FILE)
}

async function writeState(state: ShowProjectsState) {
    const filePath = getShowProjectsFilePath()
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await writeFileAtomically(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
}

export async function initializeShowProjectRepository(snapshot: LegacyShowSettingsSnapshot): Promise<ShowProjectsState | null> {
    if (initialized) return cachedState
    if (initialization) return initialization
    initialization = (async () => {
        const filePath = getShowProjectsFilePath()
        let parsed: unknown = null
        try {
            parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf-8'))
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') parsed = null
            else if (error instanceof SyntaxError) throw new Error('INVALID_SHOW_PROJECTS_FILE')
            else throw error
        }
        const migrated = migrateShowProjectsState(parsed, snapshot)
        if (migrated) {
            if (!isShowProjectsState(parsed)) await writeState(migrated)
            cachedState = migrated
        } else if (parsed === null) {
            cachedState = null
        } else {
            throw new Error('INVALID_SHOW_PROJECTS_FILE')
        }
        initialized = true
        return cachedState
    })()
    try {
        return await initialization
    } finally {
        initialization = null
    }
}

export async function saveShowProjectsState(state: ShowProjectsState): Promise<boolean> {
    return saveShowProjectsStateSync(state)
}

export function saveShowProjectsStateSync(state: ShowProjectsState): boolean {
    if (!isShowProjectsState(state)) return false
    const filePath = getShowProjectsFilePath()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSyncAtomically(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
    cachedState = JSON.parse(JSON.stringify(state)) as ShowProjectsState
    initialized = true
    return true
}

export async function updateShowProjectsState(update: (state: ShowProjectsState) => ShowProjectsState): Promise<ShowProjectsState | null> {
    const current = cachedState
    if (!current) return null
    const next = update(JSON.parse(JSON.stringify(current)) as ShowProjectsState)
    if (!isShowProjectsState(next)) throw new Error('INVALID_SHOW_PROJECTS_STATE')
    await saveShowProjectsState(next)
    return next
}

export function resetShowProjectRepositoryForTests() {
    cachedState = null
    initialized = false
    initialization = null
}
