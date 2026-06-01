import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { csvFileSettingsService } from '../services/csvFileSettingsService'
import { useWorkingCsvInfo } from './useWorkingCsvInfo'

vi.mock('../services/csvFileSettingsService', () => ({
    csvFileSettingsService: {
        getCsvFileSettings: vi.fn(),
    },
}))

function Harness() {
    const info = useWorkingCsvInfo()

    return (
        <div>
            <div data-testid="filename">{info.filename}</div>
            <div data-testid="path">{info.path}</div>
            <div data-testid="is-configured">{String(info.isConfigured)}</div>
        </div>
    )
}

describe('useWorkingCsvInfo', () => {
    beforeEach(() => {
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValue({
            workingCsvPath: '',
            backupFolderPath: '',
        })
    })

    afterEach(() => {
        cleanup()
        vi.clearAllMocks()
    })

    it('returns nesetat when working CSV path is missing', async () => {
        render(<Harness />)

        await waitFor(() => {
            expect(screen.getByTestId('filename')).toHaveTextContent('nesetat')
        })
        expect(screen.getByTestId('path')).toHaveTextContent('')
        expect(screen.getByTestId('is-configured')).toHaveTextContent('false')
    })

    it('extracts filename from Windows paths', async () => {
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValueOnce({
            workingCsvPath: 'C:\\work\\emisie.csv',
            backupFolderPath: '',
        })

        render(<Harness />)

        await waitFor(() => {
            expect(screen.getByTestId('filename')).toHaveTextContent('emisie.csv')
        })
        expect(screen.getByTestId('path')).toHaveTextContent('C:\\work\\emisie.csv')
        expect(screen.getByTestId('is-configured')).toHaveTextContent('true')
    })

    it('extracts filename from POSIX paths', async () => {
        vi.mocked(csvFileSettingsService.getCsvFileSettings).mockResolvedValueOnce({
            workingCsvPath: '/work/emisie.csv',
            backupFolderPath: '',
        })

        render(<Harness />)

        await waitFor(() => {
            expect(screen.getByTestId('filename')).toHaveTextContent('emisie.csv')
        })
        expect(screen.getByTestId('path')).toHaveTextContent('/work/emisie.csv')
        expect(screen.getByTestId('is-configured')).toHaveTextContent('true')
    })
})
