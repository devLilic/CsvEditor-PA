import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ipcMock } from '@/test/mocks/ipcMock'
import { showProjectStorageService } from '@/features/show-projects/services/showProjectStorageService'
import { createStandardShowProject } from '@/features/show-projects/domain/showProject'
import { createTemplateDocumentFromTemplates } from '@/features/template-editor/domain/templateDocument'
import { broadcastTemplates } from '@/templates/broadcast'
import { csvService } from '@/features/csv-editor/services/csvService'

describe('App production editor route', () => {
    beforeEach(() => {
        ;(window as any).electronAPI = ipcMock
        ;(globalThis as any).electronAPI = ipcMock
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    it('renders the editor header without a TED provider and gates an unconfigured show', async () => {
        render(<StrictMode><App /></StrictMode>)
        await waitFor(() => expect(screen.getByRole('button', { name: /Edit Mode OFF/ })).toBeInTheDocument())
        expect(screen.getByText('Folderul emisiunii nu este configurat')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Configurează emisiuni' })).toBeInTheDocument()
    })

    it('initializes a bound show in StrictMode instead of leaving the editor on its loading screen', async () => {
        const document = createTemplateDocumentFromTemplates(broadcastTemplates)
        document.show = 'show-a'
        const project = createStandardShowProject('show-a', 'Tales', document)
        vi.spyOn(showProjectStorageService, 'get').mockResolvedValue({
            ok: true,
            state: { version: 2, activeProjectId: 'show-a', projects: [project], workspaces: { 'show-a': 'C:/workspace/show-a' } },
        })
        vi.spyOn(csvService, 'getWorkingCsv').mockResolvedValue({
            ok: true,
            path: 'C:/workspace/show-a/Saved/current-project.json',
            filename: 'current-project.json',
            content: '',
            entities: { sections: [{ id: 'invited', kind: 'invited' as const, rows: [] }] },
        })

        render(<StrictMode><App /></StrictMode>)

        await waitFor(() => expect(screen.queryByText('Se încarcă ediția…')).not.toBeInTheDocument())
        expect(screen.getByRole('button', { name: /Edit Mode OFF/ })).toBeInTheDocument()
        expect(screen.queryByText('Folderul emisiunii nu este configurat')).not.toBeInTheDocument()
    })
})
