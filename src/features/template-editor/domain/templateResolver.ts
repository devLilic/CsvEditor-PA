import bundledDefaultTemplateDocument from '@/templates/broadcast/defaultTemplates.oc.json'
import {
    isTemplateDocument,
    type TemplateDocument,
} from './templateDocument'

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
    if (isTemplateDocument(userDocument)) {
        return clone(userDocument)
    }

    if (isTemplateDocument(bundledDefaultDocument)) {
        return clone(bundledDefaultDocument)
    }

    return clone(hardcodedDocument)
}
