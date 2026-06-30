import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    loadQuickTitlesFromCsv,
    saveQuickTitlesToCsv,
} from '../../quick-titles/services/quickTitlesCsvStorageService'
import { csvFileSettingsService } from '../services/csvFileSettingsService'
import { settingsService } from '../services/settingsService'
import { useQuickTitles } from './useQuickTitles'

vi.mock('../../quick-titles/services/quickTitlesCsvStorageService', () => ({
    clearQuickTitlesCsv: vi.fn(),
    loadQuickTitlesFromCsv: vi.fn(),
    saveQuickTitlesToCsv: vi.fn(),
}))

vi.mock('../services/settingsService', () => ({
    settingsService: {
        getQuickTitles: vi.fn(),
        setQuickTitles: vi.fn(),
        subscribeQuickTitles: vi.fn(() => vi.fn()),
    },
}))

vi.mock('../services/csvFileSettingsService', () => ({
    csvFileSettingsService: {
        getCsvFileSettings: vi.fn(),
        subscribeCsvFileSettings: vi.fn(() => vi.fn()),
    },
}))

function HookHarness() {
    const {
        quickTitles,
        addQuickTitle,
        removeQuickTitle,
        setAllQuickTitles,
        updateQuickTitle,
    } = useQuickTitles()

    return (
        <div>
            <div data-testid="quick-titles">{quickTitles.join('|')}</div>
            <button onClick={() => addQuickTitle('PRESEDINTE')}>add presedinte</button>
            <button onClick={() => addQuickTitle('PRESEDINTE:')}>add duplicate</button>
            <button onClick={() => addQuickTitle('BREAKING')}>add breaking</button>
            <button onClick={() => updateQuickTitle('DIRECTOR: ', 'SECRETAR')}>edit director</button>
            <button onClick={() => updateQuickTitle('DIRECTOR: ', 'PRESEDINTE:')}>edit to duplicate</button>
            <button onClick={() => removeQuickTitle('DIRECTOR: ')}>delete director</button>
            <button onClick={() => setAllQuickTitles(['DIRECTOR', 'PRESEDINTE', 'PRIM-MINISTRU'])}>seed ordered</button>
        </div>
    )
}

const mockedLoad = vi.mocked(loadQuickTitlesFromCsv)
const mockedSave = vi.mocked(saveQuickTitlesToCsv)
const mockedSettings = vi.mocked(settingsService)
const mockedCsvFileSettings = vi.mocked(csvFileSettingsService)

async function renderLoaded(initialQuickTitles: string[] = [], created = false) {
    mockedLoad.mockResolvedValueOnce({
        ok: true,
        quickTitles: initialQuickTitles,
        created,
    })

    render(<HookHarness />)

    await waitFor(() => {
        expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith(initialQuickTitles)
    })
}

describe('useQuickTitles', () => {
    beforeEach(() => {
        mockedLoad.mockReset()
        mockedSave.mockReset()
        mockedSettings.getQuickTitles.mockReset()
        mockedSettings.setQuickTitles.mockReset()
        mockedSettings.subscribeQuickTitles.mockReset()
        mockedSettings.subscribeQuickTitles.mockReturnValue(vi.fn())
        mockedCsvFileSettings.getCsvFileSettings.mockReset()
        mockedCsvFileSettings.getCsvFileSettings.mockResolvedValue({
            workingCsvPath: 'D:/work/current.csv',
            backupFolderPath: 'D:/work/backups',
            savedProjectsFolderPath: 'D:/work/projects',
            exportCsvFolderPath: 'D:/work/export',
        })
        mockedCsvFileSettings.subscribeCsvFileSettings.mockReset()
        mockedCsvFileSettings.subscribeCsvFileSettings.mockReturnValue(vi.fn())
        mockedSave.mockResolvedValue({ ok: true })
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('loads the list from CSV on initialization', async () => {
        await renderLoaded(['PRESEDINTE: ', 'DIRECTOR: '])

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE: |DIRECTOR:')
        expect(mockedLoad).toHaveBeenCalledOnce()
    })

    it('gives valid CSV priority over legacy localStorage/settings', async () => {
        mockedSettings.getQuickTitles.mockResolvedValueOnce(['LEGACY: '])

        await renderLoaded(['CSV TITLE: '])

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('CSV TITLE:')
        expect(mockedSettings.getQuickTitles).not.toHaveBeenCalled()
        expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith(['CSV TITLE: '])
    })

    it('uses an empty list for a legacy header-only CSV', async () => {
        await renderLoaded([])

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('')
        expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith([])
    })

    it('uses an empty list when the missing file was created', async () => {
        await renderLoaded([], true)

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('')
        expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith([])
    })

    it('add saves the normalized list to CSV and legacy settings', async () => {
        const user = userEvent.setup()
        await renderLoaded([])
        mockedSettings.setQuickTitles.mockClear()

        await user.click(screen.getByRole('button', { name: 'add presedinte' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith(['PRESEDINTE: '])
            expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith(['PRESEDINTE: '])
        })
    })

    it('edit saves the normalized list to CSV and legacy settings', async () => {
        const user = userEvent.setup()
        await renderLoaded(['PRESEDINTE: ', 'DIRECTOR: ', 'PRIM-MINISTRU: '])
        mockedSettings.setQuickTitles.mockClear()

        await user.click(screen.getByRole('button', { name: 'edit director' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE: |SECRETAR: |PRIM-MINISTRU:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith([
                'PRESEDINTE: ',
                'SECRETAR: ',
                'PRIM-MINISTRU: ',
            ])
            expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith([
                'PRESEDINTE: ',
                'SECRETAR: ',
                'PRIM-MINISTRU: ',
            ])
        })
    })

    it('delete saves the normalized list to CSV and legacy settings', async () => {
        const user = userEvent.setup()
        await renderLoaded(['PRESEDINTE: ', 'DIRECTOR: '])
        mockedSettings.setQuickTitles.mockClear()

        await user.click(screen.getByRole('button', { name: 'delete director' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith(['PRESEDINTE: '])
            expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith(['PRESEDINTE: '])
        })
    })

    it('does not create a second item when adding a duplicate', async () => {
        const user = userEvent.setup()
        await renderLoaded(['PRESEDINTE: '])
        mockedSettings.setQuickTitles.mockClear()

        await user.click(screen.getByRole('button', { name: 'add duplicate' }))

        expect(screen.getByTestId('quick-titles').textContent).toBe('PRESEDINTE: ')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith(['PRESEDINTE: '])
            expect(mockedSettings.setQuickTitles).toHaveBeenCalledWith(['PRESEDINTE: '])
        })
    })

    it('removes the duplicate when editing into an existing quickTitle', async () => {
        const user = userEvent.setup()
        await renderLoaded(['PRESEDINTE: ', 'DIRECTOR: ', 'PRIM-MINISTRU: '])

        await user.click(screen.getByRole('button', { name: 'edit to duplicate' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('PRESEDINTE: |PRIM-MINISTRU:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith([
                'PRESEDINTE: ',
                'PRIM-MINISTRU: ',
            ])
        })
    })

    it('keeps state and logs a controlled error when CSV save fails', async () => {
        const user = userEvent.setup()
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        await renderLoaded([])
        mockedSettings.setQuickTitles.mockClear()
        mockedSave.mockResolvedValueOnce({ ok: false, error: 'CSV_FAILED' })

        await user.click(screen.getByRole('button', { name: 'add breaking' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('BREAKING:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith(['BREAKING: '])
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to persist quickTitles (add):',
                expect.objectContaining({ message: 'CSV_FAILED' })
            )
        })
        expect(mockedSettings.setQuickTitles).not.toHaveBeenCalled()
    })

    it('normalizes inputs with colon and trailing space', async () => {
        const user = userEvent.setup()
        await renderLoaded([])

        await user.click(screen.getByRole('button', { name: 'add presedinte' }))

        expect(screen.getByTestId('quick-titles').textContent).toBe('PRESEDINTE: ')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith(['PRESEDINTE: '])
        })
    })

    it('preserves order', async () => {
        const user = userEvent.setup()
        await renderLoaded([])

        await user.click(screen.getByRole('button', { name: 'seed ordered' }))

        expect(screen.getByTestId('quick-titles')).toHaveTextContent('DIRECTOR: |PRESEDINTE: |PRIM-MINISTRU:')
        await waitFor(() => {
            expect(mockedSave).toHaveBeenCalledWith([
                'DIRECTOR: ',
                'PRESEDINTE: ',
                'PRIM-MINISTRU: ',
            ])
        })
    })
})
