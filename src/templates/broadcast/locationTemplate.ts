import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import bg from '@/assets/bg/OC_bg.png'

export const locationTemplate: BroadcastTemplate = {
    id: 'location',
    name: 'Location Bug',
    canvas: {
        width: 1920,
        height: 1080,
        background: {
            type: 'image',
            value: bg,
            // value: '/background.png',
            objectFit: 'contain',
        },
    },
    layers: [
        {
            id: 'location-shape-anchor',
            type: 'shape',
            shapeType: 'rect',
            x: 450,
            y: 840,
            width: 0,
            height: 0,
            zIndex: 1,
            visible: false,
            fill: {
                type: 'solid',
                value: 'transparent',
            },
        },
        {
            id: 'location-text',
            type: 'text',
            x: 438,
            y: 815,
            width: 134,
            height: 34,
            zIndex: 2,
            fieldId: 'location',
            fallbackText: 'LOCATIE',
            fitInBox: true,
            fitMode: 'scaleX',
            minScaleX: 0.65,
            textStyle: {
                fontFamily: 'inherit',
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                align: 'center',
                lineHeight: 1.6,
                transform: 'uppercase',
            },
        },
    ],
}
