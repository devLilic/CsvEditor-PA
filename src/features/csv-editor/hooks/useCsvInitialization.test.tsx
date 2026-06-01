import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider, useCsvInitialization } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { FALLBACK_DEFAULT_PROJECT_SETTINGS } from '../domain/defaultProjectSettings'
import { csvService } from '../services/csvService'
import { defaultProjectSettingsService } from '../services/defaultProjectSettingsService'
import { csvFileSettingsService } from '../services/csvFileSettingsService'

function InitializationHarness() {
    useCsvInitialization()
    const { state } = useCsvContext()
    const invited = state.entities.sections.find((section) => section.kind === 'invited')
    const firstRow = invited?.rows[0]

    return (
        <div>
            <div data-testid="loaded">{String(state.isLoaded)}</div>
            <div data-testid="title">{firstRow?.title?.title ?? ''}</div>
            <div data-testid="person-name">{firstRow?.person?.name ?? ''}</div>
            <div data-testid="location">{firstRow?.location?.location ?? ''}</div>
        </div>
    )
}

describe('useCsvInitialization', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('loads configured working CSV from settings when it can be read', async () => {
        vi.spyOn(csvFileSettingsService, 'getCsvFileSettings').mockResolvedValue({
            workingCsvPath: 'C:/work/current.csv',
            backupFolderPath: 'C:/work/backups',
        })
        const getWorkingSpy = vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: true,
            path: 'C:/work/current.csv',
            filename: 'current.csv',
            content: [
                'Nr;Titlu;Nume;Functie;Image;Locatie',
                ';LOADED TITLE;LOADED NAME;LOADED ROLE;;LOADED LOCATION',
            ].join('\n'),
        })
        const openDialogSpy = vi.spyOn(csvService, 'openDialog').mockResolvedValue(null)

        render(
            <CsvProvider>
                <InitializationHarness />
            </CsvProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loaded')).toHaveTextContent('true')
        })

        expect(screen.getByTestId('title')).toHaveTextContent('LOADED TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('LOADED NAME')
        expect(screen.getByTestId('location')).toHaveTextContent('LOADED LOCATION')
        expect(getWorkingSpy).toHaveBeenCalledOnce()
        expect(openDialogSpy).not.toHaveBeenCalled()
    })

    it('loads the default project when no working CSV is configured', async () => {
        const savedSettings = {
            title: 'INIT DEFAULT TITLE',
            personName: 'INIT DEFAULT NAME',
            personOccupation: 'INIT DEFAULT ROLE',
            location: 'INIT DEFAULT LOCATION',
        }
        vi.spyOn(csvFileSettingsService, 'getCsvFileSettings').mockResolvedValue({
            workingCsvPath: '',
            backupFolderPath: '',
        })
        const getWorkingSpy = vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: false,
            error: 'No working CSV configured',
        })
        const openDialogSpy = vi.spyOn(csvService, 'openDialog').mockResolvedValue(null)
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(savedSettings)

        render(
            <CsvProvider>
                <InitializationHarness />
            </CsvProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loaded')).toHaveTextContent('true')
        })

        expect(screen.getByTestId('title')).toHaveTextContent(savedSettings.title)
        expect(screen.getByTestId('person-name')).toHaveTextContent(savedSettings.personName)
        expect(screen.getByTestId('location')).toHaveTextContent(savedSettings.location)
        expect(getWorkingSpy).not.toHaveBeenCalled()
        expect(openDialogSpy).not.toHaveBeenCalled()
    })

    it('falls back to the default project when configured working CSV cannot be read', async () => {
        const savedSettings = {
            title: 'FALLBACK TITLE',
            personName: 'FALLBACK NAME',
            personOccupation: 'FALLBACK ROLE',
            location: 'FALLBACK LOCATION',
        }
        vi.spyOn(csvFileSettingsService, 'getCsvFileSettings').mockResolvedValue({
            workingCsvPath: 'C:/missing/current.csv',
            backupFolderPath: '',
        })
        const getWorkingSpy = vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: false,
            error: 'Working CSV file does not exist',
        })
        const openDialogSpy = vi.spyOn(csvService, 'openDialog').mockResolvedValue(null)
        vi.spyOn(defaultProjectSettingsService, 'getDefaultProjectSettings').mockResolvedValue(savedSettings)

        render(
            <CsvProvider>
                <InitializationHarness />
            </CsvProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loaded')).toHaveTextContent('true')
        })

        expect(screen.getByTestId('title')).toHaveTextContent(savedSettings.title)
        expect(screen.getByTestId('person-name')).toHaveTextContent(savedSettings.personName)
        expect(screen.getByTestId('location')).toHaveTextContent(savedSettings.location)
        expect(getWorkingSpy).toHaveBeenCalledOnce()
        expect(openDialogSpy).not.toHaveBeenCalled()
    })

    it('uses fallback default settings when settings IPC fails', async () => {
        const api = (window as any).electronAPI
        vi.spyOn(csvFileSettingsService, 'getCsvFileSettings').mockResolvedValue({
            workingCsvPath: '',
            backupFolderPath: '',
        })
        vi.spyOn(csvService, 'getLast').mockResolvedValue(null)
        const openDialogSpy = vi.spyOn(csvService, 'openDialog').mockResolvedValue(null)
        api.getDefaultProjectSettings.mockRejectedValueOnce(new Error('IPC_FAILED'))

        render(
            <CsvProvider>
                <InitializationHarness />
            </CsvProvider>
        )

        await waitFor(() => {
            expect(screen.getByTestId('loaded')).toHaveTextContent('true')
        })

        expect(screen.getByTestId('title')).toHaveTextContent('')
        expect(screen.getByTestId('person-name')).toHaveTextContent(FALLBACK_DEFAULT_PROJECT_SETTINGS.personName)
        expect(screen.getByTestId('location')).toHaveTextContent(FALLBACK_DEFAULT_PROJECT_SETTINGS.location)
        expect(openDialogSpy).not.toHaveBeenCalled()
    })
})
