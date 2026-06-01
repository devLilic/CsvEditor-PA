import { describe, expect, it } from 'vitest'
import { createTedSampleData } from './tedSampleData'

describe('tedSampleData', () => {
    it('titles have sample title', () => {
        expect(createTedSampleData('titles')).toEqual({
            title: 'SAMPLE TITLE',
        })
    })

    it('persons have sample name and occupation', () => {
        expect(createTedSampleData('persons')).toEqual({
            name: 'SAMPLE NAME',
            occupation: 'Sample occupation',
        })
    })

    it('locations have sample location', () => {
        expect(createTedSampleData('locations')).toEqual({
            location: 'SAMPLE LOCATION',
        })
    })

    it('phoneCalls have sample name, occupation, and image', () => {
        expect(createTedSampleData('phoneCalls')).toEqual({
            name: 'SAMPLE NAME',
            occupation: 'Sample occupation',
            image: '',
        })
    })

    it('sample data can be overridden from manual input', () => {
        expect(createTedSampleData('persons', {
            name: 'Manual Name',
            occupation: 'Manual occupation',
        })).toEqual({
            name: 'Manual Name',
            occupation: 'Manual occupation',
        })
    })

    it('keeps sample fallback when manual input is empty', () => {
        expect(createTedSampleData('phoneCalls', {
            name: '',
            occupation: '   ',
            image: '',
        })).toEqual({
            name: 'SAMPLE NAME',
            occupation: 'Sample occupation',
            image: '',
        })
    })
})
