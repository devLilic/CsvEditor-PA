import * as fs from 'node:fs'
import * as path from 'node:path'

export interface ProjectWorkspaceFolders {
    savedProjectsFolderPath: string
    backupFolderPath: string
    exportCsvFolderPath: string
    phoneFolderPath: string
}

export function resolveProjectWorkspaceFolders(root: string): ProjectWorkspaceFolders {
    const projectFolderPath = root.trim()
    return {
        savedProjectsFolderPath: path.join(projectFolderPath, 'Saved'),
        backupFolderPath: path.join(projectFolderPath, 'Backup'),
        exportCsvFolderPath: path.join(projectFolderPath, 'Export'),
        phoneFolderPath: path.join(projectFolderPath, 'Telefon'),
    }
}

export async function ensureProjectWorkspaceFolders(
    root: string,
    createFolder: (folderPath: string) => Promise<unknown> = (folderPath) => fs.promises.mkdir(folderPath, { recursive: true })
): Promise<ProjectWorkspaceFolders> {
    const projectFolderPath = root.trim()
    if (!projectFolderPath) throw new Error('No project folder configured')
    const folders = resolveProjectWorkspaceFolders(projectFolderPath)
    await Promise.all(Object.values(folders).map((folderPath) => createFolder(folderPath)))
    return folders
}
