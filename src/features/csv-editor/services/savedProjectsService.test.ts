import { describe, expect, it } from 'vitest'
import { savedProjectsService } from './savedProjectsService'

describe('savedProjectsService', () => {
    it('lists saved projects', async () => {
        const api = (window as any).electronAPI
        api.listSavedCsvProjects.mockResolvedValueOnce({
            ok: true,
            files: [
                {
                    filename: 'project.csv',
                    fullPath: 'C:/saved/project.csv',
                    mtimeMs: 123,
                },
            ],
        })

        const result = await savedProjectsService.listSavedProjects()

        expect(result).toEqual({
            ok: true,
            files: [
                {
                    filename: 'project.csv',
                    fullPath: 'C:/saved/project.csv',
                    mtimeMs: 123,
                },
            ],
        })
        expect(api.listSavedCsvProjects).toHaveBeenCalledOnce()
    })

    it('returns a controlled error when list IPC fails', async () => {
        const api = (window as any).electronAPI
        api.listSavedCsvProjects.mockRejectedValueOnce(new Error('ipc failed'))

        await expect(savedProjectsService.listSavedProjects()).resolves.toEqual({
            ok: false,
            files: [],
            error: 'IPC_FAILED',
        })
    })

    it('saves a project with filename and content', async () => {
        const api = (window as any).electronAPI
        const input = {
            filename: 'project.csv',
            content: 'a,b',
        }
        api.saveCsvProjectAs.mockResolvedValueOnce({
            ok: true,
            filename: 'project.csv',
            fullPath: 'C:/saved/project.csv',
        })

        const result = await savedProjectsService.saveCurrentAsProject(input)

        expect(api.saveCsvProjectAs).toHaveBeenCalledWith(input)
        expect(result).toEqual({
            ok: true,
            filename: 'project.csv',
            fullPath: 'C:/saved/project.csv',
        })
        expect(input).toEqual({
            filename: 'project.csv',
            content: 'a,b',
        })
        expect(api.readQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.writeQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.clearQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.getQuickTitles).not.toHaveBeenCalled()
        expect(api.setQuickTitles).not.toHaveBeenCalled()
    })

    it('load returns content', async () => {
        const api = (window as any).electronAPI
        const input = {
            filename: 'project.csv',
        }
        api.loadCsvProjectIntoWorking.mockResolvedValueOnce({
            ok: true,
            content: 'exact,csv,content',
        })

        const result = await savedProjectsService.loadProjectIntoWorkingCsv(input)

        expect(api.loadCsvProjectIntoWorking).toHaveBeenCalledWith(input)
        expect(result).toEqual({
            ok: true,
            content: 'exact,csv,content',
        })
        expect(input).toEqual({
            filename: 'project.csv',
        })
        expect(api.readQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.writeQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.clearQuickTitlesCsv).not.toHaveBeenCalled()
        expect(api.getQuickTitles).not.toHaveBeenCalled()
        expect(api.setQuickTitles).not.toHaveBeenCalled()
    })

    it('delete returns success', async () => {
        const api = (window as any).electronAPI
        const input = {
            filename: 'project.csv',
        }
        api.deleteCsvProject.mockResolvedValueOnce({
            ok: true,
        })

        const result = await savedProjectsService.deleteSavedProject(input)

        expect(api.deleteCsvProject).toHaveBeenCalledWith(input)
        expect(result).toEqual({
            ok: true,
        })
        expect(input).toEqual({
            filename: 'project.csv',
        })
    })

    it('does not mutate inputs when IPC fails', async () => {
        const api = (window as any).electronAPI
        const saveInput = {
            filename: 'project.csv',
            content: 'a,b',
        }
        const loadInput = {
            filename: 'project.csv',
        }
        const deleteInput = {
            filename: 'project.csv',
        }
        api.saveCsvProjectAs.mockRejectedValueOnce(new Error('ipc failed'))
        api.loadCsvProjectIntoWorking.mockRejectedValueOnce(new Error('ipc failed'))
        api.deleteCsvProject.mockRejectedValueOnce(new Error('ipc failed'))

        await expect(savedProjectsService.saveCurrentAsProject(saveInput)).resolves.toEqual({
            ok: false,
            error: 'IPC_FAILED',
        })
        await expect(savedProjectsService.loadProjectIntoWorkingCsv(loadInput)).resolves.toEqual({
            ok: false,
            error: 'IPC_FAILED',
        })
        await expect(savedProjectsService.deleteSavedProject(deleteInput)).resolves.toEqual({
            ok: false,
            error: 'IPC_FAILED',
        })

        expect(saveInput).toEqual({
            filename: 'project.csv',
            content: 'a,b',
        })
        expect(loadInput).toEqual({
            filename: 'project.csv',
        })
        expect(deleteInput).toEqual({
            filename: 'project.csv',
        })
    })
})
