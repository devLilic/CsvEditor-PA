import type { BroadcastTextLayer } from '@/shared/preview/templateContract'
import type { TemplateDocument } from './templateDocument'

const NAME_LAYER_ID = 'person-name-text'
const OCCUPATION_LAYER_ID = 'person-occupation-text'
export type PersonDisplayMode = 'single-line' | 'two-lines'

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

/** Retains the same name and occupation fields, but displays them as separate text layers. */
export function ensureTwoLinePersonTemplate(document: TemplateDocument): TemplateDocument {
    ensureTwoLineTemplate(document.templates.persons)
    for (const template of Object.values(document.lowerThirdVariants.persons)) ensureTwoLineTemplate(template)
    return document
}

export function applyPersonDisplayMode(document: TemplateDocument, mode: PersonDisplayMode): TemplateDocument {
    return mode === 'two-lines'
        ? ensureTwoLinePersonTemplate(document)
        : ensureSingleLinePersonTemplate(document)
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

function ensureTwoLineTemplate(template: TemplateDocument['templates']['persons']): void {
    const nameLayer = template.layers.find((layer) => layer.id === NAME_LAYER_ID && layer.type === 'text')
        ?? template.layers.find((layer) => layer.type === 'text' && layer.fieldId === 'name')
    if (nameLayer?.type !== 'text' || !nameLayer.textParts?.length) return

    const namePart = nameLayer.textParts.find((part) => part.fieldId === 'name') ?? nameLayer.textParts[0]
    const occupationPart = nameLayer.textParts.find((part) => part.fieldId === 'occupation')
    const occupationLayer = template.layers.find((layer) => layer.id === OCCUPATION_LAYER_ID && layer.type === 'text')
        ?? template.layers.find((layer) => layer.type === 'text' && layer.fieldId === 'occupation')

    nameLayer.fieldId = namePart.fieldId
    nameLayer.fallbackText = namePart.fallbackText ?? nameLayer.fallbackText
    nameLayer.fieldDefaultValue = namePart.fieldDefaultValue ?? nameLayer.fieldDefaultValue
    nameLayer.textStyle.transform = namePart.transform
    delete nameLayer.textParts

    if (!occupationPart) return
    if (occupationLayer?.type === 'text') {
        occupationLayer.fieldId = occupationPart.fieldId
        occupationLayer.fallbackText = occupationPart.fallbackText ?? occupationLayer.fallbackText
        occupationLayer.fieldDefaultValue = occupationPart.fieldDefaultValue ?? occupationLayer.fieldDefaultValue
        occupationLayer.textStyle.transform = occupationPart.transform
        occupationLayer.visible = true
        return
    }

    const newLayer: BroadcastTextLayer = {
        ...JSON.parse(JSON.stringify(nameLayer)) as BroadcastTextLayer,
        id: OCCUPATION_LAYER_ID,
        type: 'text',
        fieldId: occupationPart.fieldId,
        fallbackText: occupationPart.fallbackText ?? 'Funcție',
        fieldDefaultValue: occupationPart.fieldDefaultValue,
        visible: true,
        y: nameLayer.y + nameLayer.height,
        zIndex: Math.max(...template.layers.map((layer) => layer.zIndex), nameLayer.zIndex) + 1,
        textStyle: { ...nameLayer.textStyle, transform: occupationPart.transform },
    }
    template.layers.push(newLayer)
}
