import { describe, expect, it } from 'vitest'
import { createPreviewData } from './createPreviewData'

describe('createPreviewData', () => {
    it('maps title data for titles', () => {
        expect(createPreviewData('titles', { title: 'Breaking News' })).toEqual({
            title: 'Breaking News',
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
        expect(createPreviewData('titles', {})).toEqual({ title: '' })
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
