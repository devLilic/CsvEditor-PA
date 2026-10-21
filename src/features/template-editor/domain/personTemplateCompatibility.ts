import type { BroadcastTextLayer } from '@/shared/preview/templateContract'
import type { TemplateDocument } from './templateDocument'

const NAME_LAYER_ID = 'person-name-text'
const OCCUPATION_LAYER_ID = 'person-occupation-text'

export function hasSingleLinePersonTemplate(document: TemplateDocument): boolean {
    const templates = [document.templates.persons, ...Object.values(document.lowerThirdVariants.persons)]
    return templates.every((template) => {
        const nameLayer = template.layers.find((layer) => layer.id === NAME_LAYER_ID && layer.type === 'text')
        const occupationLayer = template.layers.find((layer) => layer.id === OCCUPATION_LAYER_ID && layer.type === 'text')
        return nameLayer?.type === 'text'
            && Boolean(nameLayer.textParts?.length)
            && (occupationLayer?.type !== 'text' || occupationLayer.visible === false)
    })
}

/**
 * Converts the built-in two-line person graphic into one editable composite
 * text layer. The legacy occupation layer is retained but hidden so existing
 * user styling remains available in the template editor.
 */
export function ensureSingleLinePersonTemplate(document: TemplateDocument): TemplateDocument {
    ensureSingleLineTemplate(document.templates.persons)
    for (const template of Object.values(document.lowerThirdVariants.persons)) ensureSingleLineTemplate(template)
    return document
}

function ensureSingleLineTemplate(template: TemplateDocument['templates']['persons']): void {
    const nameLayer = template.layers.find((layer) => layer.id === NAME_LAYER_ID && layer.type === 'text')
    const occupationLayer = template.layers.find((layer) => layer.id === OCCUPATION_LAYER_ID && layer.type === 'text')

    if (nameLayer?.type === 'text' && occupationLayer?.type === 'text') {
        if (!nameLayer.textParts?.length) {
            const legacyName = nameLayer as BroadcastTextLayer
            const legacyOccupation = occupationLayer as BroadcastTextLayer
            legacyName.width = Math.max(legacyName.width, legacyOccupation.width)
            legacyName.textParts = [
                {
                    fieldId: legacyName.fieldId,
                    fieldDefaultValue: legacyName.fieldDefaultValue,
                    fallbackText: legacyName.fallbackText,
                    transform: 'uppercase',
                },
                {
                    fieldId: legacyOccupation.fieldId,
                    prefix: ', ',
                    fieldDefaultValue: legacyOccupation.fieldDefaultValue,
                    fallbackText: legacyOccupation.fallbackText,
                    transform: legacyOccupation.textStyle.transform,
                },
            ]
            if (legacyName.textStyle.transform === 'uppercase') {
                delete legacyName.textStyle.transform
            }
        }

        occupationLayer.visible = false
    }

}
