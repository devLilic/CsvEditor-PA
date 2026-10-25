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
            titlesPath: 'D:\\TV\\OC\\Exports\\titles.csv',
            personsPath: 'D:\\TV\\OC\\Exports\\persons.csv',
            locationsPath: 'D:\\TV\\OC\\Exports\\locations.csv',
            phonesPath: 'D:\\TV\\OC\\Exports\\phones.csv',
            waitTitlesLocationsPath: 'D:\\TV\\OC\\Exports\\wait_titles_locations.csv',
        })
    })

    it('falls back to Export folder next to the working CSV when export folder is not set', () => {
        expect(resolveEntityExportPaths({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: '',
        })).toEqual({
            titlesPath: 'D:\\TV\\OC\\Export\\titles.csv',
            personsPath: 'D:\\TV\\OC\\Export\\persons.csv',
            locationsPath: 'D:\\TV\\OC\\Export\\locations.csv',
            phonesPath: 'D:\\TV\\OC\\Export\\phones.csv',
            waitTitlesLocationsPath: 'D:\\TV\\OC\\Export\\wait_titles_locations.csv',
        })
    })

    it('uses fixed filenames', () => {
        expect(ENTITY_EXPORT_FILENAMES).toEqual({
            titles: 'titles.csv',
            persons: 'persons.csv',
            locations: 'locations.csv',
            phones: 'phones.csv',
            waitTitlesLocations: 'wait_titles_locations.csv',
            quickTitles: 'quickTitles.csv',
        })
    })

    it('resolves quickTitles CSV next to entity export files', () => {
        expect(resolveQuickTitlesCsvPath({
            workingCsvPath: 'D:\\TV\\OC\\working.csv',
            exportFolderPath: 'D:\\TV\\OC\\Exports',
        })).toBe('D:\\TV\\OC\\Exports\\quickTitles.csv')
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

    it('uses project root, configurable prefix, and no legacy hot titles file', () => {
        const paths = resolveEntityExportPaths({ projectFolderPath: 'D:\\Projects\\Show', exportPrefix: 'X_' })
        expect(paths.titlesPath).toBe('D:\\Projects\\Show\\Export\\X_titles.csv')
        expect(paths.personsPath).toBe('D:\\Projects\\Show\\Export\\X_persons.csv')
        expect(paths).not.toHaveProperty('titlesWithHotPath')
    })
})
