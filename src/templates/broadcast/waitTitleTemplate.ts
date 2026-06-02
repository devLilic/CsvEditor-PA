import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import bg from '@/assets/bg/PA_bg.png'

export const waitTitleTemplate: BroadcastTemplate = {
    id: 'wait-title',
    name: 'Wait Title',
    canvas: {
        width: 1920,
        height: 1080,
        background: { type: 'image', value: bg, objectFit: 'contain' },
    },
    layers: [
        {
            id: 'wait-title-panel',
            type: 'shape',
            shapeType: 'rect',
            x: 560,
            y: 860,
            width: 1260,
            height: 110,
            zIndex: 1,
            fill: { type: 'solid', value: '#ffffff' },
        },
        {
            id: 'wait-title-text',
            type: 'text',
            x: 600,
            y: 882,
            width: 1180,
            height: 72,
            zIndex: 2,
            fieldId: 'title',
            fallbackText: 'TITLU AȘTEPTARE',
            fitInBox: true,
            fitMode: 'scaleX',
            minScaleX: 0.65,
            textStyle: {
                fontFamily: 'inherit',
                fontSize: 58,
                fontWeight: 800,
                color: '#111111',
                align: 'left',
                lineHeight: 1,
                transform: 'uppercase',
            },
        },
    ],
}
