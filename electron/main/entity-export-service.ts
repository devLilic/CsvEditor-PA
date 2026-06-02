import * as fs from 'node:fs'
import * as path from 'node:path'
import type { EntitiesState } from '../../src/features/csv-editor/domain/entities'
import {
    mapEntitiesStateToExportCsvs,
    mapFullCsvContentToExportCsvs,
    type EntityExportCsvs,
} from '../../src/features/entity-export/domain/entityExportMapper'
import type { EntityExportPaths } from '../../src/features/entity-export/domain/exportPathResolver'

const fsp = fs.promises
const DEFAULT_RETRY_COUNT = 3

export type EntityExportKind = 'titles' | 'persons' | 'locations' | 'phones' | 'waitTitlesLocations'

export interface EntityExportError {
    kind: EntityExportKind
    filePath: string
    error: Error
}

export interface EntityExportResult {
    ok: boolean
    error?: string
}

export interface ExportEntityCsvFilesInput {
    paths: EntityExportPaths
    csvs: EntityExportCsvs
    retryCount?: number
    onError?: (error: EntityExportError) => void
}

export interface ExportEntityCsvFilesFromFullCsvContentInput {
    paths: EntityExportPaths
    content: string
    retryCount?: number
    onError?: (error: EntityExportError) => void
}

export interface ExportEntityCsvFilesFromEntitiesInput {
    paths: EntityExportPaths
    entities: EntitiesState
    retryCount?: number
    onError?: (error: EntityExportError) => void
}

export interface ExportSingleEntityCsvInput {
    kind: EntityExportKind
    paths: EntityExportPaths
    csvs: EntityExportCsvs
    retryCount?: number
    onError?: (error: EntityExportError) => void
}

function getPathForKind(paths: EntityExportPaths, kind: EntityExportKind): string {
    switch (kind) {
        case 'titles':
            return paths.titlesPath
        case 'persons':
            return paths.personsPath
        case 'locations':
            return paths.locationsPath
        case 'phones':
            return paths.phonesPath
        case 'waitTitlesLocations':
            return paths.waitTitlesLocationsPath
    }
}

function getCsvForKind(csvs: EntityExportCsvs, kind: EntityExportKind): string {
    switch (kind) {
        case 'titles':
            return csvs.titlesCsv
        case 'persons':
            return csvs.personsCsv
        case 'locations':
            return csvs.locationsCsv
        case 'phones':
            return csvs.phonesCsv
        case 'waitTitlesLocations':
            return csvs.waitTitlesLocationsCsv
    }
}

function normalizeError(error: unknown): Error {
    if (error instanceof Error) {
        return error
    }

    return new Error(String(error))
}

function getRetryCount(retryCount: number | undefined): number {
    if (typeof retryCount !== 'number' || !Number.isFinite(retryCount)) {
        return DEFAULT_RETRY_COUNT
    }

    return Math.max(1, Math.floor(retryCount))
}

function notifyExportError(input: {
    kind: EntityExportKind
    filePath: string
    error: Error
    onError?: (error: EntityExportError) => void
}): void {
    const payload = {
        kind: input.kind,
        filePath: input.filePath,
        error: input.error,
    }

    if (input.onError) {
        input.onError(payload)
        return
    }

    console.error(`[entity-export:${input.kind}] failed:`, input.error)
}

async function writeEntityCsvWithRetry(input: {
    kind: EntityExportKind
    filePath: string
    csv: string
    retryCount?: number
    onError?: (error: EntityExportError) => void
}): Promise<EntityExportResult> {
    const attempts = getRetryCount(input.retryCount)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            await fsp.mkdir(path.dirname(input.filePath), { recursive: true })
            await fsp.writeFile(input.filePath, input.csv, {
                encoding: 'utf-8',
                flag: 'w',
            })

            return { ok: true }
        } catch (error) {
            lastError = normalizeError(error)
        }
    }

    const finalError = lastError ?? new Error('UNKNOWN_ENTITY_EXPORT_ERROR')
    notifyExportError({
        kind: input.kind,
        filePath: input.filePath,
        error: finalError,
        onError: input.onError,
    })

    return {
        ok: false,
        error: finalError.message,
    }
}

export async function exportSingleEntityCsv(input: ExportSingleEntityCsvInput): Promise<EntityExportResult> {
    return writeEntityCsvWithRetry({
        kind: input.kind,
        filePath: getPathForKind(input.paths, input.kind),
        csv: getCsvForKind(input.csvs, input.kind),
        retryCount: input.retryCount,
        onError: input.onError,
    })
}

export async function exportEntityCsvFiles(input: ExportEntityCsvFilesInput): Promise<EntityExportResult> {
    for (const kind of ['titles', 'persons', 'locations', 'phones', 'waitTitlesLocations'] satisfies EntityExportKind[]) {
        const result = await exportSingleEntityCsv({
            kind,
            paths: input.paths,
            csvs: input.csvs,
            retryCount: input.retryCount,
            onError: input.onError,
        })

        if (!result.ok) {
            return result
        }
    }

    return { ok: true }
}

export async function exportEntityCsvFilesFromFullCsvContent(
    input: ExportEntityCsvFilesFromFullCsvContentInput
): Promise<EntityExportResult> {
    return exportEntityCsvFiles({
        paths: input.paths,
        csvs: mapFullCsvContentToExportCsvs(input.content),
        retryCount: input.retryCount,
        onError: input.onError,
    })
}

export async function exportEntityCsvFilesFromEntities(
    input: ExportEntityCsvFilesFromEntitiesInput
): Promise<EntityExportResult> {
    return exportEntityCsvFiles({
        paths: input.paths,
        csvs: mapEntitiesStateToExportCsvs(input.entities),
        retryCount: input.retryCount,
        onError: input.onError,
    })
}
