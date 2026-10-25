import { describe, expect, it } from 'vitest'
import { broadcastTemplates } from '@/templates/broadcast'
import { createTemplateDocumentFromTemplates } from './templateDocument'
import { applyPersonDisplayMode, ensureSingleLinePersonTemplate } from './personTemplateCompatibility'

describe('ensureSingleLinePersonTemplate', () => {
    it('migrates legacy persons layers while preserving their editable styles and document settings', () => {
        const document = createTemplateDocumentFromTemplates(broadcastTemplates)
        document.disabledEntityTypes = ['hotTitles']
        document.templates.persons.layers = [
            {
                id: 'person-name-text',
                type: 'text',
                x: 321,
                y: 654,
                width: 480,
                height: 55,
                zIndex: 4,
                fieldId: 'name',
                fallbackText: 'Name fallback',
                fitInBox: true,
                fitMode: 'scaleX',
                minScaleX: 0.2,
                textStyle: {
                    fontFamily: 'Custom font',
                    fontSize: 31,
                    fontWeight: 700,
                    color: '#123456',
                    align: 'left',
                    transform: 'uppercase',
                },
            },
            {
                id: 'person-occupation-text',
                type: 'text',
                x: 321,
                y: 720,
                width: 950,
                height: 60,
                zIndex: 5,
                fieldId: 'occupation',
                fallbackText: 'Role fallback',
                visible: true,
                textStyle: {
                    fontFamily: 'Role font',
                    fontSize: 30,
                    fontWeight: 700,
                    color: '#654321',
                    align: 'left',
                },
            },
        ]

        const migrated = ensureSingleLinePersonTemplate(document)
        const nameLayer = migrated.templates.persons.layers[0]
        const occupationLayer = migrated.templates.persons.layers[1]

        expect(nameLayer).toMatchObject({
            x: 321,
            y: 654,
            width: 950,
            height: 55,
            minScaleX: 0.2,
            textStyle: {
                fontFamily: 'Custom font',
                fontSize: 31,
                color: '#123456',
            },
            textParts: [
                { fieldId: 'name', fallbackText: 'Name fallback', transform: 'uppercase' },
                { fieldId: 'occupation', prefix: ', ', fallbackText: 'Role fallback' },
            ],
        })
        expect(nameLayer.type === 'text' && nameLayer.textStyle.transform).toBeUndefined()
        expect(occupationLayer).toMatchObject({ visible: false, width: 950 })
        expect(migrated.disabledEntityTypes).toEqual(['hotTitles'])

        expect(ensureSingleLinePersonTemplate(migrated)).toEqual(migrated)
    })
})

describe('person display mode', () => {
    it('keeps automatic joining in one-line mode and restores separate name and occupation layers in two-line mode', () => {
        const source = createTemplateDocumentFromTemplates(broadcastTemplates)
        const twoLines = applyPersonDisplayMode(source, 'two-lines')
        const twoLineLayers = twoLines.templates.persons.layers
        const twoLineName = twoLineLayers.find((layer) => layer.type === 'text' && layer.fieldId === 'name')
        const twoLineOccupation = twoLineLayers.find((layer) => layer.type === 'text' && layer.fieldId === 'occupation')

        expect(twoLineName?.type === 'text' ? twoLineName.textParts : undefined).toBeUndefined()
        expect(twoLineOccupation).toMatchObject({ type: 'text', fieldId: 'occupation', visible: true })

        const oneLine = applyPersonDisplayMode(twoLines, 'single-line')
        const oneLineName = oneLine.templates.persons.layers.find((layer) => layer.type === 'text' && layer.id === 'person-name-text')
        const oneLineOccupation = oneLine.templates.persons.layers.find((layer) => layer.type === 'text' && layer.id === 'person-occupation-text')
        expect(oneLineName?.type === 'text' ? oneLineName.textParts : undefined).toEqual([
            expect.objectContaining({ fieldId: 'name' }),
            expect.objectContaining({ fieldId: 'occupation', prefix: ', ' }),
        ])
        expect(oneLineOccupation).toMatchObject({ visible: false })
    })
})
