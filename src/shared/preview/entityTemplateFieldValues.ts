import type { BroadcastTemplate } from './templateContract'

/** Text-backed template field IDs, in visual layer order, without duplicates. */
export function getTemplateTextFieldIds(template: BroadcastTemplate | undefined): string[] {
    if (!template) return []
    const ids: string[] = []
    const seen = new Set<string>()
    const add = (fieldId: unknown) => {
        if (typeof fieldId !== 'string' || !fieldId.trim() || seen.has(fieldId)) return
        seen.add(fieldId)
        ids.push(fieldId)
    }

    for (const layer of template.layers) {
        if (layer.type !== 'text' || layer.visible === false) continue
        add(layer.fieldId)
        for (const part of layer.textParts ?? []) add(part.fieldId)
    }
    return ids
}

/**
 * Expose only the custom values consumed by this exact template. This prevents
 * stale fields from another template/show from leaking into previews or exports.
 */
export function getTemplateCustomFieldValues(
    customFields: Record<string, unknown> | undefined,
    template: BroadcastTemplate | undefined,
    reservedFieldIds: readonly string[] = [],
): Record<string, string> {
    if (!customFields || !template) return {}
    const reserved = new Set(reservedFieldIds.map((fieldId) => fieldId.trim().toLocaleLowerCase()))
    const result: Record<string, string> = {}
    const fieldsForRender = new Set(getTemplateTextFieldIds(template))
    for (const layer of template.layers) {
        if (layer.visible !== false && typeof layer.visibleWhenField === 'string') {
            fieldsForRender.add(layer.visibleWhenField)
        }
    }
    for (const fieldId of fieldsForRender) {
        if (reserved.has(fieldId.trim().toLocaleLowerCase())) continue
        const value = customFields[fieldId]
        if (typeof value === 'string') result[fieldId] = value
    }
    return result
}
