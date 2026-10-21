import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.pa.json'
import {
    isTemplateDocument,
    migrateLegacyTemplateDocument,
    type TemplateDocument,
} from './templateDocument'
import { ensureTitlesSupratitleLayers } from './supratitleLayers'

type TemplateResolverInput = {
    userDocument?: unknown
    bundledDefaultDocument?: unknown
    hardcodedDocument: TemplateDocument
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

export function resolveTemplateDocument({
    userDocument,
    bundledDefaultDocument = bundledDefaultTemplateDocument,
    hardcodedDocument,
}: TemplateResolverInput): TemplateDocument {
    const migratedUserDocument = migrateLegacyTemplateDocument(userDocument)
    if (migratedUserDocument) return withTitlesSupratitleLayers(migratedUserDocument)
    if (isTemplateDocument(userDocument)) return withTitlesSupratitleLayers(userDocument)

    const migratedBundledDocument = migrateLegacyTemplateDocument(bundledDefaultDocument)
    if (migratedBundledDocument) return withTitlesSupratitleLayers(migratedBundledDocument)
    if (isTemplateDocument(bundledDefaultDocument)) return withTitlesSupratitleLayers(bundledDefaultDocument)

    return withTitlesSupratitleLayers(hardcodedDocument)
}

function withTitlesSupratitleLayers(document: TemplateDocument): TemplateDocument {
    const nextDocument = clone(document)
    nextDocument.templates.titles = ensureTitlesSupratitleLayers(nextDocument.templates.titles)
    for (const [typeId, template] of Object.entries(nextDocument.lowerThirdVariants.titles)) {
        nextDocument.lowerThirdVariants.titles[typeId] = ensureTitlesSupratitleLayers(template)
    }
    return nextDocument
}
