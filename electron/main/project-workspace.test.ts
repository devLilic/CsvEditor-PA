import { describe, expect, it, vi } from 'vitest'
import { ensureProjectWorkspaceFolders, resolveProjectWorkspaceFolders } from './project-workspace'

describe('project workspace folders', () => {
    it('resolves the standard project subfolders', () => {
        expect(resolveProjectWorkspaceFolders('C:/work')).toEqual({
            savedProjectsFolderPath: 'C:\\work\\Saved',
            backupFolderPath: 'C:\\work\\Backup',
            exportCsvFolderPath: 'C:\\work\\Export',
            phoneFolderPath: 'C:\\work\\Telefon',
        })
    })

    it('creates each project subfolder recursively', async () => {
        const createFolder = vi.fn(async () => undefined)
        const folders = await ensureProjectWorkspaceFolders('C:/work', createFolder)

        expect(createFolder).toHaveBeenCalledTimes(4)
        expect(createFolder).toHaveBeenCalledWith(folders.savedProjectsFolderPath)
        expect(createFolder).toHaveBeenCalledWith(folders.backupFolderPath)
        expect(createFolder).toHaveBeenCalledWith(folders.exportCsvFolderPath)
        expect(createFolder).toHaveBeenCalledWith(folders.phoneFolderPath)
    })

    it('requires a project root before creating folders', async () => {
        await expect(ensureProjectWorkspaceFolders('  ', vi.fn())).rejects.toThrow('No project folder configured')
    })
})
