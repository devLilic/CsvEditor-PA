import type { BroadcastImageLayer } from '@/shared/preview/templateContract'
import type { TemplateDocument } from './templateDocument'

export const PHONE_CALL_PERSON_IMAGE_LAYER_ID = 'phone-call-person-image'
export const PHONE_CALL_PERSON_IMAGE_SOURCE = '{image}'

export function hasFixedTemplateImageSource(layer: BroadcastImageLayer): boolean {
    return layer.id === PHONE_CALL_PERSON_IMAGE_LAYER_ID
}

export function enforceFixedTemplateFields(document: TemplateDocument): TemplateDocument {
    return {
        ...document,
        templates: {
            ...document.templates,
            phoneCalls: {
                ...document.templates.phoneCalls,
                layers: document.templates.phoneCalls.layers.map((layer) => (
                    layer.type === 'image' && hasFixedTemplateImageSource(layer)
                        ? {
                            ...layer,
                            src: PHONE_CALL_PERSON_IMAGE_SOURCE,
                        }
                        : layer
                )),
            },
        },
    }
}
