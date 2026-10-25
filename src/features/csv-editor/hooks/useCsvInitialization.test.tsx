import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CsvProvider, useCsvInitialization } from '@/features/csv-editor'
import { useCsvContext } from '../context/CsvContext'
import { csvService } from '../services/csvService'

const show = vi.hoisted(() => ({
    activeProject: {
        id: 'show-a',
        lowerThirdTypes: [],
        exportPrefix: '',
        defaultProjectSettings: {
            title: 'SHOW DEFAULT TITLE',
            personName: 'SHOW DEFAULT NAME',
            personOccupation: 'SHOW DEFAULT ROLE',
            location: 'SHOW DEFAULT LOCATION',
        },
    },
}))

vi.mock('@/features/template-editor/state/TemplateDocumentProvider', () => ({
    useTemplateDocument: () => ({
        activeProjectId: 'show-a',
        activeProject: show.activeProject,
        workspaces: { 'show-a': 'C:/work/show-a' },
        isLoaded: true,
    }),
}))

function InitializationHarness() {
    useCsvInitialization()
    const { state, workingCopyError } = useCsvContext()
    const invited = state.entities.sections.find((section) => section.kind === 'invited')
    const firstRow = invited?.rows[0]
    return (
        <div>
            <div data-testid="loaded">{String(state.isLoaded)}</div>
            <div data-testid="title">{firstRow?.title?.title ?? ''}</div>
            <div data-testid="person-name">{firstRow?.person?.name ?? ''}</div>
            <div data-testid="location">{firstRow?.location?.location ?? ''}</div>
            <div data-testid="working-copy-error">{workingCopyError ?? ''}</div>
        </div>
    )
}

function renderHarness() {
    return render(<StrictMode><CsvProvider><InitializationHarness /></CsvProvider></StrictMode>)
}

describe('useCsvInitialization', () => {
    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('loads a legacy CSV from the active show workspace', async () => {
        const getWorkingSpy = vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: true,
            path: 'C:/work/show-a/emisie.csv',
            filename: 'emisie.csv',
            content: [
                'Nr;Titlu;Nume;Functie;Image;Locatie',
                ';LOADED TITLE;LOADED NAME;LOADED ROLE;;LOADED LOCATION',
            ].join('\n'),
        })
        renderHarness()
        await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
        expect(screen.getByTestId('title')).toHaveTextContent('LOADED TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('LOADED NAME')
        expect(screen.getByTestId('location')).toHaveTextContent('LOADED LOCATION')
        expect(getWorkingSpy).toHaveBeenCalledWith('show-a')
    })

    it('keeps JSON entity metadata authoritative on reopen', async () => {
        const entities = {
            sections: [{
                id: 'invited',
                kind: 'invited' as const,
                rows: [{ id: 'row-1', title: { id: 'stored-id', title: 'METADATA TITLE', lowerThirdTypeId: 'disabled-variant' } }],
            }],
        }
        vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: true,
            path: 'C:/work/show-a/Saved/current-project.json',
            filename: 'current-project.json',
            content: ';ORDINARY TITLE;;;;;\n',
            entities,
            previousExports: { titles: ';ORDINARY TITLE;;;;;\n' },
        })
        renderHarness()
        await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
        expect(screen.getByTestId('title')).toHaveTextContent('METADATA TITLE')
    })

    it('uses the active show defaults only when its saved state is missing', async () => {
        vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({ ok: false, error: 'NO_SAVED_PROJECT_STATE' })
        renderHarness()
        await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'))
        expect(screen.getByTestId('title')).toHaveTextContent('SHOW DEFAULT TITLE')
        expect(screen.getByTestId('person-name')).toHaveTextContent('SHOW DEFAULT NAME')
    })

    it('does not replace an unreadable saved state with defaults and exposes a retryable error', async () => {
        vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({ ok: false, error: 'INVALID_SHOW_EDITION' })
        renderHarness()
        await waitFor(() => expect(screen.getByTestId('working-copy-error')).toHaveTextContent('INVALID_SHOW_EDITION'))
        expect(screen.getByTestId('loaded')).toHaveTextContent('false')
        expect(screen.getByTestId('title')).toBeEmptyDOMElement()
    })
})
