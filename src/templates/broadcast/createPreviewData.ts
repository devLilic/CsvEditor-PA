import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import { getTemplateCustomFieldValues } from '@/shared/preview/entityTemplateFieldValues'

type PreviewSourceData = {
    title?: string
    supratitle?: string
    name?: string
    occupation?: string
    location?: string
    image?: string
    customFields?: Record<string, unknown>
}

export function createPreviewData(
    entityType: string,
    data: PreviewSourceData,
    activeTemplate?: BroadcastTemplate,
): Record<string, string> {
    const reservedFields = entityType === 'titles'
        ? ['title', 'supratitle', 'nr']
        : entityType === 'persons'
            ? ['name', 'occupation', 'image']
            : entityType === 'phoneCalls'
                ? ['name', 'occupation', 'image']
                : entityType === 'locations' || entityType === 'waitLocations'
                    ? ['location']
                    : ['title']
    const customValues = getTemplateCustomFieldValues(data.customFields, activeTemplate, reservedFields)

    if (entityType === 'titles' || entityType === 'hotTitles' || entityType === 'waitTitles') {
        return {
            title: data.title ?? '',
            ...(entityType === 'titles' ? { supratitle: data.supratitle ?? '' } : {}),
            ...customValues,
        }
    }

    if (entityType === 'persons') {
        return {
            name: data.name ?? '',
            occupation: data.occupation ?? '',
            ...customValues,
        }
    }

    if (entityType === 'phoneCalls') {
        return {
            name: data.name ?? '',
            occupation: data.occupation ?? '',
            image: data.image ?? '',
            ...customValues,
        }
    }

    if (entityType === 'locations' || entityType === 'waitLocations') {
        return { location: data.location ?? '', ...customValues }
    }

    return {}
}

/** Explicitly named entry point for consumers that have the active template. */
export function createTemplatePreviewData(
    entityType: string,
    data: PreviewSourceData,
    activeTemplate: BroadcastTemplate,
): Record<string, string> {
    return createPreviewData(entityType, data, activeTemplate)
}
