import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import bg from '@/assets/bg/PA_bg.png'

export const waitLocationTemplate: BroadcastTemplate = {
    id: 'wait-location',
    name: 'Wait Location',
    canvas: {
        width: 1920,
        height: 1080,
        background: { type: 'image', value: bg, objectFit: 'contain' },
    },
    layers: [
        {
            id: 'wait-location-accent',
            type: 'shape',
            shapeType: 'rect',
            x: 420,
            y: 812,
            width: 170,
            height: 42,
            zIndex: 1,
            fill: { type: 'solid', value: '#c70018' },
        },
        {
            id: 'wait-location-panel',
            type: 'shape',
            shapeType: 'rect',
            x: 580,
            y: 812,
            width: 560,
            height: 42,
            zIndex: 2,
            fill: { type: 'solid', value: '#ffffff' },
        },
        {
            id: 'wait-location-text',
            type: 'text',
            x: 600,
            y: 817,
            width: 520,
            height: 34,
            zIndex: 3,
            fieldId: 'location',
            fallbackText: 'LOCAȚIE AȘTEPTARE',
            fitInBox: true,
            fitMode: 'scaleX',
            minScaleX: 0.65,
            textStyle: {
                fontFamily: 'inherit',
                fontSize: 26,
                fontWeight: 800,
                color: '#111111',
                align: 'left',
                lineHeight: 1,
                transform: 'uppercase',
            },
        },
    ],
}
