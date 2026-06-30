import { describe, expect, it } from 'vitest'
import {
    ENTITY_EXPORT_FILENAMES,
    resolveEntityExportFolder,
    resolveEntityExportPaths,
    resolveQuickTitlesCsvPath,
} from './exportPathResolver'

describe('exportPathResolver', () => {
    it('uses configured export folder when it is set', () => {
        expect(resolveEntityExportPaths({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: 'D:\\TV\\OC\\Exports',
        })).toEqual({
            titlesPath: 'D:\\TV\\OC\\Exports\\PA_titles.csv',
            personsPath: 'D:\\TV\\OC\\Exports\\PA_persons.csv',
            locationsPath: 'D:\\TV\\OC\\Exports\\PA_locations.csv',
            phonesPath: 'D:\\TV\\OC\\Exports\\PA_phones.csv',
            waitTitlesLocationsPath: 'D:\\TV\\OC\\Exports\\PA_wait_titles_locations.csv',
        })
    })

    it('falls back to Export folder next to the working CSV when export folder is not set', () => {
        expect(resolveEntityExportPaths({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: '',
        })).toEqual({
            titlesPath: 'D:\\TV\\OC\\Export\\PA_titles.csv',
            personsPath: 'D:\\TV\\OC\\Export\\PA_persons.csv',
            locationsPath: 'D:\\TV\\OC\\Export\\PA_locations.csv',
            phonesPath: 'D:\\TV\\OC\\Export\\PA_phones.csv',
            waitTitlesLocationsPath: 'D:\\TV\\OC\\Export\\PA_wait_titles_locations.csv',
        })
    })

    it('uses fixed filenames', () => {
        expect(ENTITY_EXPORT_FILENAMES).toEqual({
            titles: 'PA_titles.csv',
            persons: 'PA_persons.csv',
            locations: 'PA_locations.csv',
            phones: 'PA_phones.csv',
            waitTitlesLocations: 'PA_wait_titles_locations.csv',
            quickTitles: 'PA_quickTitles.csv',
        })
    })

    it('resolves quickTitles CSV next to entity export files', () => {
        expect(resolveQuickTitlesCsvPath({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: 'D:\\TV\\OC\\Exports',
        })).toBe('D:\\TV\\OC\\Exports\\PA_quickTitles.csv')
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
