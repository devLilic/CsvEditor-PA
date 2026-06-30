import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider, useEntities, useQuickTitles } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../domain/defaultProjectSettings'
import { csvService } from '../services/csvService'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { settingsService } from '../services/settingsService'
import * as quickTitlesCsvStorageService from '../../quick-titles/services/quickTitlesCsvStorageService'

function StartNewProjectHarness() {
    const { dispatch } = useCsvContext()
    const { startNewProject, forceStartNewProjectWithoutBackup, getBlockItems, activeSectionId, sections } = useEntities()
    const sectionId = activeSectionId ?? 'old-section'
    const titles = getBlockItems(sectionId, 'titles')
    const persons = getBlockItems(sectionId, 'persons')
    const locations = getBlockItems(sectionId, 'locations')
    const hotTitles = getBlockItems(sectionId, 'hotTitles')

    const seedOldData = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    {
                        id: 'old-section',
                        kind: 'invited',
                        rows: [
                            {
                                id: 'old-row',
                                title: { id: 'old-title', title: 'OLD TITLE' },
                                person: { id: 'old-person', name: 'OLD NAME', occupation: 'OLD ROLE' },
                                location: { id: 'old-location', location: 'OLD LOCATION' },
                            },
                        ],
                    },
                ],
            },
        })
    }

    return (
        <div>
            <button onClick={seedOldData}>seed old data</button>
            <button
                onClick={async () => {
                    const result = await startNewProject()
                    window.dispatchEvent(new CustomEvent('start-new-project-result', { detail: result }))
                }}
            >
                start new project
            </button>
            <button
                onClick={async () => {
                    const result = await forceStartNewProjectWithoutBackup()
                    window.dispatchEvent(new CustomEvent('force-start-new-project-result', { detail: result }))
                }}
            >
                force start new project
            </button>
            <div data-testid="title">{titles[0]?.data.title ?? ''}</div>
            <div data-testid="person-name">{persons[0]?.data.name ?? ''}</div>
            <div data-testid="person-occupation">{persons[0]?.data.occupation ?? ''}</div>
            <div data-testid="location">{locations[0]?.data.location ?? ''}</div>
            <div data-testid="hot-title">{hotTitles[0]?.data.title ?? ''}</div>
            <div data-testid="sections-count">{sections.length}</div>
            <div data-testid="beta-count">{sections.filter((section) => section.kind === 'beta').length}</div>
        </div>
    )
}

function NewProjectQuickTitlesHarness() {
    const { dispatch } = useCsvContext()
    const { startNewProject } = useEntities()
    const { quickTitles } = useQuickTitles()

    const seedOldData = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    {
                        id: 'old-section',
                        kind: 'invited',
                        rows: [
                            {
                                id: 'old-row',
                                title: { id: 'old-title', title: 'OLD TITLE' },
                                person: { id: 'old-person', name: 'OLD NAME', occupation: 'OLD ROLE' },
                                location: { id: 'old-location', location: 'OLD LOCATION' },
                            },
                        ],
                    },
                ],
            },
        })
    }

    return (
        <div>
            <button onClick={seedOldData}>seed old data</button>
            <button
                onClick={async () => {
                    const result = await startNewProject()
                    window.dispatchEvent(new CustomEvent('start-new-project-result', { detail: result }))
                }}
            >
                start new project
            </button>
            <div data-testid="quick-titles">{quickTitles.join('|')}</div>
        </div>
    )
}

function SavePersonHarness() {
    const { dispatch } = useCsvContext()
    const { savePersonEntity, getBlockItems } = useEntities()
    const persons = getBlockItems('invited-section', 'persons')

    const seedData = () => {
        dispatch({
            type: 'CSV_LOADED',
            payload: {
                sections: [
                    {
                        id: 'invited-section',
                        kind: 'invited',
                        rows: [],
                    },
                ],
            },
        })
    }

    const savePerson = async () => {
        const result = await savePersonEntity({
            sectionId: 'invited-section',
            data: {
                name: 'ANA BUJOR',
                occupation: 'Deputat',
            },
        })
        window.dispatchEvent(new CustomEvent('save-person-result', { detail: result }))
    }

    return (
        <div>
            <button onClick={seedData}>seed person data</button>
            <button onClick={savePerson}>save person</button>
            <div data-testid="saved-person-name">{persons[0]?.data.name ?? ''}</div>
        </div>
    )
}

describe('useEntities startNewProject', () => {
    afterEach(() => {
        cleanup()
    })

    it('resets state to the default project and writes the default CSV after backup', async () => {
        const user = userEvent.setup()
        const savedSettings = {
            title: 'SAVED DEFAULT TITLE',
            personName: 'SAVED DEFAULT NAME',
            personOccupation: 'SAVED DEFAULT ROLE',
            location: 'SAVED DEFAULT LOCATION',
            hotTitle: 'SAVED DEFAULT HOT TITLE',
        }
        const backupSpy = vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const getSettingsSpy = vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(savedSettings)
        const clearQuickTitlesCsvSpy = vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })
        const setQuickTitlesSpy = vi.spyOn(settingsService, 'setQuickTitles')
        const resultSpy = vi.fn()
        window.addEventListener('start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed old data' }))

        expect(screen.getByTestId('title')).toHaveTextContent('OLD TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('OLD NAME')
        expect(screen.getByTestId('location')).toHaveTextContent('OLD LOCATION')

        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(screen.getByTestId('title')).toHaveTextContent(savedSettings.title)
        })

        expect(screen.getByTestId('person-name')).toHaveTextContent(savedSettings.personName)
        expect(screen.getByTestId('person-occupation')).toHaveTextContent(savedSettings.personOccupation)
        expect(screen.getByTestId('location')).toHaveTextContent(savedSettings.location)
        expect(screen.getByTestId('hot-title')).toHaveTextContent(savedSettings.hotTitle)
        expect(screen.getByTestId('sections-count')).toHaveTextContent('1')
        expect(screen.getByTestId('beta-count')).toHaveTextContent('0')

        expect(backupSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy).toHaveBeenCalledTimes(1)
        expect(clearQuickTitlesCsvSpy).toHaveBeenCalledTimes(1)
        expect(setQuickTitlesSpy).toHaveBeenCalledWith([])
        expect(backupSpy.mock.invocationCallOrder[0]).toBeLessThan(getSettingsSpy.mock.invocationCallOrder[0])
        expect(getSettingsSpy.mock.invocationCallOrder[0]).toBeLessThan(clearQuickTitlesCsvSpy.mock.invocationCallOrder[0])
        expect(clearQuickTitlesCsvSpy.mock.invocationCallOrder[0]).toBeLessThan(setQuickTitlesSpy.mock.invocationCallOrder[0])
        expect(setQuickTitlesSpy.mock.invocationCallOrder[0]).toBeLessThan(writeSpy.mock.invocationCallOrder[0])

        const backupCsv = backupSpy.mock.calls[0][0]
        const writtenCsv = writeSpy.mock.calls[0][0]
        expect(backupCsv).toContain('OLD TITLE')
        expect(backupCsv).toContain('OLD NAME')
        expect(backupCsv).toContain('OLD ROLE')
        expect(backupCsv).toContain('OLD LOCATION')
        expect(backupCsv).not.toContain(savedSettings.title)
        expect(backupCsv).not.toContain(savedSettings.personName)
        expect(writtenCsv).toContain(savedSettings.title)
        expect(writtenCsv).toContain(savedSettings.personName)
        expect(writtenCsv).toContain(savedSettings.personOccupation)
        expect(writtenCsv).toContain(savedSettings.location)
        expect(writtenCsv).toContain(savedSettings.hotTitle)
        expect(writtenCsv).toContain('--- INVITATI ---')
        expect(writtenCsv).not.toMatch(/---\s*beta/i)
        expect(writtenCsv).not.toContain('OLD TITLE')
        expect(writtenCsv).not.toContain('OLD NAME')
        expect(writtenCsv).not.toContain('OLD ROLE')
        expect(writtenCsv).not.toContain('OLD LOCATION')
        expect(writtenCsv).not.toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.personName)
        expect(writtenCsv).not.toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.personOccupation)
        expect(writtenCsv).not.toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.location)
        expect(resultSpy).toHaveBeenCalledWith({ ok: true })
    })

    it('clears quickTitles state, clears PA_quickTitles.csv, and keeps the regular CSV backup unchanged', async () => {
        const user = userEvent.setup()
        const api = (window as any).electronAPI
        api.readQuickTitlesCsv.mockResolvedValueOnce({
            ok: true,
            content: [
                'PRESEDINTE',
                'DIRECTOR',
            ].join('\n'),
            path: 'D:\\TV\\OC\\Export\\PA_quickTitles.csv',
            created: false,
        })
        api.setQuickTitles.mockResolvedValue(undefined)
        api.getCsvFileSettings.mockResolvedValue({
            workingCsvPath: 'D:/TV/OC/current.csv',
            backupFolderPath: 'D:/TV/OC/backups',
            savedProjectsFolderPath: 'D:/TV/OC/projects',
            exportCsvFolderPath: 'D:/TV/OC/Export',
        })
        const backupSpy = vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const clearQuickTitlesCsvSpy = vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })
        const setQuickTitlesSpy = vi.spyOn(settingsService, 'setQuickTitles')

        render(
            <CsvProvider>
                <NewProjectQuickTitlesHarness />
            </CsvProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE: |DIRECTOR:')
        })

        await user.click(screen.getByRole('button', { name: 'seed old data' }))
        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(screen.getByTestId('quick-titles')).toHaveTextContent('')
        })

        expect(clearQuickTitlesCsvSpy).toHaveBeenCalledTimes(1)
        expect(setQuickTitlesSpy).toHaveBeenCalledWith([])
        expect(backupSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy).toHaveBeenCalledTimes(1)

        const backupCsv = backupSpy.mock.calls[0][0]
        expect(backupCsv).toContain('OLD TITLE')
        expect(backupCsv).toContain('OLD NAME')
        expect(backupCsv).not.toContain('PRESEDINTE')
        expect(backupCsv).not.toContain('DIRECTOR')
        expect(backupCsv).not.toContain('PA_quickTitles.csv')
    })

    it('keeps the titles list empty when saved default title is empty', async () => {
        const user = userEvent.setup()
        const savedSettings = {
            title: '',
            personName: 'SAVED DEFAULT NAME',
            personOccupation: 'SAVED DEFAULT ROLE',
            location: 'SAVED DEFAULT LOCATION',
            hotTitle: '',
        }
        vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(savedSettings)
        vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(screen.getByTestId('person-name')).toHaveTextContent(savedSettings.personName)
        })

        expect(screen.getByTestId('title')).toHaveTextContent('')

        const writtenCsv = writeSpy.mock.calls[0][0]
        expect(writtenCsv).toContain(savedSettings.personName)
        expect(writtenCsv).toContain(savedSettings.personOccupation)
        expect(writtenCsv).toContain(savedSettings.location)
    })

    it('returns a failure result when backup fails and does not write', async () => {
        const user = userEvent.setup()
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const backupSpy = vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: false, error: 'BACKUP_FAILED' })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const getSettingsSpy = vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(FALLBACK_DEFAULT_PROJECT_SETTINGS)
        const clearQuickTitlesCsvSpy = vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv')
        const setQuickTitlesSpy = vi.spyOn(settingsService, 'setQuickTitles')
        const resultSpy = vi.fn()
        window.addEventListener('start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed old data' }))
        await user.click(screen.getByRole('button', { name: 'start new project' }))

        expect(backupSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy).not.toHaveBeenCalled()
        expect(getSettingsSpy).not.toHaveBeenCalled()
        expect(clearQuickTitlesCsvSpy).not.toHaveBeenCalled()
        expect(setQuickTitlesSpy).not.toHaveBeenCalled()
        expect(screen.getByTestId('title')).toHaveTextContent('OLD TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('OLD NAME')
        expect(screen.getByTestId('person-occupation')).toHaveTextContent('OLD ROLE')
        expect(screen.getByTestId('location')).toHaveTextContent('OLD LOCATION')
        expect(resultSpy).toHaveBeenCalledWith({
            ok: false,
            reason: 'BACKUP_FAILED',
            error: 'BACKUP_FAILED',
        })
        expect(consoleErrorSpy).toHaveBeenCalledWith('Backup failed:', 'BACKUP_FAILED')
    })

    it('force starts a new project without creating backup', async () => {
        const user = userEvent.setup()
        const savedSettings = {
            title: 'FORCED DEFAULT TITLE',
            personName: 'FORCED DEFAULT NAME',
            personOccupation: 'FORCED DEFAULT ROLE',
            location: 'FORCED DEFAULT LOCATION',
            hotTitle: 'FORCED DEFAULT HOT TITLE',
        }
        const backupSpy = vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: false, error: 'BACKUP_FAILED' })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(savedSettings)
        const clearQuickTitlesCsvSpy = vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('force-start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed old data' }))
        await user.click(screen.getByRole('button', { name: 'force start new project' }))

        await waitFor(() => {
            expect(screen.getByTestId('title')).toHaveTextContent(savedSettings.title)
        })

        expect(screen.getByTestId('person-name')).toHaveTextContent(savedSettings.personName)
        expect(screen.getByTestId('person-occupation')).toHaveTextContent(savedSettings.personOccupation)
        expect(screen.getByTestId('location')).toHaveTextContent(savedSettings.location)
        expect(backupSpy).not.toHaveBeenCalled()
        expect(clearQuickTitlesCsvSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy).toHaveBeenCalledTimes(1)
        const writtenCsv = writeSpy.mock.calls[0][0]
        expect(writtenCsv).toContain(savedSettings.title)
        expect(writtenCsv).toContain(savedSettings.personName)
        expect(writtenCsv).toContain(savedSettings.personOccupation)
        expect(writtenCsv).toContain(savedSettings.location)
        expect(writtenCsv).not.toContain('OLD TITLE')
        expect(writtenCsv).not.toContain('OLD NAME')
        expect(resultSpy).toHaveBeenCalledWith({ ok: true })
    })

    it('uses fallback settings when default project settings cannot be read', async () => {
        const user = userEvent.setup()
        const settingsError = new Error('SETTINGS_FAILED')
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockRejectedValue(settingsError)
        vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith({ ok: true })
        })

        const writtenCsv = writeSpy.mock.calls[0][0]
        expect(writtenCsv).toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.personName)
        expect(writtenCsv).toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.personOccupation)
        expect(writtenCsv).toContain(FALLBACK_DEFAULT_PROJECT_SETTINGS.location)
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to read default project settings:', settingsError)
    })

    it('returns a failure result when write fails', async () => {
        const user = userEvent.setup()
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'WRITE_FAILED' })
        vi.spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith({
                ok: false,
                error: 'Write failed: WRITE_FAILED',
            })
        })
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write empty CSV:', 'WRITE_FAILED')
    })

    it('returns a failure result when quickTitles CSV cannot be cleared and does not reset entities', async () => {
        const user = userEvent.setup()
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const backupSpy = vi.spyOn(csvService, 'createBackup').mockResolvedValue({ ok: true })
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const clearQuickTitlesCsvSpy = vi
            .spyOn(quickTitlesCsvStorageService, 'clearQuickTitlesCsv')
            .mockResolvedValue({ ok: false, error: 'QUICK_TITLES_CLEAR_FAILED' })
        const setQuickTitlesSpy = vi.spyOn(settingsService, 'setQuickTitles')
        const resultSpy = vi.fn()
        window.addEventListener('start-new-project-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <StartNewProjectHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed old data' }))
        await user.click(screen.getByRole('button', { name: 'start new project' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith({
                ok: false,
                error: 'QuickTitles clear failed: QUICK_TITLES_CLEAR_FAILED',
            })
        })

        expect(backupSpy).toHaveBeenCalledTimes(1)
        expect(clearQuickTitlesCsvSpy).toHaveBeenCalledTimes(1)
        expect(setQuickTitlesSpy).not.toHaveBeenCalled()
        expect(writeSpy).not.toHaveBeenCalled()
        expect(screen.getByTestId('title')).toHaveTextContent('OLD TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('OLD NAME')
        expect(screen.getByTestId('location')).toHaveTextContent('OLD LOCATION')
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear quick titles CSV:', 'QUICK_TITLES_CLEAR_FAILED')
    })
})

describe('useEntities savePersonEntity', () => {
    afterEach(() => {
        cleanup()
    })

    it('returns ok=true after the person is saved and the CSV write succeeds', async () => {
        const user = userEvent.setup()
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })
        const resultSpy = vi.fn()
        window.addEventListener('save-person-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <SavePersonHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed person data' }))
        await user.click(screen.getByRole('button', { name: 'save person' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith({ ok: true })
        })

        expect(screen.getByTestId('saved-person-name')).toHaveTextContent('ANA BUJOR')
        expect(writeSpy).toHaveBeenCalledTimes(1)
        expect(writeSpy.mock.calls[0][0]).toContain('ANA BUJOR')
    })

    it('returns ok=false when the CSV write fails', async () => {
        const user = userEvent.setup()
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.spyOn(csvService, 'write').mockResolvedValue({ ok: false, error: 'WRITE_FAILED' })
        const resultSpy = vi.fn()
        window.addEventListener('save-person-result', ((event: CustomEvent) => {
            resultSpy(event.detail)
        }) as EventListener)

        render(
            <CsvProvider>
                <SavePersonHarness />
            </CsvProvider>
        )

        await user.click(screen.getByRole('button', { name: 'seed person data' }))
        await user.click(screen.getByRole('button', { name: 'save person' }))

        await waitFor(() => {
            expect(resultSpy).toHaveBeenCalledWith({
                ok: false,
                error: 'WRITE_FAILED',
            })
        })

        expect(screen.getByTestId('saved-person-name')).toHaveTextContent('ANA BUJOR')
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save person:', 'WRITE_FAILED')
    })
})
