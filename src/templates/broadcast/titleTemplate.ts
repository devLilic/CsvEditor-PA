import type { BroadcastTemplate } from '@/shared/preview/templateContract'
import bg from '@/assets/bg/PA_bg.png'

export const titleTemplate: BroadcastTemplate = {
    id: 'title',
    name: 'Title Lower Third',
    canvas: {
        width: 1920,
        height: 1080,
        background: {
            type: 'image',
            value: bg,
            objectFit: 'contain',
        },
    },
    layers: [
        {
            id: 'title-config-anchor',
            type: 'shape',
            shapeType: 'rect',
            x: 595,
            y: 916,
            width: 1229,
            height: 40,
            zIndex: 1,
            visible: false,
            fill: {
                type: 'solid',
                value: 'transparent',
            },
        },
        {
            id: 'title-main-text',
            type: 'text',
            x: 592,
            y: 884,
            width: 1229,
            height: 80,
            zIndex: 2,
            fieldId: 'title',
            fallbackText: 'TITLU',
            fitInBox: true,
            fitMode: 'scaleX',
            minScaleX: 0.65,
            textStyle: {
                fontFamily: 'inherit',
                fontSize: 68,
                fontWeight: 700,
                color: '#111111',
                align: 'left',
                lineHeight: 1,
                letterSpacing: '-0.08em',
                transform: 'uppercase',
            },
        },
    ],
}
