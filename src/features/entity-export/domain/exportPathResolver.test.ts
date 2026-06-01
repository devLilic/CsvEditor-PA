import { describe, expect, it } from 'vitest'
import {
    ENTITY_EXPORT_FILENAMES,
    resolveEntityExportFolder,
    resolveEntityExportPaths,
} from './exportPathResolver'

describe('exportPathResolver', () => {
    it('uses configured export folder when it is set', () => {
        expect(resolveEntityExportPaths({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: 'D:\\TV\\OC\\Exports',
        })).toEqual({
            titlesPath: 'D:\\TV\\OC\\Exports\\OC_titles.csv',
            personsPath: 'D:\\TV\\OC\\Exports\\OC_persons.csv',
            locationsPath: 'D:\\TV\\OC\\Exports\\OC_locations.csv',
            phonesPath: 'D:\\TV\\OC\\Exports\\OC_phones.csv',
        })
    })

    it('falls back to Export folder next to the working CSV when export folder is not set', () => {
        expect(resolveEntityExportPaths({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: '',
        })).toEqual({
            titlesPath: 'D:\\TV\\OC\\Export\\OC_titles.csv',
            personsPath: 'D:\\TV\\OC\\Export\\OC_persons.csv',
            locationsPath: 'D:\\TV\\OC\\Export\\OC_locations.csv',
            phonesPath: 'D:\\TV\\OC\\Export\\OC_phones.csv',
        })
    })

    it('uses fixed filenames', () => {
        expect(ENTITY_EXPORT_FILENAMES).toEqual({
            titles: 'OC_titles.csv',
            persons: 'OC_persons.csv',
            locations: 'OC_locations.csv',
            phones: 'OC_phones.csv',
        })
    })

    it('resolves fallback folder using dirname of the working CSV', () => {
        expect(resolveEntityExportFolder({
            workingCsvPath: 'D:\\TV\\OC\\subfolder\\working.csv',
            exportFolderPath: undefined,
        })).toBe('D:\\TV\\OC\\subfolder\\Export')
    })

    it('trims configured export folder', () => {
        expect(resolveEntityExportFolder({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: '  D:\\TV\\OC\\Exports  ',
        })).toBe('D:\\TV\\OC\\Exports')
    })
})
