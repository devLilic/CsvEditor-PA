import { describe, expect, it } from 'vitest'
import { createPreviewData, createTemplatePreviewData } from './createPreviewData'

describe('createPreviewData', () => {
    it('maps title data for titles', () => {
        expect(createPreviewData('titles', { title: 'Breaking News' })).toEqual({
            title: 'Breaking News',
            supratitle: '',
        })
    })

    it('includes only active-template custom fields and visibility values in preview data', () => {
        const activeTemplate = {
            id: 'title-template',
            name: 'Title',
            canvas: { width: 1920, height: 1080, background: { type: 'color', value: '#000' } },
            layers: [
                { id: 'headline', type: 'text', fieldId: 'customHeadline', visibleWhenField: 'showHeadline', x: 0, y: 0, width: 400, height: 80, zIndex: 1 },
                { id: 'hidden', type: 'text', fieldId: 'hiddenCustom', visible: false, x: 0, y: 80, width: 400, height: 80, zIndex: 2 },
            ],
        } as any
        expect(createTemplatePreviewData('titles', {
            title: 'Built in',
            customFields: {
                customHeadline: 'Custom value',
                showHeadline: 'yes',
                hiddenCustom: 'hidden',
                otherShowField: 'not exposed',
            },
        }, activeTemplate)).toEqual({
            title: 'Built in',
            supratitle: '',
            customHeadline: 'Custom value',
            showHeadline: 'yes',
        })
    })

    it('maps person data for persons', () => {
        expect(createPreviewData('persons', { name: 'Ana Popescu', occupation: 'Reporter' })).toEqual({
            name: 'Ana Popescu',
            occupation: 'Reporter',
        })
    })

    it('maps phone call data for phoneCalls', () => {
        expect(createPreviewData('phoneCalls', {
            name: 'Ana Popescu',
            occupation: 'Reporter',
            image: 'WORK_PATH/ana_popescu.jpg',
        })).toEqual({
            name: 'Ana Popescu',
            occupation: 'Reporter',
            image: 'WORK_PATH/ana_popescu.jpg',
        })
    })

    it('maps location data for locations', () => {
        expect(createPreviewData('locations', { location: 'Chisinau' })).toEqual({
            location: 'Chisinau',
        })
    })

    it('fills missing supported fields with empty strings', () => {
        expect(createPreviewData('titles', {})).toEqual({ title: '', supratitle: '' })
        expect(createPreviewData('persons', {})).toEqual({ name: '', occupation: '' })
        expect(createPreviewData('phoneCalls', {})).toEqual({ name: '', occupation: '', image: '' })
        expect(createPreviewData('locations', {})).toEqual({ location: '' })
    })

    it('maps title data for hotTitles', () => {
        expect(createPreviewData('hotTitles', { title: 'Hot' })).toEqual({ title: 'Hot' })
    })

    it('maps title data for waitTitles', () => {
        expect(createPreviewData('waitTitles', { title: 'Wait' })).toEqual({ title: 'Wait' })
    })

    it('maps location data for waitLocations', () => {
        expect(createPreviewData('waitLocations', { location: 'Wait' })).toEqual({ location: 'Wait' })
    })

    it('returns empty data for unknown entity types', () => {
        expect(createPreviewData('unknown', { title: 'Unknown' })).toEqual({})
    })

    it('does not mutate the source data', () => {
        const source = { title: 'Title', name: 'Name', occupation: 'Role', location: 'Place' }

        createPreviewData('persons', source)

        expect(source).toEqual({
            title: 'Title',
            name: 'Name',
            occupation: 'Role',
            location: 'Place',
        })
    })
})
