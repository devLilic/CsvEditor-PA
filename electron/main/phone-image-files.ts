import * as path from 'path'
import type { PhoneImageWorkPathFile } from '../../src/shared/ipc-types'

export function isJpegFilename(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase()
    return ext === '.jpg' || ext === '.jpeg'
}

export function buildWorkPathImageList(
    files: string[],
    workPath: string
): PhoneImageWorkPathFile[] {
    const resolvedWorkPath = path.resolve(workPath)

    return files
        .filter(isJpegFilename)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((filename) => {
            const finalPath = path.resolve(resolvedWorkPath, filename)

            return {
                filename,
                imageCsvValue: finalPath,
                finalPath,
            }
        })
}
