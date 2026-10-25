import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider } from '../context/CsvContext'
import { useCsvContext } from '../context/CsvContext'
import { useCsvAutosave } from './useCsvAutosave'
import { csvService } from '../services/csvService'
import { phoneImageSettingsService } from '../services/phoneImageSettingsService'
import { lowerThirdTypesService } from '@/features/lower-thirds/services/lowerThirdTypesService'
import { mapEntitiesStateToExportCsvs } from '@/features/entity-export/domain/entityExportMapper'
import { DEFAULT_LOWER_THIRD_TYPES } from '@/features/lower-thirds/domain/lowerThirdTypes'
import type { EntitiesState } from '../domain/entities'

const { registerFlusher } = vi.hoisted(() => ({ registerFlusher: vi.fn(() => () => undefined) }))
vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        activeProjectId: 'show-a',
        activeProject: { id: 'show-a' },
        registerWorkingCopyFlusher: registerFlusher,
    }),
}))

const initialEntities: EntitiesState = {
    sections: [{
        id: 'invited',
        kind: 'invited',
        rows: [{ id: 'row-1', title: { id: 'title-1', title: 'Breaking headline' } }],
    }],
}

function AutosaveHarness() {
    const { flush } = useCsvAutosave({ debounceMs: 60_000 })
    const { state, dispatch } = useCsvContext()
    return <>
        <div data-testid="loaded">{String(state.isLoaded)}</div>
        <button onClick={() => dispatch({
            type: 'ENTITY_UPDATE',
            payload: {
                sectionId: 'invited',
                entityType: 'titles',
                id: 'title-1',
                data: { lowerThirdTypeId: 'urgent' },
            },
        })}>Set urgent</button>
        <button onClick={() => void flush('show-a')}>Flush</button>
    </>
}

describe('useCsvAutosave lower-third assignments', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('writes PA exports when only a title lower-third type changes', async () => {
        vi.spyOn(phoneImageSettingsService, 'getPhoneImageSettings').mockResolvedValue({ workPath: '', width: 420, height: 540 })
        vi.spyOn(lowerThirdTypesService, 'get').mockResolvedValue(DEFAULT_LOWER_THIRD_TYPES)
        const writeSpy = vi.spyOn(csvService, 'write').mockResolvedValue({ ok: true })

        function LoadedHarness() {
            const { dispatch } = useCsvContext()
            useEffect(() => {
                dispatch({ type: 'CSV_LOADED', payload: initialEntities })
            }, [dispatch])
            return <AutosaveHarness />
        }

        render(<CsvProvider><LoadedHarness /></CsvProvider>)
        await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
        await act(async () => { fireEvent.click(screen.getByText('Set urgent')) })
        await act(async () => { fireEvent.click(screen.getByText('Flush')) })

        await waitFor(() => expect(writeSpy).toHaveBeenCalledOnce())
        expect(registerFlusher).toHaveBeenCalled()
        const [csv, entities, types, projectId] = writeSpy.mock.calls[0]
        expect(projectId).toBe('show-a')
        expect(csv).toContain('Breaking headline')
        expect(mapEntitiesStateToExportCsvs(entities!, types!).titlesCsv).toContain('05_Titlu_Ultima_Ora')
    })
})
